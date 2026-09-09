"""Medication schedules + per-dose logs.

This is a REMINDER / TRACKING feature only — no medical advice, no diagnosis.

`schedule_times` are "HH:MM" strings in the patient's local time. We do not create a
row per dose ahead of time; instead the "today" view is computed from the schedule
and the logs that exist. A log row is written only when a dose is actually acted on
(taken / skipped), or when a caregiver records a miss.
"""

import enum
from datetime import date, datetime

from sqlalchemy import ARRAY, Boolean, Date, DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class DoseStatus(str, enum.Enum):
    taken = "taken"
    skipped = "skipped"
    missed = "missed"


class Medication(TimestampMixin, Base):
    __tablename__ = "medications"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    dosage_note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    schedule_times: Mapped[list[str]] = mapped_column(ARRAY(String(5)), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    logs: Mapped[list["MedicationLog"]] = relationship(
        back_populates="medication", cascade="all, delete-orphan"
    )


class MedicationLog(TimestampMixin, Base):
    __tablename__ = "medication_logs"
    __table_args__ = (
        UniqueConstraint(
            "medication_id", "scheduled_date", "scheduled_time", name="uq_dose_slot"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    medication_id: Mapped[int] = mapped_column(
        ForeignKey("medications.id", ondelete="CASCADE"), index=True, nullable=False
    )
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    scheduled_time: Mapped[str] = mapped_column(String(5), nullable=False)  # "HH:MM"
    status: Mapped[DoseStatus] = mapped_column(
        Enum(DoseStatus, name="dose_status", native_enum=False, length=10), nullable=False
    )
    marked_via: Mapped[str] = mapped_column(String(10), nullable=False)  # "patient" | "caregiver"
    marked_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    marked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    medication: Mapped["Medication"] = relationship(back_populates="logs")
