"""RAG memory assistant: retrieval, similarity floor, source attribution, person scoping."""

import pytest

pytestmark = pytest.mark.usefixtures("clean_db")


@pytest.fixture
def patient_app(client, caregiver):
    """A patient with a few approved memories + a paired device. Returns patient headers."""
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Grandpa"}, headers=h).json()["id"]
    rahul = client.post(
        f"/api/v1/patients/{pid}/people",
        json={"display_name": "Rahul", "relationship_label": "son"}, headers=h,
    ).json()["id"]
    meera = client.post(
        f"/api/v1/patients/{pid}/people",
        json={"display_name": "Meera", "relationship_label": "daughter"}, headers=h,
    ).json()["id"]

    def add(text, person_id=None):
        client.post(
            f"/api/v1/patients/{pid}/memories",
            json={"text": text, "person_id": person_id}, headers=h,
        )

    add("Rahul brought mangoes from the market on Sunday.", rahul)
    add("Rahul lives in Pune and works as a teacher.", rahul)
    add("Meera visited with her children during Diwali.", meera)
    add("The garden roses were blooming this spring.")

    code = client.post(
        f"/api/v1/patients/{pid}/devices", json={"label": "phone"}, headers=h
    ).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    return {"Authorization": f"Bearer {tok}"}, h, pid


def test_grounded_answer_returns_sources(client, patient_app):
    ph, *_ = patient_app
    r = client.post("/api/v1/patient/ask", json={"question": "Tell me about Rahul and mangoes"}, headers=ph)
    assert r.status_code == 200
    body = r.json()
    assert body["grounded"] is True
    assert len(body["sources"]) >= 1
    assert any("mango" in s["text"].lower() for s in body["sources"])


def test_irrelevant_question_says_not_sure(client, patient_app):
    ph, *_ = patient_app
    body = client.post(
        "/api/v1/patient/ask",
        json={"question": "quantum physics telescope engine"}, headers=ph,
    ).json()
    assert body["grounded"] is False
    assert body["sources"] == []
    assert "not sure" in body["answer"].lower()


def test_question_naming_a_person_is_scoped_to_them(client, patient_app):
    ph, *_ = patient_app
    body = client.post(
        "/api/v1/patient/ask",
        json={"question": "Tell me about Rahul mangoes market Sunday"}, headers=ph,
    ).json()
    assert body["grounded"] is True
    # every source must be a Rahul memory (Meera / garden memories excluded by scoping)
    assert all("rahul" in s["text"].lower() for s in body["sources"])


def test_only_approved_memories_are_used(client, patient_app):
    ph, h, pid = patient_app
    # add + then reject a memory that would otherwise match
    mid = client.post(
        f"/api/v1/patients/{pid}/memories",
        json={"text": "Rahul secretly hates mangoes."}, headers=h,
    ).json()["id"]
    client.post(f"/api/v1/memories/{mid}/review", json={"decision": "rejected"}, headers=h)

    body = client.post(
        "/api/v1/patient/ask", json={"question": "Does Rahul like mangoes"}, headers=ph
    ).json()
    assert all(s["memory_id"] != mid for s in body["sources"])


def test_caregiver_can_preview_the_answer(client, patient_app):
    _, h, pid = patient_app
    r = client.post(
        f"/api/v1/patients/{pid}/ask", json={"question": "Tell me about Rahul"}, headers=h
    )
    assert r.status_code == 200
    assert "grounded" in r.json()


def test_ask_requires_auth(client):
    assert client.post("/api/v1/patient/ask", json={"question": "hi"}).status_code == 401


def test_known_relationship_answers_even_without_a_linked_memory(client, caregiver):
    """A person's relationship is caregiver-verified People data, not a free-text
    memory — the assistant should be able to state it even when no memory happens
    to be linked to that person yet."""
    h, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Grandpa"}, headers=h).json()["id"]
    client.post(
        f"/api/v1/patients/{pid}/people",
        json={"display_name": "Priya", "relationship_label": "wife"}, headers=h,
    )
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "phone"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    ph = {"Authorization": f"Bearer {tok}"}

    body = client.post("/api/v1/patient/ask", json={"question": "who is priya"}, headers=ph).json()
    assert body["grounded"] is True
    assert "wife" in body["answer"].lower()
