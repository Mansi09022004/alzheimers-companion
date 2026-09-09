"""Caregiver-side safe zones, geofence events, and alerts."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User, UserRole
from app.schemas.geofence import (
    AlertResponse,
    GeofenceCreate,
    GeofenceEventResponse,
    GeofenceResponse,
    GeofenceUpdate,
)
from app.services import alert_service, geofence_service

_caregiver = require_role(UserRole.caregiver)

patient_geo_router = APIRouter(prefix="/patients/{patient_id}", tags=["geofencing"])
geo_router = APIRouter(prefix="/geofences", tags=["geofencing"])
alerts_router = APIRouter(prefix="/alerts", tags=["alerts"])


@patient_geo_router.post(
    "/geofences", response_model=GeofenceResponse, status_code=status.HTTP_201_CREATED
)
def create_geofence(
    patient_id: int,
    data: GeofenceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return geofence_service.create_geofence(db, patient_id, data, user)


@patient_geo_router.get("/geofences", response_model=list[GeofenceResponse])
def list_geofences(
    patient_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    return geofence_service.list_geofences(db, patient_id, user)


@patient_geo_router.get("/geofences/events", response_model=list[GeofenceEventResponse])
def list_events(
    patient_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return geofence_service.list_events(db, patient_id, user, limit=limit)


@patient_geo_router.get("/alerts", response_model=list[AlertResponse])
def list_alerts(
    patient_id: int,
    unacknowledged: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return alert_service.list_alerts(
        db, patient_id, user, unacknowledged_only=unacknowledged, limit=limit
    )


@geo_router.patch("/{geofence_id}", response_model=GeofenceResponse)
def update_geofence(
    geofence_id: int,
    data: GeofenceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return geofence_service.update_geofence(db, geofence_id, data, user)


@geo_router.delete("/{geofence_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_geofence(
    geofence_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    geofence_service.delete_geofence(db, geofence_id, user)


@alerts_router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    return alert_service.acknowledge(db, alert_id, user)
