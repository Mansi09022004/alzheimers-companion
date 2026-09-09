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
os.environ.setdefault("LLM_PROVIDER", "fake")  # no Gemini key needed in tests
# fake embeddings are token-hash based; a lower floor keeps the RAG tests deterministic
os.environ.setdefault("RAG_SIMILARITY_FLOOR", "0.15")

import pytest  # noqa: E402
from argon2 import PasswordHasher  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core import security  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.core.database import engine  # noqa: E402
from app.main import create_app  # noqa: E402

# Argon2 is deliberately slow. Use cheap parameters in tests so the suite stays fast.
security._ph = PasswordHasher(time_cost=1, memory_cost=8, parallelism=1)


@pytest.fixture(scope="session")
def client() -> TestClient:
    get_settings.cache_clear()
    return TestClient(create_app())


# child -> parent order so plain DELETEs don't trip foreign keys
_CLEAN_ORDER = [
    "emergency_contacts", "alerts", "geofence_events", "geofence_states", "geofences",
    "locations", "routine_completions", "routine_items", "medication_logs", "medications",
    "memory_sources", "memories", "face_embeddings", "consents", "person_relationships",
    "people", "patient_devices", "patient_caregivers", "caregiver_profiles",
    "patient_profiles", "refresh_tokens", "users",
]


@pytest.fixture
def clean_db() -> None:
    """Empty all application tables so each test starts from a known state.

    DELETE (row-level lock) instead of TRUNCATE (ACCESS EXCLUSIVE per table) — on
    the WSL2 Postgres, 20 TRUNCATEs dominated test setup (~0.7s/test).
    """
    with engine.begin() as conn:
        for table in _CLEAN_ORDER:
            conn.execute(text(f"DELETE FROM {table}"))


@pytest.fixture
def caregiver(client):
    """Register + log in a caregiver; return (auth_headers, user_dict)."""
    reg = {"email": "owner@ex.com", "password": "strong-pass1", "full_name": "Owner"}
    user = client.post("/api/v1/auth/register", json=reg).json()
    token = client.post(
        "/api/v1/auth/login", json={"email": reg["email"], "password": reg["password"]}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, user


@pytest.fixture
def other_caregiver(client):
    """A second, unrelated caregiver — used to prove data isolation."""
    reg = {"email": "stranger@ex.com", "password": "strong-pass1", "full_name": "Stranger"}
    client.post("/api/v1/auth/register", json=reg)
    token = client.post(
        "/api/v1/auth/login", json={"email": reg["email"], "password": reg["password"]}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
