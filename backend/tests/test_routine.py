"""Daily routine items: day-of-week filtering, completion, Context Engine hint."""

import pytest

pytestmark = pytest.mark.usefixtures("clean_db")

# 2026-09-10 is a Thursday -> weekday() == 3
THURSDAY = "2026-09-10T08:00"
SUNDAY = "2026-09-13T08:00"


@pytest.fixture
def ctx(client, caregiver):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Gp"}, headers=h).json()["id"]
    breakfast = client.post(
        f"/api/v1/patients/{pid}/routine-items",
        json={"title": "Breakfast", "time_of_day": "09:00", "days_of_week": [0, 1, 2, 3, 4, 5, 6]},
        headers=h,
    ).json()
    call_rahul = client.post(
        f"/api/v1/patients/{pid}/routine-items",
        json={"title": "Call Rahul", "time_of_day": "18:00", "days_of_week": [6]},  # Sunday only
        headers=h,
    ).json()
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    return {"h": h, "pid": pid, "breakfast": breakfast, "call": call_rahul,
            "ph": {"Authorization": f"Bearer {tok}"}}


def test_today_is_filtered_by_day_of_week(client, ctx):
    thu = client.get(f"/api/v1/patient/routine/today?local_datetime={THURSDAY}", headers=ctx["ph"]).json()
    assert [i["title"] for i in thu] == ["Breakfast"]

    sun = client.get(f"/api/v1/patient/routine/today?local_datetime={SUNDAY}", headers=ctx["ph"]).json()
    assert sorted(i["title"] for i in sun) == ["Breakfast", "Call Rahul"]


def test_patient_can_check_and_uncheck(client, ctx):
    item_id = ctx["breakfast"]["id"]
    client.post(
        f"/api/v1/patient/routine/{item_id}/complete",
        json={"on_date": "2026-09-10", "done": True}, headers=ctx["ph"],
    )
    today = client.get(f"/api/v1/patient/routine/today?local_datetime={THURSDAY}", headers=ctx["ph"]).json()
    assert today[0]["done"] is True

    client.post(
        f"/api/v1/patient/routine/{item_id}/complete",
        json={"on_date": "2026-09-10", "done": False}, headers=ctx["ph"],
    )
    today = client.get(f"/api/v1/patient/routine/today?local_datetime={THURSDAY}", headers=ctx["ph"]).json()
    assert today[0]["done"] is False


def test_invalid_day_or_time_rejected(client, caregiver):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "X"}, headers=h).json()["id"]
    assert client.post(
        f"/api/v1/patients/{pid}/routine-items",
        json={"title": "x", "time_of_day": "09:00", "days_of_week": [7]}, headers=h,
    ).status_code == 422
    assert client.post(
        f"/api/v1/patients/{pid}/routine-items",
        json={"title": "x", "time_of_day": "9am", "days_of_week": [0]}, headers=h,
    ).status_code == 422


def test_stranger_cannot_touch_routine(client, ctx, other_caregiver):
    r = client.patch(
        f"/api/v1/routine-items/{ctx['breakfast']['id']}",
        json={"title": "hacked"}, headers=other_caregiver,
    )
    assert r.status_code == 404


def test_why_am_i_here_includes_next_routine(client, ctx):
    body = client.get(
        "/api/v1/patient/why-am-i-here?local_datetime=2026-09-10T07:30", headers=ctx["ph"]
    ).json()
    assert "breakfast" in body["message"].lower()
