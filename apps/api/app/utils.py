import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import get_settings

# --------------------------------------------------------------------------------------
# Password hashing
# --------------------------------------------------------------------------------------
# Use pbkdf2_sha256 by default (no 72-byte limit); keep bcrypt for backward compatibility.
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"],  # order matters: first scheme is used to hash new passwords
    deprecated="auto",
)

def hash_password(password: str) -> str:
    """Hash a plaintext password with the default scheme (pbkdf2_sha256)."""
    return pwd_context.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a password against an existing hash.
    Works for pbkdf2_sha256 and legacy bcrypt hashes.
    """
    return pwd_context.verify(password, hashed_password)

def password_needs_rehash(hashed_password: str) -> bool:
    """
    Returns True if the stored hash should be upgraded to the current default scheme/params.
    Call this after a successful login and, if True, re-hash and store the new value.
    """
    return pwd_context.needs_update(hashed_password)

# --------------------------------------------------------------------------------------
# JWT helpers
# --------------------------------------------------------------------------------------
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=60))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError:
        return None

# --------------------------------------------------------------------------------------
# Very simple in-memory rate limiter (use Redis in production)
# --------------------------------------------------------------------------------------
_rate_store: Dict[str, float] = {}

def rate_limit(key: str, interval: float = 1.0) -> bool:
    """
    Returns True if the request is allowed, False if it should be rejected.
    Each key may only be used once per `interval` seconds.
    """
    now = time.time()
    last = _rate_store.get(key, 0.0)
    if now - last < interval:
        return False
    _rate_store[key] = now
    return True
