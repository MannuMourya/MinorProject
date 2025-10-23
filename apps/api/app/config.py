import os
from functools import lru_cache
from typing import List


class Settings:
    """Application configuration loaded from environment variables."""

    def __init__(self) -> None:
        self.database_url: str = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/wincvex')
        self.redis_url: str = os.getenv('REDIS_URL', 'redis://redis:6379/0')
        self.secret_key: str = os.getenv('SECRET_KEY', 'changeme')
        self.jwt_secret: str = os.getenv('JWT_SECRET', 'changeme')
        self.cors_origins: List[str] = [origin.strip() for origin in os.getenv('CORS_ORIGINS', '').split(',') if origin.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()