from typing import Dict, List, Optional
from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = 'bearer'


class AgentStatus(BaseModel):
    id: str
    vulnerabilities: Dict[str, bool]


class AgentListResponse(BaseModel):
    agents: List[AgentStatus]