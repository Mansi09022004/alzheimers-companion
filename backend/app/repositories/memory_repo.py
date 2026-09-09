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
