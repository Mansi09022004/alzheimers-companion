"""A provisioned patient device (phone/tablet).

Patients don't log in with a password. A caregiver creates a device row, which
yields a short-lived **pairing code**. The patient app exchanges that code for a
long-lived **device token** (a JWT with `role=patient`, `sub=<patient_id>`).

We store only the SHA-256 of the pairing code, and the `token_jti` so the device
can be revoked.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin


class PatientDevice(TimestampMixin, Base):
    __tablename__ = "patient_devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    label: Mapped[str] = mapped_column(String(80), nullable=False)

    # pairing (before the device is claimed)
    pairing_code_hash: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    pairing_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # after claim
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    token_jti: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)

    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
