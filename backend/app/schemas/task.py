"""Schemas for "Today's Tasks"."""

from datetime import date, datetime

from pydantic import BaseModel, Field

_ORM = {"from_attributes": True}


class TaskCreate(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    task_date: date | None = None  # defaults to today (caller's local today) if omitted


class TaskUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1, max_length=500)
    completed: bool | None = None


class TaskResponse(BaseModel):
    id: int
    task_date: date
    text: str
    completed: bool
    completed_at: datetime | None
    created_by: int | None

    model_config = _ORM
