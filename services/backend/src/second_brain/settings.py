from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def root_env_file() -> Path | None:
    """Return the root .env path when it already exists. Never create one."""
    explicit = os.environ.get("SECOND_BRAIN_ENV_FILE")
    if explicit:
        candidate = Path(explicit)
        return candidate if candidate.is_file() else None
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "compose.yaml").is_file():
            candidate = parent / ".env"
            return candidate if candidate.is_file() else None
    return None


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "local"
    log_level: str = "info"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    worker_health_port: int = 8001
    app_version: str = "0.0.0"
    frontend_origin: str = "http://127.0.0.1:3000"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    env_file = root_env_file()
    if env_file is None:
        return Settings()
    return Settings(_env_file=env_file)
