"""Application configuration.

All settings come from environment variables (or a local `.env` file in development).
Nothing secret is ever hardcoded. `get_settings()` is cached so the `.env` file is read once.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # ignore env vars we haven't declared yet (added in later phases)
    )

    # --- App ---
    app_env: Literal["development", "test", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    project_name: str = "Alzheimer's Companion API"

    # --- Database ---
    # SQLAlchemy URL, e.g. postgresql+psycopg://user:pass@host:5432/dbname
    database_url: str = Field(...)

    # --- Auth (used from Phase 2 onwards; declared now so config is stable) ---
    jwt_secret_key: str = "dev-only-not-a-real-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 14
    device_token_expire_days: int = 180  # patient devices stay signed in for ~6 months
    pairing_code_ttl_minutes: int = 15

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance.

    Cached so importing config in many modules doesn't re-parse the environment,
    and so tests can override it with `get_settings.cache_clear()`.
    """
    return Settings()  # type: ignore[call-arg]  # values supplied by env / .env
