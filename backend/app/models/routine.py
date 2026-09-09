"""Daily routine items (e.g. "9:00 breakfast", "17:00 short walk", "Sunday call Rahul").

`days_of_week` uses Python's convention: Monday = 0 ... Sunday = 6.
Like medications, no per-day rows are pre-created — the "today" view is computed and a
`RoutineCompletion` is written only when the patient (or a caregiver) checks an item off.
"""

from datetime import date, datetime

from sqlalchemy import ARRAY, Boolean, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class RoutineItem(TimestampMixin, Base):
    __tablename__ = "routine_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    time_of_day: Mapped[str] = mapped_column(String(5), nullable=False)  # "HH:MM"
    days_of_week: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    completions: Mapped[list["RoutineCompletion"]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )


class RoutineCompletion(TimestampMixin, Base):
    __tablename__ = "routine_completions"
    __table_args__ = (
        UniqueConstraint("routine_item_id", "on_date", name="uq_routine_completion"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    routine_item_id: Mapped[int] = mapped_column(
        ForeignKey("routine_items.id", ondelete="CASCADE"), index=True, nullable=False
    )
    on_date: Mapped[date] = mapped_column(Date, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    marked_via: Mapped[str] = mapped_column(String(10), nullable=False)  # "patient" | "caregiver"

    item: Mapped["RoutineItem"] = relationship(back_populates="completions")
