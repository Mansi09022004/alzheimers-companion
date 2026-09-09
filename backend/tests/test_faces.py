"""Face consent, registration, and identification.

The vision service is mocked — we control the embedding it "returns" so we can
test consent gating, storage, similarity thresholding, and patient scoping without
running InsightFace.
"""

import pytest

from app.services import vision_client

pytestmark = pytest.mark.usefixtures("clean_db")


def _png() -> bytes:
    # Backend only checks content-type + size, then hands bytes to the (mocked)
    # vision service — so any non-empty blob works here. Real decoding is the
    # vision service's job and is tested there.
    return b"\x89PNG\r\n\x1a\n" + b"\x00" * 128


def _mock_embed(monkeypatch, vector: list[float]):
    monkeypatch.setattr(
        vision_client,
        "embed_face",
        lambda _b, _c: vision_client.Embedding(vector=vector, det_score=0.98, model_version="buffalo_l"),
    )


@pytest.fixture
def person(client, caregiver):
    headers, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Grandpa"}, headers=headers).json()["id"]
    person_id = client.post(
        f"/api/v1/patients/{pid}/people",
        json={"display_name": "Rahul", "relationship_label": "son"},
        headers=headers,
    ).json()["id"]
    return {"headers": headers, "patient_id": pid, "person_id": person_id}


def test_register_face_requires_consent(client, person, monkeypatch):
    _mock_embed(monkeypatch, [0.1] * 512)
    r = client.post(
        f"/api/v1/people/{person['person_id']}/faces",
        files={"file": ("f.png", _png(), "image/png")},
        headers=person["headers"],
    )
    assert r.status_code == 403
    assert "consent" in r.json()["error"]["message"].lower()


def test_consent_then_register(client, person, monkeypatch):
    _mock_embed(monkeypatch, [0.1] * 512)
    assert client.post(
        f"/api/v1/people/{person['person_id']}/consent", json={}, headers=person["headers"]
    ).status_code == 201

    r = client.post(
        f"/api/v1/people/{person['person_id']}/faces",
        files={"file": ("f.png", _png(), "image/png")},
        headers=person["headers"],
    )
    assert r.status_code == 201
    assert r.json()["model_version"] == "buffalo_l"

    faces = client.get(
        f"/api/v1/people/{person['person_id']}/faces", headers=person["headers"]
    ).json()
    assert len(faces) == 1


def test_register_rejects_non_image(client, person):
    client.post(f"/api/v1/people/{person['person_id']}/consent", json={}, headers=person["headers"])
    r = client.post(
        f"/api/v1/people/{person['person_id']}/faces",
        files={"file": ("f.txt", b"nope", "text/plain")},
        headers=person["headers"],
    )
    assert r.status_code == 403


def _pair_patient(client, headers, patient_id) -> dict:
    code = client.post(
        f"/api/v1/patients/{patient_id}/devices", json={"label": "phone"}, headers=headers
    ).json()["pairing_code"]
    token = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_identify_matches_registered_person(client, person, monkeypatch):
    h = person["headers"]
    client.post(f"/api/v1/people/{person['person_id']}/consent", json={}, headers=h)
    _mock_embed(monkeypatch, [0.1] * 512)
    client.post(
        f"/api/v1/people/{person['person_id']}/faces",
        files={"file": ("f.png", _png(), "image/png")}, headers=h,
    )

    patient_auth = _pair_patient(client, h, person["patient_id"])

    # same vector -> cosine similarity 1.0 -> match
    _mock_embed(monkeypatch, [0.1] * 512)
    r = client.post(
        "/api/v1/patient/identify",
        files={"file": ("cam.png", _png(), "image/png")}, headers=patient_auth,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["matched"] is True
    assert body["display_name"] == "Rahul"
    assert body["message"] == "This is Rahul, your son."


def test_identify_says_not_sure_below_threshold(client, person, monkeypatch):
    h = person["headers"]
    client.post(f"/api/v1/people/{person['person_id']}/consent", json={}, headers=h)
    _mock_embed(monkeypatch, [0.1] * 512)
    client.post(
        f"/api/v1/people/{person['person_id']}/faces",
        files={"file": ("f.png", _png(), "image/png")}, headers=h,
    )
    patient_auth = _pair_patient(client, h, person["patient_id"])

    # opposite vector -> cosine similarity -1.0 -> "not sure"
    _mock_embed(monkeypatch, [-0.1] * 512)
    body = client.post(
        "/api/v1/patient/identify",
        files={"file": ("cam.png", _png(), "image/png")}, headers=patient_auth,
    ).json()
    assert body["matched"] is False
    assert "not sure" in body["message"].lower()


def test_identify_is_scoped_to_own_patient(client, caregiver, other_caregiver, monkeypatch):
    """A face registered for patient A must never match when patient B asks."""
    h_a, _ = caregiver
    pa = client.post("/api/v1/patients", json={"full_name": "A"}, headers=h_a).json()["id"]
    person_a = client.post(
        f"/api/v1/patients/{pa}/people",
        json={"display_name": "Sunil", "relationship_label": "brother"}, headers=h_a,
    ).json()["id"]
    client.post(f"/api/v1/people/{person_a}/consent", json={}, headers=h_a)
    _mock_embed(monkeypatch, [0.1] * 512)
    client.post(
        f"/api/v1/people/{person_a}/faces",
        files={"file": ("f.png", _png(), "image/png")}, headers=h_a,
    )

    pb = client.post("/api/v1/patients", json={"full_name": "B"}, headers=other_caregiver).json()["id"]
    patient_b_auth = _pair_patient(client, other_caregiver, pb)

    _mock_embed(monkeypatch, [0.1] * 512)  # identical to Sunil's face
    body = client.post(
        "/api/v1/patient/identify",
        files={"file": ("cam.png", _png(), "image/png")}, headers=patient_b_auth,
    ).json()
    assert body["matched"] is False  # patient B has no registered people
