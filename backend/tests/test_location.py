"""Location reporting + caregiver reads + access scoping."""

import pytest

pytestmark = pytest.mark.usefixtures("clean_db")


@pytest.fixture
def ctx(client, caregiver):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Gp"}, headers=h).json()["id"]
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    return {"h": h, "pid": pid, "ph": {"Authorization": f"Bearer {tok}"}}


def test_report_and_read_latest(client, ctx):
    r = client.post(
        "/api/v1/patient/location",
        json={"lat": 12.9716, "lng": 77.5946, "accuracy_m": 8.0}, headers=ctx["ph"],
    )
    assert r.status_code == 204

    latest = client.get(f"/api/v1/patients/{ctx['pid']}/location", headers=ctx["h"]).json()
    assert latest["point"]["lat"] == 12.9716
    assert latest["age_seconds"] is not None and latest["age_seconds"] >= 0


def test_latest_is_empty_before_any_report(client, ctx):
    latest = client.get(f"/api/v1/patients/{ctx['pid']}/location", headers=ctx["h"]).json()
    assert latest == {"point": None, "age_seconds": None}


def test_history_returns_points_newest_first(client, ctx):
    for i in range(3):
        client.post(
            "/api/v1/patient/location",
            json={"lat": 12.0 + i / 100, "lng": 77.0, "recorded_at": f"2026-09-10T10:0{i}:00Z"},
            headers=ctx["ph"],
        )
    hist = client.get(
        f"/api/v1/patients/{ctx['pid']}/location/history?hours=24", headers=ctx["h"]
    ).json()
    assert len(hist) == 3
    assert hist[0]["recorded_at"] > hist[-1]["recorded_at"]


def test_invalid_coordinates_rejected(client, ctx):
    r = client.post(
        "/api/v1/patient/location", json={"lat": 200, "lng": 77}, headers=ctx["ph"]
    )
    assert r.status_code == 422


def test_stranger_cannot_read_location(client, ctx, other_caregiver):
    client.post("/api/v1/patient/location", json={"lat": 12.9, "lng": 77.5}, headers=ctx["ph"])
    r = client.get(f"/api/v1/patients/{ctx['pid']}/location", headers=other_caregiver)
    assert r.status_code == 404


def test_reporting_requires_a_device_token(client):
    assert client.post("/api/v1/patient/location", json={"lat": 1, "lng": 1}).status_code == 401
