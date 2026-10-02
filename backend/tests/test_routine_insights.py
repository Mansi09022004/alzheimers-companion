"""'Routine Detection': patterns only surface once there's real history behind them,
and never for a single occurrence — covering medication times, the daily routine
(including visits), repeated tasks, My Day/journal writing times, and frequently
visited safe zones."""

from datetime import UTC, date, datetime, timedelta

import pytest

from app.core.database import SessionLocal
from app.models.geofence import Geofence, GeofenceEvent, GeofenceEventType
from app.models.journal_entry import JournalEntry
from app.models.medication import Medication
from app.models.routine import RoutineItem

pytestmark = pytest.mark.usefixtures("clean_db")


def _backdate_created_at(model_cls, row_id: int, days_ago: int) -> None:
    with SessionLocal() as db:
        row = db.get(model_cls, row_id)
        row.created_at = datetime.now(UTC) - timedelta(days=days_ago)
        db.add(row)
        db.commit()


@pytest.fixture
def ctx(client, caregiver):
    h, user = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Rita Mehta"}, headers=h).json()["id"]
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    return {"h": h, "pid": pid, "user_id": user["id"], "ph": {"Authorization": f"Bearer {tok}"}}


def test_requires_auth(client):
    assert client.get("/api/v1/patient/routines/detected").status_code == 401


def test_no_pattern_without_enough_history(client, ctx):
    r = client.get("/api/v1/patient/routines/detected", headers=ctx["ph"])
    assert r.status_code == 200
    assert r.json() == []


def test_detects_a_consistent_medication_time(client, ctx):
    med = client.post(
        f"/api/v1/patients/{ctx['pid']}/medications",
        json={"name": "Blood pressure tablet", "schedule_times": ["08:00"]},
        headers=ctx["h"],
    ).json()
    _backdate_created_at(Medication, med["id"], days_ago=5)

    today = date.today()
    for n in range(6):
        d = today - timedelta(days=n)
        client.post(
            f"/api/v1/patient/medications/{med['id']}/doses/08:00",
            json={"scheduled_date": d.isoformat(), "status": "taken"},
            headers=ctx["ph"],
        )

    routines = client.get("/api/v1/patient/routines/detected", headers=ctx["ph"]).json()
    meds = [r for r in routines if r["category"] == "medication"]
    assert len(meds) == 1
    assert meds[0]["icon"] == "💊"
    assert "Rita" in meds[0]["message"]
    assert "Blood pressure tablet" in meds[0]["message"]
    assert "8 am" in meds[0]["message"]


def test_one_off_dose_does_not_create_a_pattern(client, ctx):
    med = client.post(
        f"/api/v1/patients/{ctx['pid']}/medications",
        json={"name": "Vitamin", "schedule_times": ["09:00"]},
        headers=ctx["h"],
    ).json()
    _backdate_created_at(Medication, med["id"], days_ago=10)
    client.post(
        f"/api/v1/patient/medications/{med['id']}/doses/09:00",
        json={"scheduled_date": date.today().isoformat(), "status": "taken"},
        headers=ctx["ph"],
    )
    routines = client.get("/api/v1/patient/routines/detected", headers=ctx["ph"]).json()
    assert [r for r in routines if r["category"] == "medication"] == []


def test_detects_a_regular_routine_item(client, ctx):
    item = client.post(
        f"/api/v1/patients/{ctx['pid']}/routine-items",
        json={"title": "Morning walk", "time_of_day": "07:30", "days_of_week": [0, 1, 2, 3, 4, 5, 6]},
        headers=ctx["h"],
    ).json()
    _backdate_created_at(RoutineItem, item["id"], days_ago=5)

    today = date.today()
    for n in range(6):
        d = today - timedelta(days=n)
        client.post(
            f"/api/v1/patient/routine/{item['id']}/complete",
            json={"on_date": d.isoformat(), "done": True},
            headers=ctx["ph"],
        )

    routines = client.get("/api/v1/patient/routines/detected", headers=ctx["ph"]).json()
    routine = [r for r in routines if r["category"] == "routine"]
    assert len(routine) == 1
    assert "Morning walk" in routine[0]["message"]
    assert routine[0]["icon"] == "📅"


