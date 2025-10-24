# apps/api/app/routers/machines.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List

router = APIRouter(prefix="/api/machines", tags=["machines"])

# In-memory demo store (you can persist to Postgres later)
_VULNS: Dict[str, Dict[str, Dict]] = {
    "wincvex-dc": {
        "weak_smb": {
            "key": "weak_smb",
            "title": "Weak SMB Signing",
            "description": "SMB signing disabled allows MITM.",
            "enabled": False,
            "fix": "Enable SMB signing via GPO and restart service.",
        },
        "anonymous_binds": {
            "key": "anonymous_binds",
            "title": "Anonymous LDAP Binds",
            "description": "LDAP allows anonymous bind.",
            "enabled": False,
            "fix": "Disallow anonymous bind in directory service.",
        },
    },
    "wincvex-host-b": {
        "outdated_packages": {
            "key": "outdated_packages",
            "title": "Outdated Packages",
            "description": "Critical updates missing.",
            "enabled": False,
            "fix": "Apply latest security updates.",
        },
    },
    "wincvex-host-c": {
        "open_firewall": {
            "key": "open_firewall",
            "title": "Open Firewall Port",
            "description": "Unnecessary inbound port exposed.",
            "enabled": False,
            "fix": "Close the port or restrict source IPs.",
        },
    },
}

class Vuln(BaseModel):
    key: str
    title: str
    description: str
    enabled: bool
    fix: str

@router.get("/{machine_id}/vulns", response_model=List[Vuln])
def list_vulns(machine_id: str):
    if machine_id not in _VULNS:
        return []
    return list(_VULNS[machine_id].values())

@router.post("/{machine_id}/vulns/{key}/enable", response_model=Vuln)
def enable_vuln(machine_id: str, key: str):
    try:
        v = _VULNS[machine_id][key]
    except KeyError:
        raise HTTPException(status_code=404, detail="Vulnerability not found")
    v["enabled"] = True
    return v

@router.post("/{machine_id}/vulns/{key}/disable", response_model=Vuln)
def disable_vuln(machine_id: str, key: str):
    try:
        v = _VULNS[machine_id][key]
    except KeyError:
        raise HTTPException(status_code=404, detail="Vulnerability not found")
    v["enabled"] = False
    return v
