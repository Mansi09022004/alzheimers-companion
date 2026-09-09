"""Extra profile fields for a caregiver `User` (1-to-1 with users)."""

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class CaregiverProfile(TimestampMixin, Base):
    __tablename__ = "caregiver_profiles"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    user: Mapped["User"] = relationship()  # noqa: F821
