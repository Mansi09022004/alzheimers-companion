"""Vision service configuration (environment-driven)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"

    # InsightFace model pack. buffalo_l -> detection + 512-d ArcFace recognition.
    insightface_model: str = "buffalo_l"
    insightface_root: str = "~/.insightface"  # Docker overrides this to /models
    face_embedding_dim: int = 512

    # Minimum detector confidence to accept a face.
    min_det_score: float = 0.5

    # Shared secret: only the Core API may call this service.
    vision_service_token: str = "dev-only-change-me"


@lru_cache
def get_settings() -> Settings:
    return Settings()
