"""Patient profile + caregiver-link business logic."""

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.patient_caregiver import AccessLevel
from app.models.user import User, UserRole
from app.repositories import patient_repo, user_repo
from app.schemas.patient import PatientCreate, PatientUpdate
from app.services.access import require_patient_access


def create_patient(db: Session, data: PatientCreate, creator: User) -> dict:
    patient = patient_repo.create(
        db, data=data.model_dump(exclude_unset=True), created_by=creator.id
    )
    # The creator automatically becomes an OWNER caregiver of the new patient.
    patient_repo.add_link(
        db, patient_id=patient.id, caregiver_id=creator.id, access_level=AccessLevel.owner
    )
    db.commit()
    db.refresh(patient)
    return _to_response(patient, AccessLevel.owner)


def list_patients(db: Session, caregiver: User) -> list[dict]:
    patients = patient_repo.list_for_caregiver(db, caregiver.id)
    out: list[dict] = []
    for p in patients:
        link = patient_repo.get_link(db, p.id, caregiver.id)
        out.append(_to_response(p, link.access_level))  # link is guaranteed by the query
    return out


def get_patient(db: Session, patient_id: int, caregiver: User) -> dict:
    access = require_patient_access(db, patient_id, caregiver)
    return _to_response(access.patient, access.link.access_level)


def update_patient(
    db: Session, patient_id: int, data: PatientUpdate, caregiver: User
) -> dict:
    access = require_patient_access(db, patient_id, caregiver)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(access.patient, field, value)
    db.commit()
    db.refresh(access.patient)
    return _to_response(access.patient, access.link.access_level)


def set_photo(db: Session, patient_id: int, content_type: str | None, data: bytes, caregiver: User) -> dict:
    from app.services import photo_service

    access = require_patient_access(db, patient_id, caregiver)
    access.patient.photo_url = photo_service.save_photo("patients", patient_id, content_type, data)
    db.commit()
    db.refresh(access.patient)
    return _to_response(access.patient, access.link.access_level)


def delete_patient(db: Session, patient_id: int, caregiver: User) -> None:
    access = require_patient_access(db, patient_id, caregiver, owner_only=True)
    patient_repo.delete(db, access.patient)
    db.commit()


def add_caregiver(
    db: Session, patient_id: int, email: str, access_level: AccessLevel, caregiver: User
) -> dict:
    require_patient_access(db, patient_id, caregiver, owner_only=True)

    new_caregiver = user_repo.get_by_email(db, email)
    if new_caregiver is None or new_caregiver.role != UserRole.caregiver:
        raise NotFoundError("No caregiver account with that email.")
    if patient_repo.get_link(db, patient_id, new_caregiver.id) is not None:
        raise ConflictError("That caregiver already has access to this patient.")

    patient_repo.add_link(
        db, patient_id=patient_id, caregiver_id=new_caregiver.id, access_level=access_level
    )
    db.commit()
    return {
        "caregiver_id": new_caregiver.id,
        "email": new_caregiver.email,
        "full_name": new_caregiver.full_name,
        "access_level": access_level,
    }


def list_caregivers(db: Session, patient_id: int, caregiver: User) -> list[dict]:
    require_patient_access(db, patient_id, caregiver)
    rows = patient_repo.list_links(db, patient_id)
    return [
        {
            "caregiver_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "access_level": link.access_level,
        }
        for link, user in rows
    ]


def _to_response(patient, access_level: AccessLevel) -> dict:
    return {
        "id": patient.id,
        "full_name": patient.full_name,
        "date_of_birth": patient.date_of_birth,
        "notes": patient.notes,
        "home_label": patient.home_label,
        "home_lat": patient.home_lat,
        "home_lng": patient.home_lng,
        "timezone": patient.timezone,
        "photo_url": patient.photo_url,
        "created_by": patient.created_by,
        "my_access": access_level,
    }
