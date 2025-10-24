# apps/api/app/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from .config import get_settings
from .database import init_db
from .routers import users, agents  # keep your existing routers

settings = get_settings()
app = FastAPI(title="WinCVEx API")

# CORS
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include routers
app.include_router(users.router)
app.include_router(agents.router)

@app.on_event("startup")
def on_startup() -> None:
    """Initialize the database tables on startup."""
    init_db()

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

# -------------------------------------------------------------------
# WebSocket endpoint the frontend expects:
#   ws(s)://<host>/api/ws?host=wincvex-dc
# -------------------------------------------------------------------
@app.websocket("/api/ws")
async def websocket_terminal(websocket: WebSocket, host: str = Query(default="")) -> None:
    """
    Interactive terminal WebSocket.
    The UI sends: {"type":"command","command":"whoami","host":"..."}
    We simulate execution and stream lines back.
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

            # Echo the command then simulate output
            await websocket.send_json({"type": "line", "text": f"$ {cmd}"})
            await asyncio.sleep(0.15)

            # Very small demo: branch by common commands
            if cmd in ("whoami", "id"):
                await websocket.send_json({"type": "line", "text": f"{(host or 'agent')}/user"})
            elif cmd == "uptime":
                await websocket.send_json({"type": "line", "text": "up 3 days, 04:12"})
            elif cmd in ("ls", "dir"):
                await websocket.send_json({"type": "line", "text": "documents logs tools"})
            else:
                await websocket.send_json({"type": "line", "text": f"Executed: {cmd}"})
    except WebSocketDisconnect:
        # client closed
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass

# -------------------------------------------------------------------
# (Optional) Keep your previous log-stream endpoint if you still use it.
# Frontend terminal doesn't use this, but nothing breaks if it stays.
# -------------------------------------------------------------------
@app.websocket("/api/ws/logs/{agent_id}")
async def websocket_logs(websocket: WebSocket, agent_id: str) -> None:
    await websocket.accept()
    counter = 0
    try:
        while True:
            await websocket.send_text(f"[{agent_id}] simulated log line {counter}")
            counter += 1
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        return