def test_detects_a_regular_visit_by_title_keyword(client, ctx):
    item = client.post(
        f"/api/v1/patients/{ctx['pid']}/routine-items",
        json={"title": "Rahul visits", "time_of_day": "17:00", "days_of_week": [0, 1, 2, 3, 4, 5, 6]},
        headers=ctx["h"],
    ).json()
    _backdate_created_at(RoutineItem, item["id"], days_ago=5)
    today = date.today()
    for n in range(6):
        d = today - timedelta(days=n)
        client.post(
            f"/api/v1/patient/routine/{item['id']}/complete",
            json={"on_date": d.isoformat(), "done": True},
            headers=ctx["ph"],
        )
    routines = client.get("/api/v1/patient/routines/detected", headers=ctx["ph"]).json()
    visits = [r for r in routines if r["category"] == "visit"]
    assert len(visits) == 1
    assert visits[0]["icon"] == "👥"


def test_detects_a_frequently_completed_task(client, ctx):
    today = date.today()
    for n in range(3):
        d = today - timedelta(days=n)
        t = client.post(
            "/api/v1/patient/tasks", json={"task_date": d.isoformat(), "text": "Water the garden"}, headers=ctx["ph"]
        ).json()
        client.post(f"/api/v1/patient/tasks/{t['id']}/complete", json={"completed": True}, headers=ctx["ph"])

    routines = client.get("/api/v1/patient/routines/detected", headers=ctx["ph"]).json()
    tasks = [r for r in routines if r["category"] == "task"]
    assert len(tasks) == 1
    assert "Water the garden" in tasks[0]["message"]


def test_a_task_done_only_twice_does_not_create_a_pattern(client, ctx):
    today = date.today()
    for n in range(2):
        d = today - timedelta(days=n)
        t = client.post(
            "/api/v1/patient/tasks", json={"task_date": d.isoformat(), "text": "Water the garden"}, headers=ctx["ph"]
        ).json()
        client.post(f"/api/v1/patient/tasks/{t['id']}/complete", json={"completed": True}, headers=ctx["ph"])

    routines = client.get("/api/v1/patient/routines/detected", headers=ctx["ph"]).json()
    assert [r for r in routines if r["category"] == "task"] == []


def test_detects_a_frequently_visited_place(client, ctx):
    with SessionLocal() as db:
        fence = Geofence(
            patient_id=ctx["pid"], name="Community Park", center_lat=1.0, center_lng=1.0,
            radius_m=100, active=True, created_by=ctx["user_id"],
        )
        db.add(fence)
        db.flush()
        now = datetime.now(UTC)
        for n in range(6):
            db.add(GeofenceEvent(
                geofence_id=fence.id, patient_id=ctx["pid"], event=GeofenceEventType.enter,
                at_lat=1.0, at_lng=1.0, distance_m=0.0, occurred_at=now - timedelta(days=n),
            ))
        db.commit()

    routines = client.get("/api/v1/patient/routines/detected", headers=ctx["ph"]).json()
    locations = [r for r in routines if r["category"] == "location"]
    assert len(locations) == 1
    assert "Community Park" in locations[0]["message"]
    assert locations[0]["icon"] == "📍"


def test_detects_a_consistent_journal_writing_time(client, ctx):
    today = date.today()
    for n in range(5):
        d = today - timedelta(days=n)
        client.post(
            "/api/v1/patient/journal",
            json={"entry_date": d.isoformat(), "text": f"Entry {n}"},
            headers=ctx["ph"],
        )
    # All five were actually written at the same hour — simulate that (created_at is
    # server-set on insert, so the API can't backdate it the way scheduled_date can).
    with SessionLocal() as db:
        entries = db.query(JournalEntry).filter(JournalEntry.patient_id == ctx["pid"]).all()
        assert len(entries) == 5
        for e in entries:
            e.created_at = datetime(e.entry_date.year, e.entry_date.month, e.entry_date.day, 19, 0, tzinfo=UTC)
            db.add(e)
        db.commit()

    routines = client.get("/api/v1/patient/routines/detected", headers=ctx["ph"]).json()
    journal = [r for r in routines if r["category"] == "journal"]
    assert len(journal) == 1
    assert "My Day" in journal[0]["message"]
    assert journal[0]["icon"] == "📝"


def test_too_few_journal_entries_do_not_create_a_pattern(client, ctx):
    today = date.today()
    for n in range(2):
        d = today - timedelta(days=n)
        client.post(
            "/api/v1/patient/journal",
            json={"entry_date": d.isoformat(), "text": f"Entry {n}"},
            headers=ctx["ph"],
        )
    routines = client.get("/api/v1/patient/routines/detected", headers=ctx["ph"]).json()
    assert [r for r in routines if r["category"] == "journal"] == []
