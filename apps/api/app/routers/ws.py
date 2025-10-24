# apps/api/app/routers/ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Any, Dict
import asyncio

router = APIRouter(tags=["ws"])

@router.websocket("/api/ws")
async def ws_terminal(websocket: WebSocket, host: str = Query(default="")):
    await websocket.accept()
    await websocket.send_json({"type": "status", "text": f"Connected to {host or 'unknown host'}"})
    try:
        while True:
            msg = await websocket.receive_json()
            if not isinstance(msg, dict):
                continue
            if msg.get("type") == "command":
                cmd = (msg.get("command") or "").strip()
                if not cmd:
                    await websocket.send_json({"type": "error", "text": "Empty command"})
                    continue
                # Simulate command execution
                await websocket.send_json({"type": "line", "text": f"$ {cmd}"})
                await asyncio.sleep(0.2)
                # You can branch per-host here:
                if cmd in ("whoami", "id"):
                    await websocket.send_json({"type": "line", "text": f"{host or 'agent'}\\user"})
                elif cmd in ("uptime",):
                    await websocket.send_json({"type": "line", "text": "up 3 days, 04:12"})
                else:
                    await websocket.send_json({"type": "line", "text": f"Executed: {cmd}"})
            else:
                await websocket.send_json({"type": "error", "text": "Unknown message"})
    except WebSocketDisconnect:
        # Client closed
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
