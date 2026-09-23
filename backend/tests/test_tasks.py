""""Today's Tasks" — added by caregiver or patient, completed by either, per-date."""

import pytest

pytestmark = pytest.mark.usefixtures("clean_db")


@pytest.fixture
def ctx(client, caregiver):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Grandpa"}, headers=h).json()["id"]
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    return {"h": h, "pid": pid, "ph": {"Authorization": f"Bearer {tok}"}}


def test_caregiver_creates_task_patient_sees_it(client, ctx):
    r = client.post(
        f"/api/v1/patients/{ctx['pid']}/tasks",
        json={"text": "Take a short walk", "task_date": "2026-09-15"},
        headers=ctx["h"],
    )
    assert r.status_code == 201
    assert r.json()["completed"] is False
    assert r.json()["created_by"] is not None

    tasks = client.get(f"/api/v1/patient/tasks?task_date=2026-09-15", headers=ctx["ph"]).json()
    assert len(tasks) == 1
    assert tasks[0]["text"] == "Take a short walk"


def test_patient_creates_task_caregiver_sees_it(client, ctx):
    r = client.post(
        "/api/v1/patient/tasks",
        json={"text": "Water the plants", "task_date": "2026-09-15"},
        headers=ctx["ph"],
    )
    assert r.status_code == 201
    assert r.json()["created_by"] is None

    tasks = client.get(f"/api/v1/patients/{ctx['pid']}/tasks?task_date=2026-09-15", headers=ctx["h"]).json()
    assert len(tasks) == 1
    assert tasks[0]["text"] == "Water the plants"


def test_patient_can_complete_and_uncomplete_a_task(client, ctx):
    task_id = client.post(
        "/api/v1/patient/tasks", json={"text": "Call Meera", "task_date": "2026-09-15"}, headers=ctx["ph"]
    ).json()["id"]

    done = client.post(
        f"/api/v1/patient/tasks/{task_id}/complete", json={"completed": True}, headers=ctx["ph"]
    ).json()
    assert done["completed"] is True
    assert done["completed_at"] is not None

    undone = client.post(
        f"/api/v1/patient/tasks/{task_id}/complete", json={"completed": False}, headers=ctx["ph"]
    ).json()
    assert undone["completed"] is False
    assert undone["completed_at"] is None


def test_caregiver_can_edit_and_delete_a_task(client, ctx):
    task_id = client.post(
        f"/api/v1/patients/{ctx['pid']}/tasks", json={"text": "Original", "task_date": "2026-09-15"}, headers=ctx["h"]
    ).json()["id"]

    updated = client.patch(f"/api/v1/tasks/{task_id}", json={"text": "Edited"}, headers=ctx["h"]).json()
    assert updated["text"] == "Edited"

    assert client.delete(f"/api/v1/tasks/{task_id}", headers=ctx["h"]).status_code == 204
    tasks = client.get(f"/api/v1/patients/{ctx['pid']}/tasks?task_date=2026-09-15", headers=ctx["h"]).json()
    assert tasks == []


def test_tasks_are_scoped_per_date(client, ctx):
    client.post(f"/api/v1/patients/{ctx['pid']}/tasks", json={"text": "Yesterday's task", "task_date": "2026-09-14"}, headers=ctx["h"])
    client.post(f"/api/v1/patients/{ctx['pid']}/tasks", json={"text": "Today's task", "task_date": "2026-09-15"}, headers=ctx["h"])

    today = client.get(f"/api/v1/patients/{ctx['pid']}/tasks?task_date=2026-09-15", headers=ctx["h"]).json()
    assert [t["text"] for t in today] == ["Today's task"]


def test_tasks_are_scoped_to_the_patient(client, caregiver, ctx):
    h, _ = caregiver
    other_pid = client.post("/api/v1/patients", json={"full_name": "Someone Else"}, headers=h).json()["id"]
    client.post(f"/api/v1/patients/{ctx['pid']}/tasks", json={"text": "Private", "task_date": "2026-09-15"}, headers=h)
    other = client.get(f"/api/v1/patients/{other_pid}/tasks?task_date=2026-09-15", headers=h).json()
    assert other == []


def test_stranger_cannot_manage_tasks(client, ctx, other_caregiver):
    task_id = client.post(
        f"/api/v1/patients/{ctx['pid']}/tasks", json={"text": "x", "task_date": "2026-09-15"}, headers=ctx["h"]
    ).json()["id"]
    assert client.get(f"/api/v1/patients/{ctx['pid']}/tasks", headers=other_caregiver).status_code == 404
    assert client.patch(f"/api/v1/tasks/{task_id}", json={"completed": True}, headers=other_caregiver).status_code == 404


def test_tasks_require_auth(client):
    assert client.get("/api/v1/patient/tasks?task_date=2026-09-15").status_code == 401
    assert client.post("/api/v1/patient/tasks", json={"text": "x", "task_date": "2026-09-15"}).status_code == 401
