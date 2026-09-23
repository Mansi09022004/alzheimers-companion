"""The patient's own 'My Day' journal — written or spoken by them, about their day."""

import logging

from sqlalchemy.orm import Session

from app.models.patient_profile import PatientProfile
from app.repositories import journal_repo
from app.schemas.journal import JournalEntrySave
from app.services.ai import get_llm_provider
from app.services.ai.base import LLMError
from app.services.media import validate_audio

log = logging.getLogger(__name__)


def list_entries(db: Session, patient: PatientProfile):
    return journal_repo.list_for_patient(db, patient.id)


def save_entry(db: Session, patient: PatientProfile, data: JournalEntrySave):
    entry = journal_repo.upsert(db, patient.id, data.entry_date, data.text)
    db.commit()
    db.refresh(entry)
    return entry


def transcribe(audio: bytes, mime_type: str | None) -> str:
    """Speech -> text only, for filling in the journal's text box. No RAG, no reply —
    the patient reviews and edits the words themselves before saving."""
    validate_audio(mime_type, audio)
    try:
        return get_llm_provider().transcribe(audio, mime_type or "audio/m4a")
    except LLMError as exc:
        log.warning("journal transcription failed: %s", exc)
        return ""
