"""Database access for memories."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.memory import Memory, MemoryStatus


def create(db: Session, **fields) -> Memory:
    memory = Memory(**fields)
    db.add(memory)
    db.flush()
    return memory


def get(db: Session, memory_id: int) -> Memory | None:
    return db.get(Memory, memory_id)


def list_for_patient(
    db: Session, patient_id: int, *, status: MemoryStatus | None = None
) -> list[Memory]:
    stmt = select(Memory).where(Memory.patient_id == patient_id)
    if status is not None:
        stmt = stmt.where(Memory.status == status)
    stmt = stmt.order_by(Memory.memory_date.desc().nullslast(), Memory.created_at.desc())
    return list(db.execute(stmt).scalars())


def delete(db: Session, memory: Memory) -> None:
    db.delete(memory)


def count_unembedded(db: Session, patient_id: int) -> int:
    from sqlalchemy import func

    return db.execute(
        select(func.count())
        .select_from(Memory)
        .where(
            Memory.patient_id == patient_id,
            Memory.status == MemoryStatus.approved,
            Memory.embedding.is_(None),
        )
    ).scalar_one()


def semantic_search(
    db: Session,
    *,
    patient_id: int,
    query_vector: list[float],
    limit: int = 5,
    person_id: int | None = None,
) -> list[tuple[Memory, float]]:
    """Approved, embedded memories for this patient, closest first.

    Returns (memory, cosine_similarity). The caller applies a similarity floor —
    this is how irrelevant memories are kept out of the RAG context.
    """
    distance = Memory.embedding.cosine_distance(query_vector)
    stmt = (
        select(Memory, distance.label("distance"))
        .where(
            Memory.patient_id == patient_id,
            Memory.status == MemoryStatus.approved,
            Memory.embedding.isnot(None),
        )
        .order_by(distance)
        .limit(limit)
    )
    if person_id is not None:
        stmt = stmt.where(Memory.person_id == person_id)
    rows = db.execute(stmt).all()
    return [(m, 1.0 - float(d)) for m, d in rows]
