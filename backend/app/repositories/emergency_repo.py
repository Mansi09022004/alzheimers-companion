"""Database access for emergency contacts."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.emergency_contact import EmergencyContact


def create(db: Session, **fields) -> EmergencyContact:
    contact = EmergencyContact(**fields)
    db.add(contact)
    db.flush()
    return contact


def get(db: Session, contact_id: int) -> EmergencyContact | None:
    return db.get(EmergencyContact, contact_id)


def list_for_patient(db: Session, patient_id: int) -> list[EmergencyContact]:
    return list(
        db.execute(
            select(EmergencyContact)
            .where(EmergencyContact.patient_id == patient_id)
            .order_by(EmergencyContact.priority, EmergencyContact.name)
        ).scalars()
    )


def delete(db: Session, contact: EmergencyContact) -> None:
    db.delete(contact)
