"""Schemas for daily routine items."""

import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

_TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
_ORM = {"from_attributes": True}


def _check_time(v: str) -> str:
    if not _TIME.match(v):
        raise ValueError(f"'{v}' is not a valid HH:MM time")
    return v


def _check_days(v: list[int]) -> list[int]:
    if any(d < 0 or d > 6 for d in v):
        raise ValueError("days_of_week values must be 0 (Mon) .. 6 (Sun)")
    return sorted(set(v))


class RoutineCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    time_of_day: str
    days_of_week: list[int] = Field(min_length=1, max_length=7)

    @field_validator("time_of_day")
    @classmethod
    def _t(cls, v):
        return _check_time(v)

    @field_validator("days_of_week")
    @classmethod
    def _d(cls, v):
        return _check_days(v)


class RoutineUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    time_of_day: str | None = None
    days_of_week: list[int] | None = Field(default=None, min_length=1, max_length=7)
    active: bool | None = None

    @field_validator("time_of_day")
    @classmethod
    def _t(cls, v):
        return _check_time(v) if v is not None else v

    @field_validator("days_of_week")
    @classmethod
    def _d(cls, v):
        return _check_days(v) if v is not None else v


class RoutineResponse(BaseModel):
    id: int
    patient_id: int
    title: str
    time_of_day: str
    days_of_week: list[int]
    active: bool

    model_config = _ORM


class RoutineTodayItem(BaseModel):
    routine_item_id: int
    title: str
    time_of_day: str
    done: bool


class CompleteRoutineRequest(BaseModel):
    on_date: date
    done: bool = True
    marked_via: Literal["patient", "caregiver"] = "patient"
