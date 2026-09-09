"""Memory business logic + the caregiver approve/reject workflow.

Caregiver-created memories are born `approved` — the caregiver is the source of truth.
The review step exists for `pending` memories (AI suggestions, Phase 18) and lets a
caregiver flip a memory's status at any time.
"""

import logging
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.exceptions import NotFoundError
from app.models.memory import Memory, MemorySource, MemoryStatus
from app.models.user import User
from app.repositories import memory_repo, person_repo
from app.schemas.memory import MemoryCreate, MemoryReview, MemoryUpdate
from app.services.access import require_patient_access
from app.services.ai import get_llm_provider
from app.services.ai.base import LLMError

log = logging.getLogger(__name__)


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
    if fields.get("text"):
        fields["text"] = fields["text"].strip()
        clear_embedding(db, memory)  # stale vector until the background re-embed lands
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
    if memory.status == MemoryStatus.rejected:
        # defence in depth: a rejected memory carries no retrievable vector
        clear_embedding(db, memory)
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


# --- embedding (runs as a FastAPI BackgroundTask, so it owns its own session) ---

def embed_memory_by_id(memory_id: int) -> None:
    """Embed a memory's text and store the vector. Best-effort: on failure the row
    keeps `embedding = NULL` and a later backfill can retry (`embedding IS NULL`)."""
    db = SessionLocal()
    try:
        memory = memory_repo.get(db, memory_id)
        if memory is None or memory.status != MemoryStatus.approved:
            return
        provider = get_llm_provider()
        try:
            vector = provider.embed(memory.text)
        except LLMError as exc:
            log.warning("embedding failed for memory %s: %s", memory_id, exc)
            return
        memory.embedding = vector
        memory.embedding_model = get_settings_model_name()
        db.add(memory)
        db.commit()
    finally:
        db.close()


def clear_embedding(db: Session, memory: Memory) -> None:
    memory.embedding = None
    memory.embedding_model = None
    db.add(memory)


def get_settings_model_name() -> str:
    from app.core.config import get_settings

    s = get_settings()
    return "fake" if s.llm_provider == "fake" else s.gemini_embed_model
