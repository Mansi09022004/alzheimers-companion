"""Schemas for medication schedules, the patient "today" view, and adherence."""

import re
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

_TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
_ORM = {"from_attributes": True}


def _check_times(v: list[str]) -> list[str]:
    for t in v:
        if not _TIME.match(t):
            raise ValueError(f"'{t}' is not a valid HH:MM time")
    return sorted(set(v))


class MedicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    dosage_note: str | None = Field(default=None, max_length=200)
    schedule_times: list[str] = Field(min_length=1, max_length=12)

    @field_validator("schedule_times")
    @classmethod
    def _v(cls, v):
        return _check_times(v)


class MedicationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    dosage_note: str | None = Field(default=None, max_length=200)
    schedule_times: list[str] | None = Field(default=None, min_length=1, max_length=12)
    active: bool | None = None

    @field_validator("schedule_times")
    @classmethod
    def _v(cls, v):
        return _check_times(v) if v is not None else v


class MedicationResponse(BaseModel):
    id: int
    patient_id: int
    name: str
    dosage_note: str | None
    schedule_times: list[str]
    active: bool

    model_config = _ORM


# --- patient "today" view ---

DoseView = Literal["upcoming", "due", "taken", "skipped", "missed"]


class DoseSlot(BaseModel):
    medication_id: int
    name: str
    dosage_note: str | None
    time: str
    status: DoseView


class TakeDoseRequest(BaseModel):
    scheduled_date: date
    status: Literal["taken", "skipped"] = "taken"
    marked_at: datetime | None = None  # device local time; defaults to server "now"


# --- caregiver adherence ---

class AdherenceDay(BaseModel):
    date: date
    taken: int
    missed: int
    skipped: int
    upcoming: int


class AdherenceSummary(BaseModel):
    from_date: date
    to_date: date
    taken: int
    missed: int
    skipped: int
    adherence_rate: float  # taken / (taken + missed), 0..1
    days: list[AdherenceDay]
