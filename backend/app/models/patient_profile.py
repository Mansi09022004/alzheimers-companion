"""Patient profile.

A patient does not log in yet (no email/password). A caregiver creates this record;
Phase 4 provisions a mobile device against it. `home_lat/home_lng` seed the default
safe-zone used later by geofencing.
"""

from datetime import date

from sqlalchemy import Date, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class PatientProfile(TimestampMixin, Base):
    __tablename__ = "patient_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    home_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    home_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    home_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="Asia/Kolkata")

    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    caregiver_links: Mapped[list["PatientCaregiver"]] = relationship(  # noqa: F821
        back_populates="patient", cascade="all, delete-orphan"
    )
    people: Mapped[list["Person"]] = relationship(  # noqa: F821
        back_populates="patient", cascade="all, delete-orphan"
    )
