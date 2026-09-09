"""The Context Engine — the product's differentiator.

It stitches together the pieces the patient app needs into ONE short, calm, grounded
sentence:

  who_is_this   : face match  + relationship + recent memories about that person
  why_am_i_here : time of day  + home        + a recent memory   (meds/routine join in
                  Phase 10/12)
  memory_moment : one gentle approved memory, phrased kindly

Every message is built from real data and, where the LLM is involved, the model may
only use what we hand it. If we cannot ground an answer, we say so.
"""

import logging

from sqlalchemy.orm import Session

from app.models.memory import MemoryStatus
from app.models.patient_profile import PatientProfile
from app.models.person import Person
from app.repositories import face_repo, memory_repo, person_repo
from app.services import vision_client
from app.services.ai import get_llm_provider
from app.services.ai.base import LLMError
from app.services.media import validate_image

log = logging.getLogger(__name__)

_NOT_RECOGNISED = "I don't recognise this person. You could ask a family member."


def _part_of_day(hour: int) -> str:
    if 5 <= hour < 12:
        return "morning"
    if 12 <= hour < 17:
        return "afternoon"
    if 17 <= hour < 21:
        return "evening"
    return "night"


def _person_relationship_notes(db: Session, person: Person) -> list[str]:
    people = {p.id: p for p in person_repo.list_for_patient(db, person.patient_id)}
    notes: list[str] = []
    for rel in person_repo.list_relationships(db, person.patient_id):
        if rel.from_person_id == person.id and rel.to_person_id in people:
            notes.append(f"{person.display_name} is the {rel.relationship.value} of "
                         f"{people[rel.to_person_id].display_name}")
        elif rel.to_person_id == person.id and rel.from_person_id in people:
            notes.append(f"{people[rel.from_person_id].display_name} is the "
                         f"{rel.relationship.value} of {person.display_name}")
    return notes


def who_is_this(
    db: Session, patient: PatientProfile, image: bytes, content_type: str | None
) -> dict:
    ctype = validate_image(content_type, image)
    emb = vision_client.embed_face(image, ctype)

    match = face_repo.nearest_person(db, patient_id=patient.id, query_vector=emb.vector)
    from app.core.config import get_settings

    if match is None or match[3] < get_settings().face_match_threshold:
        return {"matched": False, "message": _NOT_RECOGNISED, "sources": []}

    person_id, name, label, similarity = match
    person = person_repo.get(db, person_id)
    memories = [
        m for m in memory_repo.list_for_patient(db, patient.id, status=MemoryStatus.approved)
        if m.person_id == person_id
    ][:3]
    rel_notes = _person_relationship_notes(db, person)

    message = f"This is {name}, your {label}."
    facts = []
    if person.short_bio:
        facts.append(person.short_bio)
    facts.extend(rel_notes)
    facts.extend(m.text for m in memories)

    if facts:
        try:
            provider = get_llm_provider()
            prompt = (
                f"Person: {name} ({label})\n"
                + "Facts:\n" + "\n".join(f"- {f}" for f in facts)
                + "\n\nIn two short, warm sentences, tell the patient who this is and one "
                "recent thing about them. Start with 'This is'."
            )
            message = provider.generate(_SYSTEM_CALM, prompt) or message
        except LLMError as exc:
            log.warning("who_is_this generation fell back: %s", exc)

    return {
        "matched": True,
        "person_id": person_id,
        "display_name": name,
        "relationship_label": label,
        "similarity": round(similarity, 3),
        "message": message,
        "sources": [{"memory_id": m.id, "text": m.text, "memory_date": m.memory_date} for m in memories],
    }


def why_am_i_here(db: Session, patient: PatientProfile, local_dt) -> dict:
    from datetime import UTC, datetime

    from app.services import medication_service, routine_service

    now = local_dt or datetime.now(UTC)
    part = _part_of_day(now.hour)
    place = patient.home_label or "home"
    recent = memory_repo.list_for_patient(db, patient.id, status=MemoryStatus.approved)[:1]
    med_hint = medication_service.next_dose_hint(db, patient, now)
    routine_hint = routine_service.next_routine_hint(db, patient, now)

    bits = [f"You are at {place}.", f"It is {part}."]
    if med_hint:
        bits.append(med_hint)
    if routine_hint:
        bits.append(routine_hint)

    facts = list(bits)
    if recent:
        facts.append(f"A recent memory: {recent[0].text}")

    message = " ".join(bits)
    try:
        provider = get_llm_provider()
        prompt = "Facts:\n" + "\n".join(f"- {f}" for f in facts) + (
            "\n\nReassure the patient in two short, calm sentences about where they are "
            "and what time it is. Do not invent anything."
        )
        message = provider.generate(_SYSTEM_CALM, prompt) or message
    except LLMError as exc:
        log.warning("why_am_i_here generation fell back: %s", exc)

    return {"message": message, "place": place, "part_of_day": part or None}


def memory_moment(db: Session, patient: PatientProfile) -> dict:
    import random

    approved = memory_repo.list_for_patient(db, patient.id, status=MemoryStatus.approved)
    if not approved:
        return {"available": False, "message": "", "memory_id": None}

    memory = random.choice(approved[:20])  # bias toward the 20 most recent
    message = f"Do you remember? {memory.text}"
    try:
        provider = get_llm_provider()
        message = provider.generate(
            _SYSTEM_CALM,
            f"Memory: {memory.text}\n\nShare this gently with the patient in one warm "
            "sentence, as a happy reminder. Do not add facts.",
        ) or message
    except LLMError as exc:
        log.warning("memory_moment generation fell back: %s", exc)

    return {
        "available": True,
        "message": message,
        "memory_id": memory.id,
        "memory_date": memory.memory_date,
    }


_SYSTEM_CALM = (
    "You are a calm, warm companion for a person living with dementia. "
    "Use only the facts given. Never invent names, dates, or events. "
    "Keep it to one or two short, simple, reassuring sentences."
)
