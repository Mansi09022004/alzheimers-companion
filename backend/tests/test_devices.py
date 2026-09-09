"""Patient device provisioning + pairing + revocation."""

import pytest

pytestmark = pytest.mark.usefixtures("clean_db")


@pytest.fixture
def patient_id(client, caregiver) -> int:
    headers, _ = caregiver
    return client.post(
        "/api/v1/patients", json={"full_name": "Grandma Rao"}, headers=headers
    ).json()["id"]


def _provision(client, headers, patient_id, label="Grandma's phone"):
    return client.post(
        f"/api/v1/patients/{patient_id}/devices", json={"label": label}, headers=headers
    )


def test_provision_returns_one_time_code(client, caregiver, patient_id):
    headers, _ = caregiver
    resp = _provision(client, headers, patient_id)
    assert resp.status_code == 201
    body = resp.json()
    assert len(body["pairing_code"]) == 8
    assert body["label"] == "Grandma's phone"


def test_pair_then_access_patient_me(client, caregiver, patient_id):
    headers, _ = caregiver
    code = _provision(client, headers, patient_id).json()["pairing_code"]

    claim = client.post("/api/v1/patient/pair", json={"pairing_code": code})
    assert claim.status_code == 200
    token = claim.json()["access_token"]
    assert claim.json()["patient_name"] == "Grandma Rao"

    me = client.get("/api/v1/patient/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["full_name"] == "Grandma Rao"
    assert "notes" not in me.json()  # patient self-view is trimmed


def test_pairing_code_is_single_use(client, caregiver, patient_id):
    headers, _ = caregiver
    code = _provision(client, headers, patient_id).json()["pairing_code"]
    assert client.post("/api/v1/patient/pair", json={"pairing_code": code}).status_code == 200
    assert client.post("/api/v1/patient/pair", json={"pairing_code": code}).status_code == 401


def test_bad_pairing_code_rejected(client):
    assert client.post("/api/v1/patient/pair", json={"pairing_code": "WRONGCOD"}).status_code == 401


def test_revoking_device_kills_its_token(client, caregiver, patient_id):
    headers, _ = caregiver
    prov = _provision(client, headers, patient_id).json()
    token = client.post(
        "/api/v1/patient/pair", json={"pairing_code": prov["pairing_code"]}
    ).json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}

    assert client.get("/api/v1/patient/me", headers=auth).status_code == 200
    assert client.delete(f"/api/v1/devices/{prov['device_id']}", headers=headers).status_code == 204
    assert client.get("/api/v1/patient/me", headers=auth).status_code == 401


def test_non_owner_cannot_provision(client, caregiver, other_caregiver, patient_id):
    headers, _ = caregiver
    client.post(
        f"/api/v1/patients/{patient_id}/caregivers",
        json={"email": "stranger@ex.com", "access_level": "viewer"},
        headers=headers,
    )
    resp = _provision(client, other_caregiver, patient_id)
    assert resp.status_code == 403
