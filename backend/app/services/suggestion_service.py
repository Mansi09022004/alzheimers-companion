"""AI memory suggestions.

A caregiver pastes notes (or a chat/voice transcript); the LLM extracts candidate
memories; each is stored as `status=pending`, `source=ai_suggestion`, with the
excerpt it came from in `memory_sources`. Nothing reaches the RAG pipeline until a
caregiver approves it — the differentiator: the AI proposes, the caregiver decides.
"""

import logging

from sqlalchemy.orm import Session

from app.core.exceptions import AiUnavailableError
from app.models.memory import Memory, MemorySource, MemoryStatus
from app.models.memory_source import MemoryOrigin, MemorySourceRecord
from app.models.user import User
from app.repositories import memory_repo
from app.services.access import require_patient_access
from app.services.ai import get_llm_provider
from app.services.ai.base import LLMError

log = logging.getLogger(__name__)

MAX_SUGGESTIONS = 15


def suggest_memories(
    db: Session, patient_id: int, notes: str, origin: MemoryOrigin, user: User
) -> list[Memory]:
    require_patient_access(db, patient_id, user)

    try:
        candidates = get_llm_provider().extract_memories(notes)
    except LLMError as exc:
        log.warning("memory extraction failed: %s", exc)
        # Distinct from "the AI found nothing" (an empty `candidates` list below) —
        # the provider itself failed, so say that plainly instead of returning []
        # and letting the caller read it as "no memories in that text".
        raise AiUnavailableError(
            "The AI assistant is temporarily unavailable. Please try again in a few minutes."
        ) from exc

    existing = {
        m.text.strip().lower()
        for m in memory_repo.list_for_patient(db, patient_id)
    }

    created: list[Memory] = []
    for cand in candidates[:MAX_SUGGESTIONS]:
        text = (cand.get("memory") or "").strip()
        if not text or text.lower() in existing:
            continue
        memory = memory_repo.create(
            db,
            patient_id=patient_id,
            person_id=None,
            text=text,
            memory_date=None,
            status=MemoryStatus.pending,
            source=MemorySource.ai_suggestion,
            created_by=user.id,
            reviewed_by=None,
            reviewed_at=None,
        )
        db.add(
            MemorySourceRecord(
                memory_id=memory.id,
                origin=origin,
                raw_excerpt=(cand.get("excerpt") or text)[:2000],
            )
        )
        existing.add(text.lower())
        created.append(memory)

    db.commit()
    for m in created:
        db.refresh(m)
    return created
