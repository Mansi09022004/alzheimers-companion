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


# --- familiar places: a separate kind, never alerted on, never auto-detected ---

GARDEN = (12.9750, 77.6000)  # ~700 m from HOME — deliberately outside the Home safe zone


def test_geofence_defaults_to_safe_zone_kind(client, ctx):
    assert ctx["fence"]["kind"] == "safe_zone"


def test_familiar_place_can_be_created_and_listed(client, caregiver):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Grandpa"}, headers=h).json()["id"]
    place = client.post(
        f"/api/v1/patients/{pid}/geofences",
        json={"name": "Garden", "center_lat": GARDEN[0], "center_lng": GARDEN[1], "radius_m": 100, "kind": "familiar_place"},
        headers=h,
    ).json()
    assert place["kind"] == "familiar_place"
    listed = client.get(f"/api/v1/patients/{pid}/geofences", headers=h).json()
    assert {z["name"]: z["kind"] for z in listed} == {"Garden": "familiar_place"}


def test_familiar_place_never_triggers_an_exit_alert(client, caregiver):
    """A patient can wander in and out of a familiar place's radius all day —
    that is not a safety event, only a safe_zone exit is."""
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Grandpa"}, headers=h).json()["id"]
    client.post(
        f"/api/v1/patients/{pid}/geofences",
        json={"name": "Garden", "center_lat": GARDEN[0], "center_lng": GARDEN[1], "radius_m": 100, "kind": "familiar_place"},
        headers=h,
    )
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    ph = {"Authorization": f"Bearer {tok}"}

    for lat, lng in [GARDEN, GARDEN, FAR, FAR, FAR, FAR]:  # inside the familiar place, then far away
        client.post("/api/v1/patient/location", json={"lat": lat, "lng": lng, "accuracy_m": 10.0}, headers=ph)

    assert client.get(f"/api/v1/patients/{pid}/alerts", headers=h).json() == []


def test_location_context_identifies_a_familiar_place_and_distance_from_home(client, caregiver):
    h, _ = caregiver
    pid = client.post(
        "/api/v1/patients",
        json={"full_name": "Rita", "home_label": "Home", "home_lat": HOME[0], "home_lng": HOME[1]},
        headers=h,
    ).json()["id"]
    client.post(
        f"/api/v1/patients/{pid}/geofences",
        json={"name": "Garden", "center_lat": GARDEN[0], "center_lng": GARDEN[1], "radius_m": 100, "kind": "familiar_place"},
        headers=h,
    )
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    client.post(
        "/api/v1/patient/location",
        json={"lat": GARDEN[0], "lng": GARDEN[1], "accuracy_m": 10.0},
        headers={"Authorization": f"Bearer {tok}"},
    )

    body = client.get(f"/api/v1/patients/{pid}/location/context", headers=h).json()
    assert body["at_familiar_place"] is True
    assert body["familiar_place_name"] == "Garden"
    assert body["home_label"] == "Home"
    assert body["age_seconds"] is not None
    assert body["distance_from_home_m"] is not None and body["distance_from_home_m"] > 500


def test_location_context_not_at_a_familiar_place_when_far_from_all(client, caregiver):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Rita"}, headers=h).json()["id"]
    client.post(
        f"/api/v1/patients/{pid}/geofences",
        json={"name": "Garden", "center_lat": GARDEN[0], "center_lng": GARDEN[1], "radius_m": 100, "kind": "familiar_place"},
        headers=h,
    )
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    client.post(
        "/api/v1/patient/location",
        json={"lat": FAR[0], "lng": FAR[1], "accuracy_m": 10.0},
        headers={"Authorization": f"Bearer {tok}"},
    )

    body = client.get(f"/api/v1/patients/{pid}/location/context", headers=h).json()
    assert body["at_familiar_place"] is False
    assert body["familiar_place_name"] is None


def test_location_context_with_no_fix_yet(client, caregiver):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Rita"}, headers=h).json()["id"]
    body = client.get(f"/api/v1/patients/{pid}/location/context", headers=h).json()
    assert body == {
        "point": None, "age_seconds": None, "at_familiar_place": False,
        "familiar_place_name": None, "distance_from_home_m": None, "home_label": None,
    }


def test_location_context_requires_auth_and_is_scoped(client, ctx, other_caregiver):
    assert client.get(f"/api/v1/patients/{ctx['pid']}/location/context").status_code == 401
    assert client.get(f"/api/v1/patients/{ctx['pid']}/location/context", headers=other_caregiver).status_code == 404
