"""Patient location pings.

Append-only. The device reports periodically; caregivers read the latest point and a
short history. Rows older than the retention window are pruned (opportunistically on
write for now; a scheduled job takes over in Phase 16).

Location is sensitive data — it is only ever sent in a request BODY, never a URL, and
access is scoped to linked caregivers.
"""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Location(Base):
    __tablename__ = "locations"
    __table_args__ = (
        Index("ix_locations_patient_recorded", "patient_id", "recorded_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False
    )
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
