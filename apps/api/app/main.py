from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from .config import get_settings
from .database import init_db
from .routers import users, agents
from .utils import decode_access_token


settings = get_settings()
app = FastAPI(title="WinCVEx API")

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


@app.websocket("/api/ws/logs/{agent_id}")
async def websocket_logs(websocket: WebSocket, agent_id: str) -> None:
    """
    Minimal WebSocket endpoint that emits simulated log lines for a given agent.
    The client must include a `token` query parameter containing a valid JWT.
    If authentication fails the connection is closed with code 1008 (policy violation).
    """
    token = websocket.query_params.get("token")
    if not token or not decode_access_token(token):
        await websocket.close(code=1008)
        return
    await websocket.accept()
    counter = 0
    try:
        while True:
            # Send a simulated log line every two seconds
            await websocket.send_text(f"[{agent_id}] simulated log line {counter}")
            counter += 1
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        return