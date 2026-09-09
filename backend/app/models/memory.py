"""A memory about the patient's life — the knowledge the AI assistant is allowed to use.

Caregiver control is the point:
- `status`: only `approved` memories are ever retrieved by the RAG pipeline.
- `source`: `caregiver` memories are created approved (the caregiver IS the authority);
  `ai_suggestion` memories (Phase 18) start `pending` and wait for a caregiver decision.
- `reviewed_by` / `reviewed_at`: audit trail for approve/reject.

The `embedding` column is added in Phase 7 when we wire pgvector for memories.
"""

import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin


class MemoryStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class MemorySource(str, enum.Enum):
    caregiver = "caregiver"
    ai_suggestion = "ai_suggestion"


class Memory(TimestampMixin, Base):
    __tablename__ = "memories"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # optional link to the person the memory is about (e.g. "Rahul visited")
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("people.id", ondelete="SET NULL"), index=True, nullable=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    memory_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    status: Mapped[MemoryStatus] = mapped_column(
        Enum(MemoryStatus, name="memory_status", native_enum=False, length=12),
        nullable=False,
        default=MemoryStatus.approved,
        index=True,
    )
    source: Mapped[MemorySource] = mapped_column(
        Enum(MemorySource, name="memory_source", native_enum=False, length=16),
        nullable=False,
        default=MemorySource.caregiver,
    )

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
