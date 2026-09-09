"""Caregiver-side memory management + approve/reject workflow.

Memories are embedded asynchronously: the write returns immediately and a
BackgroundTask fills `embedding` right after (see memory_service.embed_memory_by_id).
"""

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.memory import MemoryStatus
from app.models.user import User, UserRole
from app.models.memory_source import MemoryOrigin
from app.schemas.memory import (
    MemoryCreate,
    MemoryResponse,
    MemoryReview,
    MemoryUpdate,
    SuggestRequest,
)
from app.services import memory_service, suggestion_service

_caregiver = require_role(UserRole.caregiver)

patient_memories_router = APIRouter(prefix="/patients/{patient_id}", tags=["memories"])
memories_router = APIRouter(prefix="/memories", tags=["memories"])


@patient_memories_router.post(
    "/memories", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED
)
def add_memory(
    patient_id: int,
    data: MemoryCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    memory = memory_service.add_memory(db, patient_id, data, user)
    background.add_task(memory_service.embed_memory_by_id, memory.id)
    return memory


@patient_memories_router.post(
    "/memories/suggest", response_model=list[MemoryResponse], status_code=status.HTTP_201_CREATED
)
def suggest_memories(
    patient_id: int,
    data: SuggestRequest,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    """Paste notes → the AI proposes memories as `pending` for you to approve/reject.
    They are embedded (and become retrievable) only once a caregiver approves them."""
    return suggestion_service.suggest_memories(
        db, patient_id, data.notes, MemoryOrigin(data.origin), user
    )


@patient_memories_router.get("/memories", response_model=list[MemoryResponse])
def list_memories(
    patient_id: int,
    status: MemoryStatus | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return memory_service.list_memories(db, patient_id, user, status=status)


@memories_router.patch("/{memory_id}", response_model=MemoryResponse)
def update_memory(
    memory_id: int,
    data: MemoryUpdate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    memory = memory_service.update_memory(db, memory_id, data, user)
    if data.text is not None:  # text changed -> re-embed
        background.add_task(memory_service.embed_memory_by_id, memory.id)
    return memory


@memories_router.post("/{memory_id}/review", response_model=MemoryResponse)
def review_memory(
    memory_id: int,
    data: MemoryReview,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    memory = memory_service.review_memory(db, memory_id, data, user)
    if memory.status == MemoryStatus.approved and memory.embedding is None:
        background.add_task(memory_service.embed_memory_by_id, memory.id)
    return memory


@memories_router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_memory(
    memory_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    memory_service.delete_memory(db, memory_id, user)
