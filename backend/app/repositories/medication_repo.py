"""Database access for medications and dose logs."""

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.medication import Medication, MedicationLog


def create(db: Session, **fields) -> Medication:
    med = Medication(**fields)
    db.add(med)
    db.flush()
    return med


def get(db: Session, medication_id: int) -> Medication | None:
    return db.get(Medication, medication_id)


def list_for_patient(db: Session, patient_id: int, *, active_only: bool = False) -> list[Medication]:
    stmt = select(Medication).where(Medication.patient_id == patient_id)
    if active_only:
        stmt = stmt.where(Medication.active.is_(True))
    return list(db.execute(stmt.order_by(Medication.name)).scalars())


def delete(db: Session, med: Medication) -> None:
    db.delete(med)


def logs_in_range(
    db: Session, patient_id: int, start: date, end: date
) -> list[MedicationLog]:
    stmt = (
        select(MedicationLog)
        .join(Medication, Medication.id == MedicationLog.medication_id)
        .where(
            Medication.patient_id == patient_id,
            MedicationLog.scheduled_date >= start,
            MedicationLog.scheduled_date <= end,
        )
    )
    return list(db.execute(stmt).scalars())


def get_log(db: Session, medication_id: int, d: date, t: str) -> MedicationLog | None:
    return db.execute(
        select(MedicationLog).where(
            MedicationLog.medication_id == medication_id,
            MedicationLog.scheduled_date == d,
            MedicationLog.scheduled_time == t,
        )
    ).scalar_one_or_none()


def upsert_log(db: Session, **fields) -> MedicationLog:
    existing = get_log(
        db, fields["medication_id"], fields["scheduled_date"], fields["scheduled_time"]
    )
    if existing:
        for k, v in fields.items():
            setattr(existing, k, v)
        db.add(existing)
        return existing
    log = MedicationLog(**fields)
    db.add(log)
    db.flush()
    return log
