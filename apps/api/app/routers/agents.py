from typing import Dict, List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path

from ..auth import get_current_user
from ..schemas import AgentListResponse, AgentStatus

router = APIRouter(prefix="/api/agents", tags=["agents"])

# Hard‑coded list of agent service names.  If you add or remove agents,
# update this list accordingly and restart the API.
AGENTS: List[str] = ["wincvex-dc", "wincvex-host-b", "wincvex-host-c"]


async def _get_agent_status(agent_id: str) -> Dict[str, Dict[str, bool]]:
    """
    Query the given agent for its vulnerability status.  If the agent is
    unavailable the function returns an empty vulnerability map.
    """
    url = f"http://{agent_id}:8500/status"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=5.0)
            resp.raise_for_status()
            return resp.json()  # expected to contain {"vulnerabilities": {...}}
    except Exception:
        return {"vulnerabilities": {}}


@router.get("", response_model=AgentListResponse)
async def list_agents(current_user=Depends(get_current_user)):
    """Return the status for all configured agents."""
    statuses: List[AgentStatus] = []
    for agent_id in AGENTS:
        data = await _get_agent_status(agent_id)
        statuses.append(
            AgentStatus(id=agent_id, vulnerabilities=data.get("vulnerabilities", {}))
        )
    return {"agents": statuses}


@router.get("/{agent_id}", response_model=AgentStatus)
async def get_agent(agent_id: str = Path(..., pattern="^[\w\-]+$"), current_user=Depends(get_current_user)):
    """Return the status for a single agent."""
    if agent_id not in AGENTS:
        raise HTTPException(status_code=404, detail="Unknown agent")
    data = await _get_agent_status(agent_id)
    return AgentStatus(id=agent_id, vulnerabilities=data.get("vulnerabilities", {}))


@router.post("/{agent_id}/vulnerabilities/{vuln}/{action}")
async def toggle_vulnerability(
    agent_id: str,
    vuln: str,
    action: str,
    current_user=Depends(get_current_user),
):
    """
    Enable or disable a vulnerability flag on a given agent.  The action
    must be either "enable" or "disable".
    """
    if agent_id not in AGENTS:
        raise HTTPException(status_code=404, detail="Unknown agent")
    if action not in {"enable", "disable"}:
        raise HTTPException(status_code=400, detail="Action must be enable or disable")
    url = f"http://{agent_id}:8500/vulns/{vuln}/{action}"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, timeout=5.0)
            if resp.status_code == 404:
                raise HTTPException(status_code=404, detail="Unknown vulnerability")
            resp.raise_for_status()
            return resp.json()  # returns new vulnerability map
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to contact agent")


@router.post("/{agent_id}/exec")
async def exec_command(agent_id: str, command: Dict[str, str], current_user=Depends(get_current_user)):
    """
    Execute an allow‑listed command on an agent.  The body must contain
    {"command": "ls"}.  The agent returns the command output.  If the
    command is not allowed the agent returns an error.
    """
    if agent_id not in AGENTS:
        raise HTTPException(status_code=404, detail="Unknown agent")
    url = f"http://{agent_id}:8500/exec"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=command, timeout=10.0)
            resp.raise_for_status()
            return resp.json()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to execute command")