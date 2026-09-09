"""Geofence CRUD + the server-authoritative in/out evaluation on every location ping.

evaluate() runs for each active zone:
  distance = haversine(patient, zone.center)
  effective_radius = zone.radius_m + min(gps_accuracy, buffer_cap)   # forgive GPS noise
  outside = distance > effective_radius

  outside & was inside  -> bump the outside streak; at `geofence_exit_streak`
                           consecutive outside fixes -> EXIT event + WARNING alert
  inside  & was outside  -> RETURN event + INFO alert, reset streak
"""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import NotFoundError
from app.models.alert import AlertSeverity, AlertType
from app.models.geofence import Geofence, GeofenceEventType
from app.models.location import Location
from app.models.patient_profile import PatientProfile
from app.models.user import User
from app.repositories import geofence_repo
from app.schemas.geofence import GeofenceCreate, GeofenceUpdate
from app.services import alert_service
from app.services.access import require_patient_access
from app.services.geo import haversine_m


# --- caregiver CRUD ---

def create_geofence(db: Session, patient_id: int, data: GeofenceCreate, user: User) -> Geofence:
    require_patient_access(db, patient_id, user)
    fence = geofence_repo.create(
        db, patient_id=patient_id, created_by=user.id, **data.model_dump()
    )
    db.commit()
    db.refresh(fence)
    return fence


def list_geofences(db: Session, patient_id: int, user: User) -> list[Geofence]:
    require_patient_access(db, patient_id, user)
    return geofence_repo.list_for_patient(db, patient_id)


def _get_for_user(db: Session, geofence_id: int, user: User) -> Geofence:
    fence = geofence_repo.get(db, geofence_id)
    if fence is None:
        raise NotFoundError("Safe zone not found.")
    require_patient_access(db, fence.patient_id, user)
    return fence


def update_geofence(db: Session, geofence_id: int, data: GeofenceUpdate, user: User) -> Geofence:
    fence = _get_for_user(db, geofence_id, user)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(fence, k, v)
    db.commit()
    db.refresh(fence)
    return fence


def delete_geofence(db: Session, geofence_id: int, user: User) -> None:
    fence = _get_for_user(db, geofence_id, user)
    geofence_repo.delete(db, fence)
    db.commit()


def list_events(db: Session, patient_id: int, user: User, *, limit: int):
    require_patient_access(db, patient_id, user)
    return geofence_repo.list_events(db, patient_id, limit=max(1, min(limit, 200)))


# --- the evaluation (called by location_service.report, same transaction) ---

def evaluate(db: Session, patient: PatientProfile, loc: Location) -> None:
    settings = get_settings()
    buffer = min(loc.accuracy_m or 0.0, settings.geofence_accuracy_buffer_cap_m)

    for fence in geofence_repo.list_for_patient(db, patient.id, active_only=True):
        distance = haversine_m(loc.lat, loc.lng, fence.center_lat, fence.center_lng)
        outside = distance > (fence.radius_m + buffer)
        state = geofence_repo.get_state(db, fence.id)

        if outside:
            state.outside_streak += 1
            if state.is_inside and state.outside_streak >= settings.geofence_exit_streak:
                state.is_inside = False
                _record(db, patient, fence, loc, distance, GeofenceEventType.exit)
        else:
            if not state.is_inside:
                _record(db, patient, fence, loc, distance, GeofenceEventType.enter)
            state.is_inside = True
            state.outside_streak = 0
        db.add(state)


def _record(db, patient, fence, loc, distance, event: GeofenceEventType) -> None:
    occurred = loc.recorded_at or datetime.now(UTC)
    geofence_repo.add_event(
        db,
        geofence_id=fence.id,
        patient_id=patient.id,
        event=event,
        at_lat=loc.lat,
        at_lng=loc.lng,
        distance_m=round(distance, 1),
        occurred_at=occurred,
    )
    if event == GeofenceEventType.exit:
        alert_service.raise_alert(
            db,
            patient_id=patient.id,
            type_=AlertType.geofence_exit,
            severity=AlertSeverity.warning,
            reason_text=(
                f"{patient.full_name} left {fence.name} — last seen "
                f"{round(distance)} m away at {occurred.strftime('%H:%M')}."
            ),
            context={
                "geofence_id": fence.id,
                "geofence_name": fence.name,
                "radius_m": fence.radius_m,
                "distance_m": round(distance, 1),
                "last_point": {"lat": loc.lat, "lng": loc.lng, "accuracy_m": loc.accuracy_m},
                "occurred_at": occurred.isoformat(),
            },
        )
    else:
        alert_service.raise_alert(
            db,
            patient_id=patient.id,
            type_=AlertType.geofence_return,
            severity=AlertSeverity.info,
            reason_text=f"{patient.full_name} is back inside {fence.name}.",
            context={
                "geofence_id": fence.id,
                "geofence_name": fence.name,
                "occurred_at": occurred.isoformat(),
            },
        )
