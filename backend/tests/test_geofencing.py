"""Geofencing: haversine, exit detection with hysteresis, re-entry, explainable alerts."""

import pytest

from app.services.geo import haversine_m

pytestmark = pytest.mark.usefixtures("clean_db")

# A safe zone centred on a point in Bengaluru, radius 300 m.
HOME = (12.9716, 77.5946)
NEAR = (12.9718, 77.5948)      # ~30 m from centre  -> inside
FAR = (12.9800, 77.6050)       # ~1.3 km away       -> outside


def test_haversine_is_roughly_right():
    # ~1 degree of latitude ≈ 111 km
    d = haversine_m(0.0, 0.0, 1.0, 0.0)
    assert 110_000 < d < 112_000
    assert haversine_m(*HOME, *HOME) == pytest.approx(0.0, abs=1e-6)


@pytest.fixture
def ctx(client, caregiver):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Grandpa"}, headers=h).json()["id"]
    fence = client.post(
        f"/api/v1/patients/{pid}/geofences",
        json={"name": "Home", "center_lat": HOME[0], "center_lng": HOME[1], "radius_m": 300},
        headers=h,
    ).json()
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    return {"h": h, "pid": pid, "fence": fence, "ph": {"Authorization": f"Bearer {tok}"}}


def _report(client, ctx, lat, lng, acc=10.0):
    client.post(
        "/api/v1/patient/location",
        json={"lat": lat, "lng": lng, "accuracy_m": acc}, headers=ctx["ph"],
    )


def _alerts(client, ctx):
    return client.get(f"/api/v1/patients/{ctx['pid']}/alerts", headers=ctx["h"]).json()


def test_inside_never_alerts(client, ctx):
    for _ in range(5):
        _report(client, ctx, *NEAR)
    assert _alerts(client, ctx) == []


def test_exit_fires_only_after_the_streak(client, ctx):
    _report(client, ctx, *NEAR)          # inside
    _report(client, ctx, *FAR)           # outside 1
    _report(client, ctx, *FAR)           # outside 2
    assert _alerts(client, ctx) == []    # streak not reached (default 3)
    _report(client, ctx, *FAR)           # outside 3 -> EXIT
    alerts = _alerts(client, ctx)
    assert len(alerts) == 1
    a = alerts[0]
    assert a["type"] == "geofence_exit"
    assert a["severity"] == "warning"
    assert "left Home" in a["reason_text"]
    assert a["context"]["geofence_name"] == "Home"
    assert a["context"]["distance_m"] > 300
    assert "last_point" in a["context"]


def test_return_after_exit_fires_an_info_alert(client, ctx):
    for _ in range(4):
        _report(client, ctx, *FAR)       # exit
    _report(client, ctx, *NEAR)          # back inside
    alerts = _alerts(client, ctx)
    types = {a["type"] for a in alerts}
    assert types == {"geofence_exit", "geofence_return"}


def test_acknowledge_alert(client, ctx):
    for _ in range(4):
        _report(client, ctx, *FAR)
    alert_id = _alerts(client, ctx)[0]["id"]
    r = client.post(f"/api/v1/alerts/{alert_id}/acknowledge", headers=ctx["h"])
    assert r.status_code == 200 and r.json()["acknowledged_at"] is not None

    unack = client.get(
        f"/api/v1/patients/{ctx['pid']}/alerts?unacknowledged=true", headers=ctx["h"]
    ).json()
    assert all(a["id"] != alert_id for a in unack)


def test_stranger_cannot_see_geofences_or_alerts(client, ctx, other_caregiver):
    assert client.get(f"/api/v1/patients/{ctx['pid']}/geofences", headers=other_caregiver).status_code == 404
    assert client.get(f"/api/v1/patients/{ctx['pid']}/alerts", headers=other_caregiver).status_code == 404


def test_large_accuracy_buffer_suppresses_a_borderline_exit(client, ctx):
    # a point ~330 m out (just past the 300 m radius) with a 60 m accuracy buffer stays "inside"
    borderline = (12.9716 + 0.003, 77.5946)  # ~333 m north
    for _ in range(4):
        _report(client, ctx, *borderline, acc=200.0)  # buffer caps at 60 m -> radius 360 m
    assert _alerts(client, ctx) == []
