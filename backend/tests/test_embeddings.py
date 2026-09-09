"""Memory embeddings + pgvector semantic search (using the fake provider)."""

import pytest

from app.core.database import SessionLocal
from app.models.memory import Memory
from app.repositories import memory_repo

pytestmark = pytest.mark.usefixtures("clean_db")


def _embedding_of(memory_id: int):
    with SessionLocal() as db:
        m = db.get(Memory, memory_id)
        return m.embedding, m.embedding_model


@pytest.fixture
def ctx(client, caregiver):
    headers, _ = caregiver
    pid = client.post("/api/v1/patients", json={"full_name": "Gp"}, headers=headers).json()["id"]
    return {"h": headers, "pid": pid}


def _add(client, ctx, text):
    return client.post(
        f"/api/v1/patients/{ctx['pid']}/memories", json={"text": text}, headers=ctx["h"]
    ).json()["id"]


def test_memory_gets_embedded_after_create(client, ctx):
    mid = _add(client, ctx, "Rahul visited on Sunday and brought mangoes.")
    vec, model = _embedding_of(mid)
    assert vec is not None and len(vec) == 768
    assert model == "fake"


def test_rejecting_a_memory_clears_its_embedding(client, ctx):
    mid = _add(client, ctx, "Went to the market.")
    assert _embedding_of(mid)[0] is not None
    client.post(f"/api/v1/memories/{mid}/review", json={"decision": "rejected"}, headers=ctx["h"])
    assert _embedding_of(mid)[0] is None


def test_editing_text_reembeds(client, ctx):
    mid = _add(client, ctx, "first version")
    first_vec = _embedding_of(mid)[0]
    client.patch(f"/api/v1/memories/{mid}", json={"text": "a completely different memory"}, headers=ctx["h"])
    new_vec = _embedding_of(mid)[0]
    assert new_vec is not None
    assert list(new_vec) != list(first_vec)


def test_semantic_search_ranks_relevant_memory_first(client, ctx):
    _add(client, ctx, "Rahul brought mangoes from the market on Sunday.")
    _add(client, ctx, "Meera cooked dal and rice for lunch.")
    _add(client, ctx, "The doctor changed the blood pressure tablet.")

    from app.services.ai import get_llm_provider

    q = get_llm_provider().embed("Tell me about Rahul and the mangoes")
    with SessionLocal() as db:
        hits = memory_repo.semantic_search(db, patient_id=ctx["pid"], query_vector=q, limit=3)

    assert "mangoes" in hits[0][0].text.lower()
    assert hits[0][1] > hits[-1][1]  # similarity descending


def test_search_excludes_rejected_and_unembedded(client, ctx):
    keep = _add(client, ctx, "Rahul plays cricket every weekend.")
    drop = _add(client, ctx, "Rahul plays cricket every weekend too.")
    client.post(f"/api/v1/memories/{drop}/review", json={"decision": "rejected"}, headers=ctx["h"])

    from app.services.ai import get_llm_provider

    q = get_llm_provider().embed("Rahul cricket")
    with SessionLocal() as db:
        ids = [m.id for m, _ in memory_repo.semantic_search(db, patient_id=ctx["pid"], query_vector=q)]
    assert keep in ids and drop not in ids
