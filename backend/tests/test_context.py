"""Context Engine: contextual who-is-this, why-am-i-here, memory moment, voice ask."""

import re

import pytest

from app.services import vision_client

pytestmark = pytest.mark.usefixtures("clean_db")


def _img() -> bytes:
    return b"\x89PNG\r\n\x1a\n" + b"\x00" * 128


@pytest.fixture
def setup(client, caregiver, monkeypatch):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Grandpa", "home_label": "Green Villa"}, headers=h).json()["id"]
    rahul = client.post(
        f"/api/v1/patients/{pid}/people",
        json={"display_name": "Rahul", "relationship_label": "son", "short_bio": "Lives in Pune"},
        headers=h,
    ).json()["id"]
    client.post(f"/api/v1/people/{rahul}/consent", json={}, headers=h)
    monkeypatch.setattr(
        vision_client, "embed_face",
        lambda _b, _c: vision_client.Embedding(vector=[0.1] * 512, det_score=0.9, model_version="buffalo_l"),
    )
    client.post(
        f"/api/v1/people/{rahul}/faces",
        files={"file": ("f.png", _img(), "image/png")}, headers=h,
    )
    client.post(
        f"/api/v1/patients/{pid}/memories",
        json={"text": "Rahul visited last Sunday and brought mangoes.", "person_id": rahul}, headers=h,
    )

    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    return {"ph": {"Authorization": f"Bearer {tok}"}, "pid": pid, "h": h, "rahul": rahul}


def test_who_is_this_returns_person_and_memory_sources(client, setup, monkeypatch):
    monkeypatch.setattr(
        vision_client, "embed_face",
        lambda _b, _c: vision_client.Embedding(vector=[0.1] * 512, det_score=0.9, model_version="buffalo_l"),
    )
    r = client.post(
        "/api/v1/patient/who-is-this",
        files={"file": ("cam.png", _img(), "image/png")}, headers=setup["ph"],
    )
    assert r.status_code == 200
    body = r.json()
    assert body["matched"] is True
    assert body["display_name"] == "Rahul"
    assert any("mango" in s["text"].lower() for s in body["sources"])


def test_who_is_this_unknown_face(client, setup, monkeypatch):
    monkeypatch.setattr(
        vision_client, "embed_face",
        lambda _b, _c: vision_client.Embedding(vector=[-0.1] * 512, det_score=0.9, model_version="buffalo_l"),
    )
    body = client.post(
        "/api/v1/patient/who-is-this",
        files={"file": ("cam.png", _img(), "image/png")}, headers=setup["ph"],
    ).json()
    assert body["matched"] is False
    assert "ask a family member" in body["message"].lower()


def test_why_am_i_here_uses_home_and_time(client, setup):
    body = client.get(
        "/api/v1/patient/why-am-i-here?local_datetime=2026-09-10T14:00", headers=setup["ph"]
    ).json()
    assert body["place"] == "Green Villa"
    assert body["part_of_day"] == "afternoon"
    assert body["message"]


def test_memory_moment_returns_a_memory(client, setup):
    body = client.get("/api/v1/patient/memory-moment", headers=setup["ph"]).json()
    assert body["available"] is True
    assert body["memory_id"] is not None
    assert body["message"]


def test_memory_moment_addresses_patient_as_you_not_their_own_name(client, caregiver):
    """A caregiver writes memories in the third person ("Kiran cooks for Rita") —
    but Rita is the one reading this on her own device, so it should read as
    "Kiran cooks for you", never her own name."""
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Rita"}, headers=h).json()["id"]
    client.post(
        f"/api/v1/patients/{pid}/memories",
        json={"text": "Kiran cooks for Rita every Sunday."}, headers=h,
    )
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]

    body = client.get("/api/v1/patient/memory-moment", headers={"Authorization": f"Bearer {tok}"}).json()
    assert body["available"] is True
    assert "you" in body["message"].lower()
    assert not re.search(r"\brita\b", body["message"].lower())


def test_memory_moment_personalization_fixes_verb_agreement(client, caregiver):
    """"Rita loves mangoes" -> "You love mangoes", not the ungrammatical "You loves"."""
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Rita"}, headers=h).json()["id"]
    client.post(f"/api/v1/patients/{pid}/memories", json={"text": "Rita loves mangoes."}, headers=h)
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]

    body = client.get("/api/v1/patient/memory-moment", headers={"Authorization": f"Bearer {tok}"}).json()
    assert "you love mangoes" in body["message"].lower()
    assert "loves" not in body["message"].lower()


def test_memory_moment_empty_when_no_memories(client, caregiver):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Nobody"}, headers=h).json()["id"]
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    body = client.get("/api/v1/patient/memory-moment", headers={"Authorization": f"Bearer {tok}"}).json()
    assert body["available"] is False


def test_voice_ask_transcribes_then_answers(client, setup):
    # fake provider transcribes any audio to "tell me about rahul"
    r = client.post(
        "/api/v1/patient/ask/voice",
        files={"file": ("q.m4a", b"\x00" * 2048, "audio/m4a")}, headers=setup["ph"],
    )
    assert r.status_code == 200
    body = r.json()
    assert body["transcript"] == "tell me about rahul"
    assert body["grounded"] is True
    assert any("mango" in s["text"].lower() for s in body["sources"])
