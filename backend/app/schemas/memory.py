"""Schemas for memories and the approve/reject workflow."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.memory import MemorySource, MemoryStatus

_ORM = {"from_attributes": True}


class MemoryCreate(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    person_id: int | None = None
    memory_date: date | None = None


class MemoryUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1, max_length=4000)
    person_id: int | None = None
    memory_date: date | None = None


class MemoryReview(BaseModel):
    decision: Literal["approved", "rejected"]


class MemoryResponse(BaseModel):
    id: int
    patient_id: int
    person_id: int | None
    text: str
    memory_date: date | None
    status: MemoryStatus
    source: MemorySource
    created_by: int | None
    reviewed_by: int | None
    reviewed_at: datetime | None
    created_at: datetime

    model_config = _ORM


class PatientMemoryResponse(BaseModel):
    """Trimmed view for the patient app (approved only)."""

    id: int
    text: str
    memory_date: date | None
    person_id: int | None

    model_config = _ORM
