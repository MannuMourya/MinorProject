# apps/api/app/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio, random, time

from .config import get_settings
from .database import init_db
from .routers import users, agents  # keep existing routers


settings = get_settings()
app = FastAPI(title="WinCVEx API")

# -----------------------------------------------------------------------------
# CORS (frontend talks to backend through nginx, but this still doesn't hurt)
# -----------------------------------------------------------------------------
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# -----------------------------------------------------------------------------
# Include routers you already had (auth, etc.)
# -----------------------------------------------------------------------------
app.include_router(users.router)
app.include_router(agents.router)


# -----------------------------------------------------------------------------
# Simple in-memory vuln state per machine
# In the future you could persist this in Postgres.
# -----------------------------------------------------------------------------
MACHINE_VULNS: dict[str, list[dict]] = {
    "wincvex-dc": [
        {
            "key": "weak_smb_signing",
            "title": "Weak SMB Signing",
            "description": "SMB signing is not required. Attackers can relay credentials to escalate privileges.",
            "enabled": True,
            "fix": "Enforce SMB signing in domain policy.",
        },
        {
            "key": "anonymous_ldap_binds",
            "title": "Anonymous LDAP Binds",
            "description": "Directory service allows anonymous bind, which leaks user/computer info.",
            "enabled": False,
            "fix": "Disable anonymous bind and require authentication.",
        },
        {
            "key": "outdated_packages",
            "title": "Outdated Packages",
            "description": "Critical security patches missing on core services.",
            "enabled": True,
            "fix": "Run patch baseline / WSUS sync.",
        },
        {
            "key": "open_firewall_port",
            "title": "Open High-Risk Port",
            "description": "Unnecessary management port is exposed to the network.",
            "enabled": False,
            "fix": "Restrict this port in Windows Defender Firewall.",
        },
    ],
    "wincvex-host-b": [
        {
            "key": "weak_rdp_policy",
            "title": "Weak RDP Policy",
            "description": "Allows NLA bypass from legacy clients.",
            "enabled": True,
            "fix": "Force NLA and disable legacy RDP crypto.",
        }
    ],
    "wincvex-host-c": [
        {
            "key": "world_writable_share",
            "title": "World-writable Share",
            "description": "Everyone has write access to \\HOST-C\\DATA share.",
            "enabled": True,
            "fix": "Restrict share ACLs to admins / specific groups.",
        }
    ],
}

# We'll fake machine metrics. We'll jitter numbers so the UI looks alive.
def _fake_metrics(machine_id: str) -> dict:
    random.seed(f"{machine_id}-{int(time.time() // 5)}")
    cpu_pct = random.randint(10, 60)  # %
    mem_used = round(random.uniform(1.2, 3.5), 1)  # GB
    mem_total = 8  # pretend every box has 8GB
    net_kbps = random.randint(100, 1200)  # KB/s
    return {
        "cpuPct": cpu_pct,
        "memUsedGb": mem_used,
        "memTotalGb": mem_total,
        "netKbps": net_kbps,
    }


# -----------------------------------------------------------------------------
# Startup
# -----------------------------------------------------------------------------
@app.on_event("startup")
def on_startup() -> None:
    """Initialize the database tables on startup."""
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# -----------------------------------------------------------------------------
# REST API for vulnerabilities panel
# -----------------------------------------------------------------------------

@app.get("/api/machines/{machine_id}/vulns")
def list_vulns(machine_id: str) -> list[dict]:
    """
    Return all vulnerabilities for a machine.
    Frontend calls this whenever you click different machine.
    """
    return MACHINE_VULNS.get(machine_id, [])


@app.post("/api/machines/{machine_id}/vulns/{vuln_key}/enable")
def enable_vuln(machine_id: str, vuln_key: str) -> dict:
    vulns = MACHINE_VULNS.get(machine_id)
    if not vulns:
        raise HTTPException(status_code=404, detail="machine not found")

    for v in vulns:
        if v["key"] == vuln_key:
            v["enabled"] = True
            return {"ok": True, "vuln": v}

    raise HTTPException(status_code=404, detail="vuln not found")


@app.post("/api/machines/{machine_id}/vulns/{vuln_key}/disable")
def disable_vuln(machine_id: str, vuln_key: str) -> dict:
    vulns = MACHINE_VULNS.get(machine_id)
    if not vulns:
        raise HTTPException(status_code=404, detail="machine not found")

    for v in vulns:
        if v["key"] == vuln_key:
            v["enabled"] = False
            return {"ok": True, "vuln": v}

    raise HTTPException(status_code=404, detail="vuln not found")


# -----------------------------------------------------------------------------
# REST API for "Logs & Metrics" panel
# (right now just metrics; logs table could be added later)
# -----------------------------------------------------------------------------
@app.get("/api/machines/{machine_id}/metrics")
def get_metrics(machine_id: str) -> dict:
    """
    Returns fake but changing metrics so UI looks alive.
    """
    return _fake_metrics(machine_id)


# -----------------------------------------------------------------------------
# WebSocket endpoint for interactive terminal panel
# Frontend connects to ws(s)://<host>/api/ws?host=wincvex-dc
# -----------------------------------------------------------------------------
@app.websocket("/api/ws")
async def websocket_terminal(websocket: WebSocket, host: str = Query(default="")) -> None:
    """
    Interactive terminal WebSocket.
    Client sends:
      {"type":"command","command":"whoami","host":"wincvex-dc"}
    We simulate output.
    """
    await websocket.accept()
    await websocket.send_json({"type": "status", "text": f"Connected to {host or 'agent'}"})

    try:
        while True:
            msg = await websocket.receive_json()
            if not isinstance(msg, dict) or msg.get("type") != "command":
                await websocket.send_json({"type": "error", "text": "Invalid message"})
                continue

            cmd = (msg.get("command") or "").strip()
            if not cmd:
                await websocket.send_json({"type": "error", "text": "Empty command"})
                continue

            # Echo what user typed
            await websocket.send_json({"type": "line", "text": f"$ {cmd}"})
            await asyncio.sleep(0.15)

            # Simulated "responses"
            if cmd in ("whoami", "id"):
                await websocket.send_json(
                    {"type": "line", "text": f"{(host or 'agent')}\\\\user"}
                )
            elif cmd == "hostname":
                await websocket.send_json({"type": "line", "text": host or "wincvex-lab"})
            elif cmd == "uptime":
                await websocket.send_json({"type": "line", "text": "up 3 days, 04:12"})
            elif cmd in ("ls", "dir"):
                await websocket.send_json({"type": "line", "text": "documents logs tools"})
            else:
                await websocket.send_json(
                    {"type": "line", "text": f"Executed: {cmd} (simulated output)"}
                )

    except WebSocketDisconnect:
        # browser closed
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


# -----------------------------------------------------------------------------
# (Optional legacy stream) - safe to leave, or remove if you don't need it
# -----------------------------------------------------------------------------
@app.websocket("/api/ws/logs/{agent_id}")
async def websocket_logs(websocket: WebSocket, agent_id: str) -> None:
    """
    Simulated log stream.
    """
    await websocket.accept()
    counter = 0
    try:
        while True:
            await websocket.send_text(f"[{agent_id}] simulated log line {counter}")
            counter += 1
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        return
