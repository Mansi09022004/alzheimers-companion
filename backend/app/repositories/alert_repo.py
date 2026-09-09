"""Database access for caregiver alerts."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.alert import Alert


def create(db: Session, **fields) -> Alert:
    alert = Alert(**fields)
    db.add(alert)
    db.flush()
    return alert


def get(db: Session, alert_id: int) -> Alert | None:
    return db.get(Alert, alert_id)


def list_for_patient(
    db: Session, patient_id: int, *, unacknowledged_only: bool, limit: int
) -> list[Alert]:
    stmt = select(Alert).where(Alert.patient_id == patient_id)
    if unacknowledged_only:
        stmt = stmt.where(Alert.acknowledged_at.is_(None))
    return list(db.execute(stmt.order_by(Alert.created_at.desc()).limit(limit)).scalars())
