"""Authentication flow tests: register, login, refresh (rotation), logout, /me, roles."""

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.usefixtures("clean_db")

CAREGIVER = {"email": "asha@example.com", "password": "strong-passw0rd", "full_name": "Asha"}


def _register(client: TestClient, **overrides) -> dict:
    return client.post("/api/v1/auth/register", json={**CAREGIVER, **overrides}).json()


def _login(client: TestClient, email=CAREGIVER["email"], password=CAREGIVER["password"]):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


# --- register --------------------------------------------------------------

def test_register_creates_caregiver(client: TestClient) -> None:
    resp = client.post("/api/v1/auth/register", json=CAREGIVER)
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == CAREGIVER["email"]
    assert body["role"] == "caregiver"
    assert body["is_active"] is True
    assert "password" not in body and "password_hash" not in body


def test_register_duplicate_email_conflicts(client: TestClient) -> None:
    client.post("/api/v1/auth/register", json=CAREGIVER)
    resp = client.post("/api/v1/auth/register", json=CAREGIVER)
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "conflict"


def test_register_rejects_short_password(client: TestClient) -> None:
    resp = client.post("/api/v1/auth/register", json={**CAREGIVER, "password": "short"})
    assert resp.status_code == 422  # Pydantic validation


# --- login ----------------------------------------------------------------

def test_login_returns_token_pair(client: TestClient) -> None:
    _register(client)
    resp = _login(client)
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"] and body["refresh_token"]


def test_login_wrong_password_is_401(client: TestClient) -> None:
    _register(client)
    resp = _login(client, password="not-the-password")
    assert resp.status_code == 401


def test_login_unknown_email_gives_same_error(client: TestClient) -> None:
    resp = _login(client, email="nobody@example.com")
    assert resp.status_code == 401
    assert resp.json()["error"]["message"] == "Incorrect email or password."


# --- /me + auth guard ----------------------------------------------------

def test_me_requires_token(client: TestClient) -> None:
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_returns_current_user(client: TestClient) -> None:
    _register(client)
    access = _login(client).json()["access_token"]
    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == CAREGIVER["email"]


def test_me_rejects_garbage_token(client: TestClient) -> None:
    resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert resp.status_code == 401


# --- refresh rotation + logout ----------------------------------------

def test_refresh_rotates_and_invalidates_old_token(client: TestClient) -> None:
    _register(client)
    first = _login(client).json()
    old_refresh = first["refresh_token"]

    rotated = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] != old_refresh

    # the old refresh token must no longer work
    reused = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert reused.status_code == 401


# --- Google sign-in --------------------------------------------------------

def _fake_google_payload(email="asha@example.com", name="Asha", verified=True):
    return {"email": email, "email_verified": verified, "name": name}


def test_google_login_creates_caregiver_on_first_sign_in(client: TestClient, monkeypatch) -> None:
    from app.services import auth_service

    monkeypatch.setattr(auth_service, "_verify_google_token", lambda _t: _fake_google_payload())
    resp = client.post("/api/v1/auth/google", json={"id_token": "fake"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"] and body["refresh_token"]

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json()["email"] == "asha@example.com"
    assert me.json()["role"] == "caregiver"


def test_google_login_links_to_existing_account_by_email(client: TestClient, monkeypatch) -> None:
    from app.services import auth_service

    _register(client)  # a password-based account with the same email
    monkeypatch.setattr(auth_service, "_verify_google_token", lambda _t: _fake_google_payload())
    resp = client.post("/api/v1/auth/google", json={"id_token": "fake"})
    assert resp.status_code == 200

    # still only one user row for that email
    users = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {resp.json()['access_token']}"}
    ).json()
    assert users["email"] == CAREGIVER["email"]


def test_google_login_rejects_unverified_email(client: TestClient, monkeypatch) -> None:
    from app.services import auth_service

    monkeypatch.setattr(
        auth_service, "_verify_google_token", lambda _t: _fake_google_payload(verified=False)
    )
    resp = client.post("/api/v1/auth/google", json={"id_token": "fake"})
    assert resp.status_code == 401


def test_google_login_rejects_invalid_token(client: TestClient, monkeypatch) -> None:
    from app.services import auth_service

    def _raise(_t):
        raise ValueError("bad token")

    monkeypatch.setattr(auth_service, "_verify_google_token", _raise)
    resp = client.post("/api/v1/auth/google", json={"id_token": "garbage"})
    assert resp.status_code == 401


def test_logout_revokes_refresh_token(client: TestClient) -> None:
    _register(client)
    tokens = _login(client).json()
    assert client.post("/api/v1/auth/logout",
                       json={"refresh_token": tokens["refresh_token"]}).status_code == 204
    after = client.post("/api/v1/auth/refresh",
                        json={"refresh_token": tokens["refresh_token"]})
    assert after.status_code == 401
