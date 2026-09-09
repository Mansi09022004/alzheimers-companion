"""Emergency contacts + the SOS flow."""

import pytest

pytestmark = pytest.mark.usefixtures("clean_db")


@pytest.fixture
def ctx(client, caregiver):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Grandpa Rao"}, headers=h).json()["id"]
    client.post(
        f"/api/v1/patients/{pid}/emergency-contacts",
        json={"name": "Rahul", "phone": "+919876543210", "relation": "son", "priority": 1},
        headers=h,
    )
    client.post(
        f"/api/v1/patients/{pid}/emergency-contacts",
        json={"name": "Dr Mehta", "phone": "+919812345678", "priority": 5},
        headers=h,
    )
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    return {"h": h, "pid": pid, "ph": {"Authorization": f"Bearer {tok}"}}


def test_contacts_are_ordered_by_priority(client, ctx):
    contacts = client.get(f"/api/v1/patients/{ctx['pid']}/emergency-contacts", headers=ctx["h"]).json()
    assert [c["name"] for c in contacts] == ["Rahul", "Dr Mehta"]


def test_sos_creates_a_critical_alert_with_contacts_and_location(client, ctx):
    client.post("/api/v1/patient/location", json={"lat": 12.97, "lng": 77.59}, headers=ctx["ph"])

    r = client.post("/api/v1/patient/sos", json={"note": "I feel lost"}, headers=ctx["ph"])
    assert r.status_code == 200
    body = r.json()
    assert "Help is on the way" in body["message"]
    assert body["notified_caregivers"] == 1
    assert set(body["notified_contacts"]) == {"Rahul", "Dr Mehta"}

    alerts = client.get(f"/api/v1/patients/{ctx['pid']}/alerts", headers=ctx["h"]).json()
    sos = [a for a in alerts if a["type"] == "sos"][0]
    assert sos["severity"] == "critical"
    assert sos["context"]["note"] == "I feel lost"
    assert sos["context"]["location"]["lat"] == 12.97
    assert len(sos["context"]["notified_contacts"]) == 2


def test_double_tap_collapses_to_one_alert(client, ctx):
    a1 = client.post("/api/v1/patient/sos", json={}, headers=ctx["ph"]).json()["alert_id"]
    a2 = client.post("/api/v1/patient/sos", json={}, headers=ctx["ph"]).json()["alert_id"]
    assert a1 == a2
    alerts = client.get(f"/api/v1/patients/{ctx['pid']}/alerts", headers=ctx["h"]).json()
    assert len([a for a in alerts if a["type"] == "sos"]) == 1


def test_sos_works_without_any_location_or_contacts(client, caregiver):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Solo"}, headers=h).json()["id"]
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    r = client.post("/api/v1/patient/sos", json={}, headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200


def test_sos_requires_a_device_token(client):
    assert client.post("/api/v1/patient/sos", json={}).status_code == 401


def test_stranger_cannot_manage_contacts(client, ctx, other_caregiver):
    r = client.get(f"/api/v1/patients/{ctx['pid']}/emergency-contacts", headers=other_caregiver)
    assert r.status_code == 404
