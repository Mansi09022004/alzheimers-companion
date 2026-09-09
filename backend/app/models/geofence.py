"""Safe-zone geofencing.

A geofence is a circle: center + radius. The server is the AUTHORITATIVE checker —
the device only reports raw location; whether the patient is "inside" or "outside" a
zone, and whether to alert, is decided here.

`geofence_states` tracks the current in/out state and a streak of consecutive
"outside" readings, so a single noisy GPS fix does not fire an alert (hysteresis).
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, func
import enum

from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin


class GeofenceEventType(str, enum.Enum):
    exit = "exit"
    enter = "enter"


class Geofence(TimestampMixin, Base):
    __tablename__ = "geofences"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    center_lat: Mapped[float] = mapped_column(Float, nullable=False)
    center_lng: Mapped[float] = mapped_column(Float, nullable=False)
    radius_m: Mapped[float] = mapped_column(Float, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )


class GeofenceState(Base):
    __tablename__ = "geofence_states"

    geofence_id: Mapped[int] = mapped_column(
        ForeignKey("geofences.id", ondelete="CASCADE"), primary_key=True
    )
    is_inside: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    outside_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class GeofenceEvent(Base):
    __tablename__ = "geofence_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    geofence_id: Mapped[int] = mapped_column(
        ForeignKey("geofences.id", ondelete="CASCADE"), index=True, nullable=False
    )
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    event: Mapped[GeofenceEventType] = mapped_column(
        Enum(GeofenceEventType, name="geofence_event_type", native_enum=False, length=6),
        nullable=False,
    )
    at_lat: Mapped[float] = mapped_column(Float, nullable=False)
    at_lng: Mapped[float] = mapped_column(Float, nullable=False)
    distance_m: Mapped[float] = mapped_column(Float, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
