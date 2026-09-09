"""Schemas for location reporting and reading."""

from datetime import datetime

from pydantic import BaseModel, Field

_ORM = {"from_attributes": True}


class LocationReport(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    accuracy_m: float | None = Field(default=None, ge=0, le=10000)
    recorded_at: datetime | None = None  # device time; server "now" if omitted


class LocationPoint(BaseModel):
    lat: float
    lng: float
    accuracy_m: float | None
    recorded_at: datetime

    model_config = _ORM


class LatestLocation(BaseModel):
    point: LocationPoint | None
    age_seconds: int | None  # how stale the latest fix is; None when we have nothing
