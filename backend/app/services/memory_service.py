"""Memory business logic + the caregiver approve/reject workflow.

Caregiver-created memories are born `approved` — the caregiver is the source of truth.
The review step exists for `pending` memories (AI suggestions, Phase 18) and lets a
caregiver flip a memory's status at any time.
"""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.memory import Memory, MemorySource, MemoryStatus
from app.models.user import User
from app.repositories import memory_repo, person_repo
from app.schemas.memory import MemoryCreate, MemoryReview, MemoryUpdate
from app.services.access import require_patient_access


def _check_person_belongs(db: Session, person_id: int | None, patient_id: int) -> None:
    if person_id is None:
        return
    person = person_repo.get(db, person_id)
    if person is None or person.patient_id != patient_id:
        raise NotFoundError("That person does not belong to this patient.")


def add_memory(db: Session, patient_id: int, data: MemoryCreate, user: User) -> Memory:
    require_patient_access(db, patient_id, user)
    _check_person_belongs(db, data.person_id, patient_id)
    memory = memory_repo.create(
        db,
        patient_id=patient_id,
        person_id=data.person_id,
        text=data.text.strip(),
        memory_date=data.memory_date,
        status=MemoryStatus.approved,
        source=MemorySource.caregiver,
        created_by=user.id,
        reviewed_by=user.id,
        reviewed_at=datetime.now(UTC),
    )
    db.commit()
    db.refresh(memory)
    return memory


def list_memories(
    db: Session, patient_id: int, user: User, *, status: MemoryStatus | None = None
) -> list[Memory]:
    require_patient_access(db, patient_id, user)
    return memory_repo.list_for_patient(db, patient_id, status=status)


def _get_for_user(db: Session, memory_id: int, user: User) -> Memory:
    memory = memory_repo.get(db, memory_id)
    if memory is None:
        raise NotFoundError("Memory not found.")
    require_patient_access(db, memory.patient_id, user)
    return memory


def update_memory(db: Session, memory_id: int, data: MemoryUpdate, user: User) -> Memory:
    memory = _get_for_user(db, memory_id, user)
    fields = data.model_dump(exclude_unset=True)
    if "person_id" in fields:
        _check_person_belongs(db, fields["person_id"], memory.patient_id)
    if "text" in fields and fields["text"] is not None:
        fields["text"] = fields["text"].strip()
    for k, v in fields.items():
        setattr(memory, k, v)
    db.commit()
    db.refresh(memory)
    return memory


def review_memory(db: Session, memory_id: int, data: MemoryReview, user: User) -> Memory:
    memory = _get_for_user(db, memory_id, user)
    memory.status = MemoryStatus(data.decision)
    memory.reviewed_by = user.id
    memory.reviewed_at = datetime.now(UTC)
    db.commit()
    db.refresh(memory)
    return memory


def delete_memory(db: Session, memory_id: int, user: User) -> None:
    memory = _get_for_user(db, memory_id, user)
    memory_repo.delete(db, memory)
    db.commit()


def list_approved_for_patient(db: Session, patient_id: int) -> list[Memory]:
    """Patient-app view — approved memories only."""
    return memory_repo.list_for_patient(db, patient_id, status=MemoryStatus.approved)
