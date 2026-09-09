"""Database access for geofences, their state, and events."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.geofence import Geofence, GeofenceEvent, GeofenceState


def create(db: Session, **fields) -> Geofence:
    fence = Geofence(**fields)
    db.add(fence)
    db.flush()
    db.add(GeofenceState(geofence_id=fence.id, is_inside=True, outside_streak=0))
    return fence


def get(db: Session, geofence_id: int) -> Geofence | None:
    return db.get(Geofence, geofence_id)


def list_for_patient(db: Session, patient_id: int, *, active_only: bool = False) -> list[Geofence]:
    stmt = select(Geofence).where(Geofence.patient_id == patient_id)
    if active_only:
        stmt = stmt.where(Geofence.active.is_(True))
    return list(db.execute(stmt.order_by(Geofence.name)).scalars())


def delete(db: Session, fence: Geofence) -> None:
    db.delete(fence)


def get_state(db: Session, geofence_id: int) -> GeofenceState | None:
    state = db.get(GeofenceState, geofence_id)
    if state is None:
        state = GeofenceState(geofence_id=geofence_id, is_inside=True, outside_streak=0)
        db.add(state)
        db.flush()
    return state


def add_event(db: Session, **fields) -> GeofenceEvent:
    ev = GeofenceEvent(**fields)
    db.add(ev)
    db.flush()
    return ev


def list_events(db: Session, patient_id: int, *, limit: int) -> list[GeofenceEvent]:
    return list(
        db.execute(
            select(GeofenceEvent)
            .where(GeofenceEvent.patient_id == patient_id)
            .order_by(GeofenceEvent.occurred_at.desc())
            .limit(limit)
        ).scalars()
    )
