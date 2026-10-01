"""The patient's 'My Day' journal: write, browse by date, re-save the same date."""

import pytest

pytestmark = pytest.mark.usefixtures("clean_db")


@pytest.fixture
def patient_id(client, caregiver) -> int:
    h, _ = caregiver
    return client.post("/api/v1/patients", json={"full_name": "Grandpa"}, headers=h).json()["id"]


@pytest.fixture
def patient_token(client, caregiver, patient_id) -> str:
    h, _ = caregiver
    code = client.post(f"/api/v1/patients/{patient_id}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    return client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]


def _ph(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_save_and_list_journal_entry(client, patient_token):
    r = client.post(
        "/api/v1/patient/journal",
        json={"entry_date": "2026-09-15", "text": "Had a lovely walk in the garden today."},
        headers=_ph(patient_token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["entry_date"] == "2026-09-15"
    assert body["text"] == "Had a lovely walk in the garden today."

    listed = client.get("/api/v1/patient/journal", headers=_ph(patient_token)).json()
    assert len(listed) == 1
    assert listed[0]["text"] == "Had a lovely walk in the garden today."


def test_saving_the_same_date_again_overwrites_not_duplicates(client, patient_token):
    client.post(
        "/api/v1/patient/journal",
        json={"entry_date": "2026-09-15", "text": "First draft."},
        headers=_ph(patient_token),
    )
    client.post(
        "/api/v1/patient/journal",
        json={"entry_date": "2026-09-15", "text": "Final version."},
        headers=_ph(patient_token),
    )
    listed = client.get("/api/v1/patient/journal", headers=_ph(patient_token)).json()
    assert len(listed) == 1
    assert listed[0]["text"] == "Final version."


def test_entries_are_scoped_to_the_patient(client, caregiver, patient_token):
    h, _ = caregiver
    other_pid = client.post("/api/v1/patients", json={"full_name": "Someone Else"}, headers=h).json()["id"]
    other_code = client.post(f"/api/v1/patients/{other_pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    other_token = client.post("/api/v1/patient/pair", json={"pairing_code": other_code}).json()["access_token"]

    client.post(
        "/api/v1/patient/journal",
        json={"entry_date": "2026-09-15", "text": "My private day."},
        headers=_ph(patient_token),
    )
    assert client.get("/api/v1/patient/journal", headers=_ph(other_token)).json() == []


def test_journal_requires_auth(client):
    assert client.get("/api/v1/patient/journal").status_code == 401
    assert client.post(
        "/api/v1/patient/journal", json={"entry_date": "2026-09-15", "text": "x"}
    ).status_code == 401


def test_caregiver_can_read_the_patients_journal(client, caregiver, patient_id, patient_token):
    h, _ = caregiver
    client.post(
        "/api/v1/patient/journal",
        json={"entry_date": "2026-09-15", "text": "Had a lovely walk in the garden today."},
        headers=_ph(patient_token),
    )
    r = client.get(f"/api/v1/patients/{patient_id}/journal", headers=h)
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["text"] == "Had a lovely walk in the garden today."


def test_caregiver_journal_read_requires_auth_and_is_scoped(client, patient_id, patient_token, other_caregiver):
    client.post(
        "/api/v1/patient/journal",
        json={"entry_date": "2026-09-15", "text": "Private."},
        headers=_ph(patient_token),
    )
    assert client.get(f"/api/v1/patients/{patient_id}/journal").status_code == 401
    # 404 (not 403) — an unrelated caregiver shouldn't learn the patient exists
    assert client.get(f"/api/v1/patients/{patient_id}/journal", headers=other_caregiver).status_code == 404
