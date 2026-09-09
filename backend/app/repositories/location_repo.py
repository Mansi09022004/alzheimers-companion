"""Database access for location pings."""

from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.location import Location


def add(db: Session, **fields) -> Location:
    row = Location(**fields)
    db.add(row)
    db.flush()
    return row


def latest(db: Session, patient_id: int) -> Location | None:
    return db.execute(
        select(Location)
        .where(Location.patient_id == patient_id)
        .order_by(Location.recorded_at.desc())
        .limit(1)
    ).scalars().first()


def history(
    db: Session, patient_id: int, *, since: datetime, limit: int
) -> list[Location]:
    return list(
        db.execute(
            select(Location)
            .where(Location.patient_id == patient_id, Location.recorded_at >= since)
            .order_by(Location.recorded_at.desc())
            .limit(limit)
        ).scalars()
    )


def prune_before(db: Session, cutoff: datetime) -> int:
    result = db.execute(delete(Location).where(Location.recorded_at < cutoff))
    return result.rowcount or 0
