"""Patient profiles, caregiver links, and data-isolation between caregivers."""

import pytest

pytestmark = pytest.mark.usefixtures("clean_db")

NEW_PATIENT = {"full_name": "Grandma Rao", "notes": "Likes tea at 4pm", "home_lat": 12.9, "home_lng": 77.6}


def test_create_patient_makes_creator_owner(client, caregiver):
    headers, _ = caregiver
    resp = client.post("/api/v1/patients", json=NEW_PATIENT, headers=headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["full_name"] == "Grandma Rao"
    assert body["my_access"] == "owner"


def test_list_only_returns_my_patients(client, caregiver, other_caregiver):
    headers, _ = caregiver
    client.post("/api/v1/patients", json=NEW_PATIENT, headers=headers)

    assert len(client.get("/api/v1/patients", headers=headers).json()) == 1
    assert client.get("/api/v1/patients", headers=other_caregiver).json() == []


def test_stranger_cannot_read_patient(client, caregiver, other_caregiver):
    headers, _ = caregiver
    pid = client.post("/api/v1/patients", json=NEW_PATIENT, headers=headers).json()["id"]

    # 404 (not 403) — we don't confirm the patient even exists
    assert client.get(f"/api/v1/patients/{pid}", headers=other_caregiver).status_code == 404


def test_patch_updates_fields(client, caregiver):
    headers, _ = caregiver
    pid = client.post("/api/v1/patients", json=NEW_PATIENT, headers=headers).json()["id"]
    resp = client.patch(f"/api/v1/patients/{pid}", json={"notes": "Tea at 5"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["notes"] == "Tea at 5"


def test_viewer_cannot_delete_patient(client, caregiver, other_caregiver):
    headers, _ = caregiver
    pid = client.post("/api/v1/patients", json=NEW_PATIENT, headers=headers).json()["id"]
    # add the stranger as a viewer
    client.post(
        f"/api/v1/patients/{pid}/caregivers",
        json={"email": "stranger@ex.com", "access_level": "viewer"},
        headers=headers,
    )
    assert client.delete(f"/api/v1/patients/{pid}", headers=other_caregiver).status_code == 403
    # owner can
    assert client.delete(f"/api/v1/patients/{pid}", headers=headers).status_code == 204


def test_add_caregiver_grants_access(client, caregiver, other_caregiver):
    headers, _ = caregiver
    pid = client.post("/api/v1/patients", json=NEW_PATIENT, headers=headers).json()["id"]

    add = client.post(
        f"/api/v1/patients/{pid}/caregivers",
        json={"email": "stranger@ex.com", "access_level": "viewer"},
        headers=headers,
    )
    assert add.status_code == 201
    # now the stranger sees the patient
    got = client.get(f"/api/v1/patients/{pid}", headers=other_caregiver)
    assert got.status_code == 200
    assert got.json()["my_access"] == "viewer"


def test_requires_caregiver_role(client):
    assert client.get("/api/v1/patients").status_code == 401
