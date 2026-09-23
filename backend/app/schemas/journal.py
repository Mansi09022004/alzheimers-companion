"""Schemas for the patient's 'My Day' journal."""

from datetime import date, datetime

from pydantic import BaseModel, Field

_ORM = {"from_attributes": True}


class JournalEntrySave(BaseModel):
    entry_date: date
    text: str = Field(min_length=1, max_length=8000)


class JournalEntryResponse(BaseModel):
    id: int
    entry_date: date
    text: str
    created_at: datetime
    updated_at: datetime

    model_config = _ORM


class JournalTranscriptResponse(BaseModel):
    transcript: str
