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

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.main import create_app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    get_settings.cache_clear()
    return TestClient(create_app())
