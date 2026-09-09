"""Database access for patient profiles and caregiver links."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.patient_caregiver import AccessLevel, PatientCaregiver
from app.models.patient_profile import PatientProfile
from app.models.user import User


def create(db: Session, *, data: dict, created_by: int) -> PatientProfile:
    patient = PatientProfile(**data, created_by=created_by)
    db.add(patient)
    db.flush()
    return patient


def get(db: Session, patient_id: int) -> PatientProfile | None:
    return db.get(PatientProfile, patient_id)


def list_for_caregiver(db: Session, caregiver_id: int) -> list[PatientProfile]:
    stmt = (
        select(PatientProfile)
        .join(PatientCaregiver, PatientCaregiver.patient_id == PatientProfile.id)
        .where(PatientCaregiver.caregiver_id == caregiver_id)
        .order_by(PatientProfile.full_name)
    )
    return list(db.execute(stmt).scalars())


def get_link(db: Session, patient_id: int, caregiver_id: int) -> PatientCaregiver | None:
    return db.execute(
        select(PatientCaregiver).where(
            PatientCaregiver.patient_id == patient_id,
            PatientCaregiver.caregiver_id == caregiver_id,
        )
    ).scalar_one_or_none()


def add_link(
    db: Session, *, patient_id: int, caregiver_id: int, access_level: AccessLevel
) -> PatientCaregiver:
    link = PatientCaregiver(
        patient_id=patient_id, caregiver_id=caregiver_id, access_level=access_level
    )
    db.add(link)
    db.flush()
    return link


def list_links(db: Session, patient_id: int) -> list[tuple[PatientCaregiver, User]]:
    stmt = (
        select(PatientCaregiver, User)
        .join(User, User.id == PatientCaregiver.caregiver_id)
        .where(PatientCaregiver.patient_id == patient_id)
        .order_by(User.full_name)
    )
    return list(db.execute(stmt).all())


def delete(db: Session, patient: PatientProfile) -> None:
    db.delete(patient)
