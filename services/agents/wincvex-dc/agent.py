import asyncio
import os
import subprocess
from typing import Dict

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

AGENT_ID = os.getenv('AGENT_ID', 'agent')
app = FastAPI(title=f"WinCVEx Agent {AGENT_ID}")

# Simulated vulnerability flags for this agent
vulnerabilities: Dict[str, bool] = {
    'weak_smb_signing': False,
    'anonymous_ldap_binds': False,
    'outdated_packages': False,
    'open_firewall_port': False,
}

# Map of allowed commands to the argv executed on the shell.  Only keys in
# this dictionary may be run via the /exec endpoint.
ALLOWED_COMMANDS: Dict[str, list[str]] = {
    'ls': ['ls', '-1'],
    'whoami': ['whoami'],
    'uptime': ['uptime'],
    'date': ['date'],
    'cat_os': ['cat', '/etc/os-release'],
}


@app.get('/health')
def health() -> Dict[str, str]:
    return {'status': 'ok'}


@app.get('/status')
def status() -> Dict[str, Dict[str, bool]]:
    return {'vulnerabilities': vulnerabilities}


@app.post('/vulns/{name}/enable')
def enable_vuln(name: str) -> Dict[str, Dict[str, bool]]:
    if name not in vulnerabilities:
        raise HTTPException(status_code=404, detail='Unknown vulnerability')
    vulnerabilities[name] = True
    return {'vulnerabilities': vulnerabilities}


@app.post('/vulns/{name}/disable')
def disable_vuln(name: str) -> Dict[str, Dict[str, bool]]:
    if name not in vulnerabilities:
        raise HTTPException(status_code=404, detail='Unknown vulnerability')
    vulnerabilities[name] = False
    return {'vulnerabilities': vulnerabilities}


class CommandRequest(BaseModel):
    command: str


@app.post('/exec')
def exec_command(req: CommandRequest) -> Dict[str, str]:
    cmd_key = req.command.strip()
    if cmd_key not in ALLOWED_COMMANDS:
        raise HTTPException(status_code=400, detail='Command not allowed')
    try:
        output = subprocess.check_output(ALLOWED_COMMANDS[cmd_key], stderr=subprocess.STDOUT)
        return {'output': output.decode()}
    except Exception as e:
        return {'output': f'Error: {e}'}


@app.websocket('/ws/logs')
async def logs(websocket: WebSocket) -> None:
    """
    Simple WebSocket that emits periodic log messages from this agent.  The API
    gateway proxies these messages to the frontend.  No authentication is
    performed here because the API will handle it.
    """
    await websocket.accept()
    counter = 0
    try:
        while True:
            await websocket.send_text(f'{AGENT_ID} log line {counter}')
            counter += 1
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        return