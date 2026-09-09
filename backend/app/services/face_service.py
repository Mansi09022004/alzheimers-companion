"""Face registration (caregiver) and identification (patient).

Registration REQUIRES an active consent record for the person. Identification is
scoped to the patient's own registered people and applies a similarity floor —
below it, we say "not sure" rather than guess.
"""

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.models.patient_profile import PatientProfile
from app.models.person import Person
from app.models.user import User
from app.repositories import face_repo, person_repo
from app.services import vision_client
from app.services.access import require_patient_access
from app.services.media import validate_image as _validate_image


def _person_for_caregiver(db: Session, person_id: int, user: User) -> Person:
    person = person_repo.get(db, person_id)
    if person is None:
        raise NotFoundError("Person not found.")
    require_patient_access(db, person.patient_id, user)
    return person


# --- consent ------------------------------------------------------------

def grant_consent(db: Session, person_id: int, purpose: str, user: User):
    person = _person_for_caregiver(db, person_id, user)
    consent = face_repo.create_consent(
        db, patient_id=person.patient_id, person_id=person.id,
        granted_by=user.id, purpose=purpose,
    )
    db.commit()
    db.refresh(consent)
    return consent


def revoke_consent(db: Session, person_id: int, user: User) -> None:
    person = _person_for_caregiver(db, person_id, user)
    face_repo.revoke_consents(db, person.id)
    db.commit()


# --- face registration -------------------------------------------------

def register_face(
    db: Session, person_id: int, image: bytes, content_type: str | None, user: User
):
    person = _person_for_caregiver(db, person_id, user)
    ctype = _validate_image(content_type, image)

    if face_repo.active_consent(db, person.id) is None:
        raise PermissionDeniedError(
            "Record consent for this person before registering their face."
        )

    emb = vision_client.embed_face(image, ctype)
    row = face_repo.add_embedding(
        db, person_id=person.id, vector=emb.vector, model_version=emb.model_version,
        det_score=emb.det_score, created_by=user.id,
    )
    db.commit()
    db.refresh(row)
    return row


def list_faces(db: Session, person_id: int, user: User):
    person = _person_for_caregiver(db, person_id, user)
    return face_repo.list_for_person(db, person.id)


def delete_face(db: Session, face_id: int, user: User) -> None:
    row = face_repo.get(db, face_id)
    if row is None:
        raise NotFoundError("Face not found.")
    _person_for_caregiver(db, row.person_id, user)
    face_repo.delete(db, row)
    db.commit()


# --- identification (patient app) ------------------------------------

def identify(db: Session, patient: PatientProfile, image: bytes, content_type: str | None):
    ctype = _validate_image(content_type, image)
    emb = vision_client.embed_face(image, ctype)

    match = face_repo.nearest_person(db, patient_id=patient.id, query_vector=emb.vector)
    threshold = get_settings().face_match_threshold

    if match is None or match[3] < threshold:
        return {
            "matched": False,
            "similarity": None if match is None else round(match[3], 3),
            "message": "I'm not sure who this is. You could ask a family member.",
        }

    person_id, name, label, similarity = match
    return {
        "matched": True,
        "person_id": person_id,
        "display_name": name,
        "relationship_label": label,
        "similarity": round(similarity, 3),
        "message": f"This is {name}, your {label}.",
    }
