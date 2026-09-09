"""Caregiver alerts — explainable by design.

Every alert carries a plain-language `reason_text` and a `context` object (last known
point, distance, time, medicine name, ...) so a caregiver understands *why* it fired
without opening the app and digging.

Delivery (push) is Phase 16; for now caregivers read `GET /patients/{id}/alerts`.
"""

import enum
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AlertType(str, enum.Enum):
    geofence_exit = "geofence_exit"
    geofence_return = "geofence_return"
    sos = "sos"
    medication_missed = "medication_missed"


class AlertSeverity(str, enum.Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    type: Mapped[AlertType] = mapped_column(
        Enum(AlertType, name="alert_type", native_enum=False, length=20), nullable=False
    )
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity, name="alert_severity", native_enum=False, length=10), nullable=False
    )
    reason_text: Mapped[str] = mapped_column(String(300), nullable=False)
    context: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    acknowledged_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
