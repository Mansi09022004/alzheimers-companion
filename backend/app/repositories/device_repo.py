"""Database access for patient devices."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.patient_device import PatientDevice


def create(db: Session, *, patient_id: int, label: str, code_hash: str, expires_at) -> PatientDevice:
    device = PatientDevice(
        patient_id=patient_id,
        label=label,
        pairing_code_hash=code_hash,
        pairing_expires_at=expires_at,
    )
    db.add(device)
    db.flush()
    return device


def get(db: Session, device_id: int) -> PatientDevice | None:
    return db.get(PatientDevice, device_id)


def get_by_code_hash(db: Session, code_hash: str) -> PatientDevice | None:
    return db.execute(
        select(PatientDevice).where(PatientDevice.pairing_code_hash == code_hash)
    ).scalar_one_or_none()


def get_by_jti(db: Session, jti: str) -> PatientDevice | None:
    return db.execute(
        select(PatientDevice).where(PatientDevice.token_jti == jti)
    ).scalar_one_or_none()


def list_for_patient(db: Session, patient_id: int) -> list[PatientDevice]:
    return list(
        db.execute(
            select(PatientDevice)
            .where(PatientDevice.patient_id == patient_id)
            .order_by(PatientDevice.created_at.desc())
        ).scalars()
    )
