"""Explicit consent to register a person's face.

Biometric data is sensitive. Before any face embedding is stored for a person, a
caregiver must record consent here (who granted it, when, for what purpose).
Revoking consent (`revoked_at`) blocks new registrations; deleting the person
removes the embeddings themselves.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Consent(TimestampMixin, Base):
    __tablename__ = "consents"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    person_id: Mapped[int] = mapped_column(
        ForeignKey("people.id", ondelete="CASCADE"), index=True, nullable=False
    )
    granted_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    purpose: Mapped[str] = mapped_column(String(200), nullable=False)
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None
