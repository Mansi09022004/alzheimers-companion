"""Schemas for geofences, events, and alerts."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.alert import AlertSeverity, AlertType
from app.models.geofence import GeofenceEventType

_ORM = {"from_attributes": True}


class GeofenceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    center_lat: float = Field(ge=-90, le=90)
    center_lng: float = Field(ge=-180, le=180)
    radius_m: float = Field(ge=50, le=50_000)


class GeofenceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    center_lat: float | None = Field(default=None, ge=-90, le=90)
    center_lng: float | None = Field(default=None, ge=-180, le=180)
    radius_m: float | None = Field(default=None, ge=50, le=50_000)
    active: bool | None = None


class GeofenceResponse(BaseModel):
    id: int
    patient_id: int
    name: str
    center_lat: float
    center_lng: float
    radius_m: float
    active: bool

    model_config = _ORM


class GeofenceEventResponse(BaseModel):
    id: int
    geofence_id: int
    event: GeofenceEventType
    at_lat: float
    at_lng: float
    distance_m: float
    occurred_at: datetime

    model_config = _ORM


class AlertResponse(BaseModel):
    id: int
    type: AlertType
    severity: AlertSeverity
    reason_text: str
    context: dict
    created_at: datetime
    acknowledged_at: datetime | None

    model_config = _ORM
