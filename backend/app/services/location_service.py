"""Location reporting (patient device) and reading (caregiver).

Retention is enforced opportunistically: roughly 1 report in 40 also prunes rows
older than `location_retention_days`. A scheduled job replaces this in Phase 16.
"""

import random
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.location import Location
from app.models.patient_profile import PatientProfile
from app.models.user import User
from app.repositories import location_repo
from app.schemas.location import LocationReport
from app.services.access import require_patient_access


def report(db: Session, patient: PatientProfile, data: LocationReport) -> Location:
    row = location_repo.add(
        db,
        patient_id=patient.id,
        lat=data.lat,
        lng=data.lng,
        accuracy_m=data.accuracy_m,
        recorded_at=data.recorded_at or datetime.now(UTC),
    )
    if random.random() < 0.025:
        cutoff = datetime.now(UTC) - timedelta(days=get_settings().location_retention_days)
        location_repo.prune_before(db, cutoff)
    db.commit()
    db.refresh(row)
    return row


def latest(db: Session, patient_id: int, user: User) -> dict:
    require_patient_access(db, patient_id, user)
    row = location_repo.latest(db, patient_id)
    if row is None:
        return {"point": None, "age_seconds": None}
    age = int((datetime.now(UTC) - row.recorded_at).total_seconds())
    return {"point": row, "age_seconds": max(age, 0)}


def history(
    db: Session, patient_id: int, user: User, *, hours: int, limit: int
) -> list[Location]:
    require_patient_access(db, patient_id, user)
    since = datetime.now(UTC) - timedelta(hours=max(1, min(hours, 24 * 30)))
    return location_repo.history(db, patient_id, since=since, limit=max(1, min(limit, 2000)))
