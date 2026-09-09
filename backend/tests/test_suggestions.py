"""AI memory suggestions — proposed as pending, approved by the caregiver."""

import pytest

pytestmark = pytest.mark.usefixtures("clean_db")


@pytest.fixture
def ctx(client, caregiver):
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Gp"}, headers=h).json()["id"]
    return {"h": h, "pid": pid}


def test_suggest_creates_pending_ai_memories(client, ctx):
    notes = "Rahul got a new job at a school. She loves ginger chai in the afternoon."
    r = client.post(
        f"/api/v1/patients/{ctx['pid']}/memories/suggest",
        json={"notes": notes}, headers=ctx["h"],
    )
    assert r.status_code == 201
    made = r.json()
    assert len(made) >= 2
    assert all(m["status"] == "pending" and m["source"] == "ai_suggestion" for m in made)


def test_suggestions_do_not_reach_rag_until_approved(client, ctx):
    made = client.post(
        f"/api/v1/patients/{ctx['pid']}/memories/suggest",
        json={"notes": "Rahul brought mangoes on Sunday."}, headers=ctx["h"],
    ).json()

    code = client.post(f"/api/v1/patients/{ctx['pid']}/devices", json={"label": "p"}, headers=ctx["h"]).json()["pairing_code"]
    ptok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    PH = {"Authorization": f"Bearer {ptok}"}

    # not grounded yet — the pending memory has no embedding
    before = client.post("/api/v1/patient/ask", json={"question": "Rahul mangoes Sunday"}, headers=PH).json()
    assert before["grounded"] is False

    client.post(f"/api/v1/memories/{made[0]['id']}/review", json={"decision": "approved"}, headers=ctx["h"])

    after = client.post("/api/v1/patient/ask", json={"question": "Rahul mangoes Sunday"}, headers=PH).json()
    assert after["grounded"] is True


def test_suggest_skips_duplicates(client, ctx):
    client.post(
        f"/api/v1/patients/{ctx['pid']}/memories",
        json={"text": "Rahul brought mangoes on Sunday"}, headers=ctx["h"],
    )
    made = client.post(
        f"/api/v1/patients/{ctx['pid']}/memories/suggest",
        json={"notes": "Rahul brought mangoes on Sunday"}, headers=ctx["h"],
    ).json()
    assert made == []


def test_only_caregiver_with_access_can_suggest(client, ctx, other_caregiver):
    r = client.post(
        f"/api/v1/patients/{ctx['pid']}/memories/suggest",
        json={"notes": "anything"}, headers=other_caregiver,
    )
    assert r.status_code == 404
