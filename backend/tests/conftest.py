"""Shared pytest fixtures.

We set a test-safe environment BEFORE importing the app, so `get_settings()` picks
up these values instead of the developer's real `.env`.
"""

import os

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://alz:alz_password@localhost:5432/alzheimers",
)
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-not-used-in-prod")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.core.database import engine  # noqa: E402
from app.main import create_app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    get_settings.cache_clear()
    return TestClient(create_app())


@pytest.fixture
def clean_db() -> None:
    """Empty the auth tables so each test starts from a known state."""
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE users, refresh_tokens RESTART IDENTITY CASCADE"))
