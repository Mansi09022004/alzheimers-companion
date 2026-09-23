"""Medication schedules, the patient today view, dose logging, and adherence."""

import pytest

pytestmark = pytest.mark.usefixtures("clean_db")


@pytest.fixture
def ctx(client, caregiver):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Gp"}, headers=h).json()["id"]
    med = client.post(
        f"/api/v1/patients/{pid}/medications",
        json={"name": "Donepezil", "dosage_note": "5 mg", "schedule_times": ["08:00", "20:00"]},
        headers=h,
    ).json()
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    return {"h": h, "pid": pid, "med": med, "ph": {"Authorization": f"Bearer {tok}"}}


def test_create_validates_and_sorts_times(client, caregiver):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "X"}, headers=h).json()["id"]
    r = client.post(
        f"/api/v1/patients/{pid}/medications",
        json={"name": "Vit D", "schedule_times": ["20:00", "08:00"]}, headers=h,
    )
    assert r.status_code == 201
    assert r.json()["schedule_times"] == ["08:00", "20:00"]

    bad = client.post(
        f"/api/v1/patients/{pid}/medications",
        json={"name": "X", "schedule_times": ["25:99"]}, headers=h,
    )
    assert bad.status_code == 422


def test_caregiver_today_view(client, ctx):
    slots = client.get(f"/api/v1/patients/{ctx['pid']}/medications/today", headers=ctx["h"]).json()
    assert {s["time"] for s in slots} == {"08:00", "20:00"}
    assert all(s["status"] in {"upcoming", "due", "missed", "taken", "skipped"} for s in slots)


def test_caregiver_today_requires_access(client, ctx, other_caregiver):
    r = client.get(f"/api/v1/patients/{ctx['pid']}/medications/today", headers=other_caregiver)
    assert r.status_code == 404


def test_today_view_status_progression(client, ctx):
    # at 09:00: the 08:00 dose is "due", the 20:00 dose is "upcoming"
    slots = client.get(
        "/api/v1/patient/medications/today?local_datetime=2026-09-10T09:00", headers=ctx["ph"]
    ).json()
    by_time = {s["time"]: s["status"] for s in slots}
    assert by_time == {"08:00": "due", "20:00": "upcoming"}

    # at 23:00: 08:00 is "missed" (grace passed), 20:00 is "due"
    slots = client.get(
        "/api/v1/patient/medications/today?local_datetime=2026-09-10T23:00", headers=ctx["ph"]
    ).json()
    by_time = {s["time"]: s["status"] for s in slots}
    assert by_time["08:00"] == "missed"


def test_patient_marks_dose_taken(client, ctx):
    med_id = ctx["med"]["id"]
    r = client.post(
        f"/api/v1/patient/medications/{med_id}/doses/08:00",
        json={"scheduled_date": "2026-09-10", "status": "taken"}, headers=ctx["ph"],
    )
    assert r.status_code == 200 and r.json()["status"] == "taken"

    slots = client.get(
        "/api/v1/patient/medications/today?local_datetime=2026-09-10T09:00", headers=ctx["ph"]
    ).json()
    assert {s["time"]: s["status"] for s in slots}["08:00"] == "taken"


def test_marking_a_time_not_on_schedule_is_rejected(client, ctx):
    r = client.post(
        f"/api/v1/patient/medications/{ctx['med']['id']}/doses/13:00",
        json={"scheduled_date": "2026-09-10", "status": "taken"}, headers=ctx["ph"],
    )
    assert r.status_code == 403


def test_patient_cannot_touch_another_patients_medication(client, ctx, other_caregiver):
    other_pid = client.post("/api/v1/patients", json={"full_name": "B"}, headers=other_caregiver).json()["id"]
    ocode = client.post(
        f"/api/v1/patients/{other_pid}/devices", json={"label": "p"}, headers=other_caregiver
    ).json()["pairing_code"]
    otok = client.post("/api/v1/patient/pair", json={"pairing_code": ocode}).json()["access_token"]

    r = client.post(
        f"/api/v1/patient/medications/{ctx['med']['id']}/doses/08:00",
        json={"scheduled_date": "2026-09-10", "status": "taken"},
        headers={"Authorization": f"Bearer {otok}"},
    )
    assert r.status_code == 404


def test_adherence_counts(client, ctx):
    med_id = ctx["med"]["id"]
    # take the 08:00 dose on two past days
    for d in ("2026-09-08", "2026-09-09"):
        client.post(
            f"/api/v1/patient/medications/{med_id}/doses/08:00",
            json={"scheduled_date": d, "status": "taken"}, headers=ctx["ph"],
        )
    summary = client.get(
        f"/api/v1/patients/{ctx['pid']}/medications/adherence?days=30", headers=ctx["h"]
    ).json()
    assert summary["taken"] == 2
    assert summary["missed"] >= 1  # earlier untaken doses
    assert 0.0 <= summary["adherence_rate"] <= 1.0


def test_why_am_i_here_mentions_next_medicine(client, ctx):
    body = client.get(
        "/api/v1/patient/why-am-i-here?local_datetime=2026-09-10T07:00", headers=ctx["ph"]
    ).json()
    # fake LLM echoes the prompt, which contains the medicine hint
    assert "donepezil" in body["message"].lower() or "medicine" in body["message"].lower()
