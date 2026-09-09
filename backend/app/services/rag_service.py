"""RAG memory assistant.

Pipeline:
  question
    -> embed
    -> pgvector similarity search over THIS patient's approved+embedded memories
       (scoped to one person when the question clearly names them)
    -> drop matches below the similarity floor   <-- keeps irrelevant memories out
    -> if nothing left: return "I'm not sure" (never guess)
    -> else: build a prompt = system rules + the retrieved memories + the question
    -> LLM generates a short, calm answer
    -> return answer + the exact memories used (source attribution)

This is deliberately NOT a general chatbot: the model may only use the memories we
hand it, and every answer is traceable to specific rows.
"""

import logging
import re

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.memory import Memory
from app.models.patient_profile import PatientProfile
from app.repositories import memory_repo, person_repo
from app.services.ai import get_llm_provider
from app.services.ai.base import LLMError

_SYSTEM = (
    "You are a calm, warm assistant for a person living with dementia. "
    "Answer in one or two short, simple sentences. "
    "Use ONLY the information in the memories provided below. "
    "If the memories do not contain the answer, say you are not sure and suggest "
    "asking a family member. Never guess names, relationships, dates, or events."
)

_NOT_SURE = "I'm not sure about that. You could ask a family member."

log = logging.getLogger(__name__)


def _match_person_id(db: Session, patient_id: int, question: str) -> int | None:
    """If the question clearly names exactly one registered person, return their id."""
    words = set(re.findall(r"[a-z]+", question.lower()))
    hits = [
        p.id
        for p in person_repo.list_for_patient(db, patient_id)
        if p.display_name.split()[0].lower() in words
    ]
    return hits[0] if len(hits) == 1 else None


def _build_prompt(question: str, memories: list[tuple[Memory, float]]) -> str:
    lines = ["Memories:"]
    for i, (m, _sim) in enumerate(memories, 1):
        when = f" ({m.memory_date.isoformat()})" if m.memory_date else ""
        lines.append(f"{i}.{when} {m.text}")
    lines.append(f"\nQuestion: {question}")
    return "\n".join(lines)


def ask_voice(db: Session, patient: PatientProfile, audio: bytes, mime_type: str) -> dict:
    """Speech-to-text, then the normal RAG flow. Returns the transcript too."""
    from app.services.media import validate_audio

    validate_audio(mime_type, audio)
    provider = get_llm_provider()
    try:
        transcript = provider.transcribe(audio, mime_type)
    except LLMError as exc:
        log.warning("voice transcription failed: %s", exc)
        return {
            "transcript": "",
            "answer": "Sorry, I couldn't hear that. Please try again.",
            "grounded": False,
            "sources": [],
        }
    result = ask(db, patient, transcript)
    result["transcript"] = transcript
    return result


def ask(db: Session, patient: PatientProfile, question: str) -> dict:
    settings = get_settings()
    provider = get_llm_provider()

    try:
        q_vec = provider.embed(question)
    except LLMError:
        return {"answer": _NOT_SURE, "grounded": False, "sources": []}

    person_id = _match_person_id(db, patient.id, question)
    hits = memory_repo.semantic_search(
        db,
        patient_id=patient.id,
        query_vector=q_vec,
        limit=settings.rag_top_k,
        person_id=person_id,
    )
    relevant = [(m, s) for m, s in hits if s >= settings.rag_similarity_floor]

    if not relevant:
        return {"answer": _NOT_SURE, "grounded": False, "sources": []}

    try:
        answer = provider.generate(_SYSTEM, _build_prompt(question, relevant))
    except LLMError as exc:
        log.warning("RAG generation failed, returning fallback: %s", exc)
        answer = _NOT_SURE

    return {
        "answer": answer or _NOT_SURE,
        "grounded": True,
        "sources": [
            {
                "memory_id": m.id,
                "text": m.text,
                "memory_date": m.memory_date,
                "similarity": round(s, 3),
            }
            for m, s in relevant
        ],
    }
