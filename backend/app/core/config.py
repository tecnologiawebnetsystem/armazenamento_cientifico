import os
from functools import lru_cache

from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = 'Armazenamento Científico API'
    app_version: str = '3.0.0'
    database_url: str = os.getenv('DATABASE_URL', '')
    cors_origins: list[str] = [x.strip() for x in os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',') if x.strip()]
    cookie_name: str = os.getenv('COOKIE_NAME', 'wayon_session_id')
    cookie_secure: bool = os.getenv('COOKIE_SECURE', 'false').lower() == 'true'
    session_hours: int = int(os.getenv('SESSION_HOURS', '8'))
    environment: str = os.getenv('ENVIRONMENT', 'development')

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
