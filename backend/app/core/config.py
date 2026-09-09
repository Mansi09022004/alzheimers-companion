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
    # comma-separated allowed origins for production CORS (dashboard URL, etc.)
    cors_origins_raw: str = ""

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

    # --- Vision service (face detection + embeddings) ---
    vision_service_url: str = "http://localhost:8001"
    vision_service_token: str = "dev-vision-token"
    face_embedding_dim: int = 512
    # Cosine-similarity floor for calling a face a match. Higher = stricter =
    # fewer false matches. We prefer "not sure" over a confident wrong answer.
    face_match_threshold: float = 0.40

    # --- LLM / embeddings ---
    # "gemini" (real API, needs a key) or "fake" (deterministic, for dev/tests).
    llm_provider: Literal["gemini", "fake"] = "gemini"
    gemini_api_key: str = ""
    gemini_embed_model: str = "gemini-embedding-001"
    gemini_chat_model: str = "gemini-2.5-flash"
    embedding_dim: int = 768

    # --- Notifications & scheduler ---
    enable_scheduler: bool = False  # turned on in the container / prod
    notification_provider: Literal["expo", "log"] = "log"
    expo_access_token: str = ""  # optional; Expo push works without it for most cases
    default_timezone: str = "Asia/Kolkata"

    # --- Location & geofencing ---
    location_retention_days: int = 30
    # consecutive "outside" fixes before an exit alert fires (guards against GPS noise)
    geofence_exit_streak: int = 3
    # add the reported GPS accuracy (capped) to the radius before deciding "outside"
    geofence_accuracy_buffer_cap_m: float = 60.0

    # --- RAG ---
    rag_top_k: int = 5
    # Cosine-similarity floor: memories below this are treated as irrelevant and
    # dropped. If nothing clears it, the assistant says "I'm not sure" instead of guessing.
    rag_similarity_floor: float = 0.55

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance.

    Cached so importing config in many modules doesn't re-parse the environment,
    and so tests can override it with `get_settings.cache_clear()`.
    """
    return Settings()  # type: ignore[call-arg]  # values supplied by env / .env
