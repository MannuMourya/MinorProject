from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import User
from ..schemas import Token, UserCreate
from ..utils import (
    hash_password,
    verify_password,
    create_access_token,
    rate_limit,
)

router = APIRouter(prefix="/api", tags=["users"])


@router.post("/signup", status_code=201)
def signup(user: UserCreate, session: Session = Depends(get_session)):
    # simple rate limit based on username
    if not rate_limit(f"signup:{user.username}"):
        raise HTTPException(status_code=429, detail="Too many requests")

    existing = session.exec(select(User).where(User.username == user.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed = hash_password(user.password)
    new_user = User(username=user.username, hashed_password=hashed)
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return {"message": "User created"}


@router.post("/login", response_model=Token)
def login(user: UserCreate, session: Session = Depends(get_session)):
    if not rate_limit(f"login:{user.username}"):
        raise HTTPException(status_code=429, detail="Too many requests")

    existing = session.exec(select(User).where(User.username == user.username)).first()
    if not existing or not verify_password(user.password, existing.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    access_token = create_access_token({"sub": existing.username})
    return Token(access_token=access_token)