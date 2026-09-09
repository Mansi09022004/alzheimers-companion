"""Traceability for AI-suggested memories.

When the AI proposes a memory, we keep the exact snippet it was drawn from so a
caregiver can see *why* it was suggested before approving it.
"""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MemoryOrigin(str, enum.Enum):
    dashboard_note = "dashboard_note"
    voice_transcript = "voice_transcript"
    chat = "chat"


class MemorySourceRecord(Base):
    __tablename__ = "memory_sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    memory_id: Mapped[int] = mapped_column(
        ForeignKey("memories.id", ondelete="CASCADE"), index=True, nullable=False
    )
    origin: Mapped[MemoryOrigin] = mapped_column(
        Enum(MemoryOrigin, name="memory_origin", native_enum=False, length=20), nullable=False
    )
    raw_excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
