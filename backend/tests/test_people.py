"""People (family members) and the person-to-person relationship graph."""

import pytest

pytestmark = pytest.mark.usefixtures("clean_db")


@pytest.fixture
def patient_id(client, caregiver) -> int:
    headers, _ = caregiver
    return client.post(
        "/api/v1/patients", json={"full_name": "Grandpa"}, headers=headers
    ).json()["id"]


def test_patient_app_lists_only_active_people(client, caregiver, patient_id):
    headers, _ = caregiver
    active = client.post(
        f"/api/v1/patients/{patient_id}/people",
        json={"display_name": "Rahul", "relationship_label": "grandson", "phone": "+91 98765 43210"},
        headers=headers,
    ).json()
    inactive = client.post(
        f"/api/v1/patients/{patient_id}/people",
        json={"display_name": "Old Friend", "relationship_label": "friend"},
        headers=headers,
    ).json()
    client.patch(f"/api/v1/people/{inactive['id']}", json={"is_active": False}, headers=headers)

    code = client.post(f"/api/v1/patients/{patient_id}/devices", json={"label": "p"}, headers=headers).json()["pairing_code"]
    token = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]

    r = client.get("/api/v1/patient/people", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert [p["id"] for p in r.json()] == [active["id"]]
    assert r.json()[0]["relationship_label"] == "grandson"
    assert r.json()[0]["phone"] == "+91 98765 43210"
    assert "short_bio" not in r.json()[0]


def test_upload_person_photo(client, caregiver, patient_id):
    headers, _ = caregiver
    person_id = client.post(
        f"/api/v1/patients/{patient_id}/people",
        json={"display_name": "Rahul", "relationship_label": "son"},
        headers=headers,
    ).json()["id"]

    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 128
    resp = client.post(
        f"/api/v1/people/{person_id}/photo",
        files={"file": ("rahul.png", png, "image/png")},
        headers=headers,
    )
    assert resp.status_code == 200
    photo_url = resp.json()["photo_url"]
    assert photo_url and photo_url.startswith("/media/people/")

    people = client.get(f"/api/v1/patients/{patient_id}/people", headers=headers).json()
    assert people[0]["photo_url"] == photo_url


def test_add_and_list_people(client, caregiver, patient_id):
    headers, _ = caregiver
    r = client.post(
        f"/api/v1/patients/{patient_id}/people",
        json={"display_name": "Rahul", "relationship_label": "son", "short_bio": "Lives in Pune"},
        headers=headers,
    )
    assert r.status_code == 201
    assert r.json()["display_name"] == "Rahul"

    people = client.get(f"/api/v1/patients/{patient_id}/people", headers=headers).json()
    assert [p["display_name"] for p in people] == ["Rahul"]


def test_stranger_cannot_add_person(client, caregiver, other_caregiver, patient_id):
    r = client.post(
        f"/api/v1/patients/{patient_id}/people",
        json={"display_name": "X", "relationship_label": "friend"},
        headers=other_caregiver,
    )
    assert r.status_code == 404


def test_relationship_between_two_people(client, caregiver, patient_id):
    headers, _ = caregiver
    rahul = client.post(
        f"/api/v1/patients/{patient_id}/people",
        json={"display_name": "Rahul", "relationship_label": "son"}, headers=headers,
    ).json()["id"]
    meera = client.post(
        f"/api/v1/patients/{patient_id}/people",
        json={"display_name": "Meera", "relationship_label": "daughter-in-law"}, headers=headers,
    ).json()["id"]

    r = client.post(
        f"/api/v1/patients/{patient_id}/relationships",
        json={"from_person_id": meera, "to_person_id": rahul, "relationship": "spouse"},
        headers=headers,
    )
    assert r.status_code == 201

    rels = client.get(f"/api/v1/patients/{patient_id}/relationships", headers=headers).json()
    assert rels[0]["relationship"] == "spouse"


def test_relationship_rejects_person_from_another_patient(client, caregiver, patient_id):
    headers, _ = caregiver
    other_pid = client.post(
        "/api/v1/patients", json={"full_name": "Someone Else"}, headers=headers
    ).json()["id"]
    outsider = client.post(
        f"/api/v1/patients/{other_pid}/people",
        json={"display_name": "Outsider", "relationship_label": "friend"}, headers=headers,
    ).json()["id"]
    insider = client.post(
        f"/api/v1/patients/{patient_id}/people",
        json={"display_name": "Insider", "relationship_label": "son"}, headers=headers,
    ).json()["id"]

    r = client.post(
        f"/api/v1/patients/{patient_id}/relationships",
        json={"from_person_id": insider, "to_person_id": outsider, "relationship": "friend"},
        headers=headers,
    )
    assert r.status_code == 404


def test_delete_person(client, caregiver, patient_id):
    headers, _ = caregiver
    pid = client.post(
        f"/api/v1/patients/{patient_id}/people",
        json={"display_name": "Temp", "relationship_label": "friend"}, headers=headers,
    ).json()["id"]
    assert client.delete(f"/api/v1/people/{pid}", headers=headers).status_code == 204
    assert client.get(f"/api/v1/patients/{patient_id}/people", headers=headers).json() == []
