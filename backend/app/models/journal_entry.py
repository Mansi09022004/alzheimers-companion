"""'My Day' — the patient's own journal. One free-text entry per calendar date,
written (or spoken) by the patient themselves, never edited by a caregiver.
"""

from datetime import date

from sqlalchemy import Date, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin


class JournalEntry(TimestampMixin, Base):
    __tablename__ = "journal_entries"
    __table_args__ = (UniqueConstraint("patient_id", "entry_date", name="uq_journal_patient_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    entry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
