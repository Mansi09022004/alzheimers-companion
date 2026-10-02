"""Location reporting (patient device) and reading (caregiver).

Retention is enforced opportunistically: roughly 1 report in 40 also prunes rows
older than `location_retention_days`. A scheduled job replaces this in Phase 16.
"""

import random
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.geofence import GeofenceKind
from app.models.location import Location
from app.models.patient_profile import PatientProfile
from app.models.user import User
from app.repositories import geofence_repo, location_repo
from app.schemas.location import LocationReport
from app.services.access import require_patient_access
from app.services.geo import haversine_m


def report(db: Session, patient: PatientProfile, data: LocationReport) -> Location:
    row = location_repo.add(
        db,
        patient_id=patient.id,
        lat=data.lat,
        lng=data.lng,
        accuracy_m=data.accuracy_m,
        recorded_at=data.recorded_at or datetime.now(UTC),
    )
    # server-authoritative geofence check on the same transaction
    from app.services import geofence_service

    geofence_service.evaluate(db, patient, row)

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


def context(db: Session, patient_id: int, user: User) -> dict:
    """The patient's latest location plus familiar-place context: whether they're
    currently inside a caregiver-defined familiar place (nearest one wins if more
    than one radius overlaps), and how far they are from home. Nothing here is
    inferred — a place is only ever recognized if a caregiver defined it."""
    access = require_patient_access(db, patient_id, user)
    patient = access.patient
    row = location_repo.latest(db, patient_id)
    if row is None:
        return {
            "point": None,
            "age_seconds": None,
            "at_familiar_place": False,
            "familiar_place_name": None,
            "distance_from_home_m": None,
            "home_label": patient.home_label,
        }

    age = max(int((datetime.now(UTC) - row.recorded_at).total_seconds()), 0)

    nearest_match = None
    nearest_distance = None
    for place in geofence_repo.list_for_patient(
        db, patient_id, active_only=True, kind=GeofenceKind.familiar_place
    ):
        distance = haversine_m(row.lat, row.lng, place.center_lat, place.center_lng)
        if distance <= place.radius_m and (nearest_distance is None or distance < nearest_distance):
            nearest_match, nearest_distance = place, distance

    distance_from_home = None
    if patient.home_lat is not None and patient.home_lng is not None:
        distance_from_home = round(haversine_m(row.lat, row.lng, patient.home_lat, patient.home_lng), 1)

    return {
        "point": row,
        "age_seconds": age,
        "at_familiar_place": nearest_match is not None,
        "familiar_place_name": nearest_match.name if nearest_match else None,
        "distance_from_home_m": distance_from_home,
        "home_label": patient.home_label,
    }
