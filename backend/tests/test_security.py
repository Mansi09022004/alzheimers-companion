"""Security hardening: rate limiting, headers, request size cap."""

import pytest

from app.core.rate_limit import limiter

pytestmark = pytest.mark.usefixtures("clean_db")


def test_security_headers_present(client):
    r = client.get("/api/v1/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"


def test_login_is_rate_limited(client, monkeypatch):
    monkeypatch.setattr(limiter, "enabled", True)
    limiter.reset()
    body = {"email": "x@ex.com", "password": "whatever"}
    codes = [client.post("/api/v1/auth/login", json=body).status_code for _ in range(12)]
    assert 429 in codes
    assert codes.count(401) <= 10  # the 10/minute allowance
    limiter.reset()


def test_oversized_request_body_rejected(client):
    r = client.post(
        "/api/v1/auth/login",
        content=b"x" * 5,
        headers={"content-length": str(20 * 1024 * 1024), "content-type": "application/json"},
    )
    assert r.status_code == 413
