"""Memories: creation (auto-approved), status filtering, review workflow, patient view."""

import pytest

pytestmark = pytest.mark.usefixtures("clean_db")


@pytest.fixture
def ctx(client, caregiver):
    headers, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Grandpa"}, headers=headers).json()["id"]
    person = client.post(
        f"/api/v1/patients/{pid}/people",
        json={"display_name": "Rahul", "relationship_label": "son"}, headers=headers,
    ).json()["id"]
    return {"h": headers, "pid": pid, "person": person}


def test_caregiver_memory_is_auto_approved(client, ctx):
    r = client.post(
        f"/api/v1/patients/{ctx['pid']}/memories",
        json={"text": "Rahul visited on Sunday and brought mangoes.", "person_id": ctx["person"]},
        headers=ctx["h"],
    )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "approved"
    assert body["source"] == "caregiver"
    assert body["reviewed_by"] is not None


def test_list_and_filter_by_status(client, ctx):
    client.post(
        f"/api/v1/patients/{ctx['pid']}/memories",
        json={"text": "Likes tea at 4pm."}, headers=ctx["h"],
    )
    all_m = client.get(f"/api/v1/patients/{ctx['pid']}/memories", headers=ctx["h"]).json()
    assert len(all_m) == 1
    approved = client.get(
        f"/api/v1/patients/{ctx['pid']}/memories?status=approved", headers=ctx["h"]
    ).json()
    assert len(approved) == 1
    pending = client.get(
        f"/api/v1/patients/{ctx['pid']}/memories?status=pending", headers=ctx["h"]
    ).json()
    assert pending == []


def test_review_can_reject_and_reapprove(client, ctx):
    mid = client.post(
        f"/api/v1/patients/{ctx['pid']}/memories",
        json={"text": "Went to the park."}, headers=ctx["h"],
    ).json()["id"]

    rejected = client.post(
        f"/api/v1/memories/{mid}/review", json={"decision": "rejected"}, headers=ctx["h"]
    ).json()
    assert rejected["status"] == "rejected"

    approved = client.post(
        f"/api/v1/memories/{mid}/review", json={"decision": "approved"}, headers=ctx["h"]
    ).json()
    assert approved["status"] == "approved"


def test_update_memory_text(client, ctx):
    mid = client.post(
        f"/api/v1/patients/{ctx['pid']}/memories", json={"text": "old"}, headers=ctx["h"]
    ).json()["id"]
    r = client.patch(f"/api/v1/memories/{mid}", json={"text": "new text"}, headers=ctx["h"])
    assert r.json()["text"] == "new text"


def test_memory_rejects_person_from_other_patient(client, ctx):
    other_pid = client.post(
        "/api/v1/patients", json={"full_name": "Other"}, headers=ctx["h"]
    ).json()["id"]
    outsider = client.post(
        f"/api/v1/patients/{other_pid}/people",
        json={"display_name": "X", "relationship_label": "friend"}, headers=ctx["h"],
    ).json()["id"]
    r = client.post(
        f"/api/v1/patients/{ctx['pid']}/memories",
        json={"text": "hi", "person_id": outsider}, headers=ctx["h"],
    )
    assert r.status_code == 404


def test_stranger_cannot_see_memories(client, ctx, other_caregiver):
    client.post(f"/api/v1/patients/{ctx['pid']}/memories", json={"text": "secret"}, headers=ctx["h"])
    r = client.get(f"/api/v1/patients/{ctx['pid']}/memories", headers=other_caregiver)
    assert r.status_code == 404


def test_patient_sees_only_approved(client, ctx):
    m1 = client.post(
        f"/api/v1/patients/{ctx['pid']}/memories", json={"text": "approved one"}, headers=ctx["h"]
    ).json()["id"]
    m2 = client.post(
        f"/api/v1/patients/{ctx['pid']}/memories", json={"text": "will reject"}, headers=ctx["h"]
    ).json()["id"]
    client.post(f"/api/v1/memories/{m2}/review", json={"decision": "rejected"}, headers=ctx["h"])

    code = client.post(
        f"/api/v1/patients/{ctx['pid']}/devices", json={"label": "p"}, headers=ctx["h"]
    ).json()["pairing_code"]
    ptok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]

    mems = client.get(
        "/api/v1/patient/memories", headers={"Authorization": f"Bearer {ptok}"}
    ).json()
    texts = [m["text"] for m in mems]
    assert texts == ["approved one"]
    assert all("status" not in m for m in mems)  # trimmed view
    _ = m1
