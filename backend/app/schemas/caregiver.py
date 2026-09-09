"""Schemas for the caregiver's own profile."""

from pydantic import BaseModel, Field


class CaregiverProfileUpdate(BaseModel):
    phone: str | None = Field(default=None, max_length=32)
    notes: str | None = Field(default=None, max_length=500)


class CaregiverProfileResponse(BaseModel):
    user_id: int
    full_name: str
    email: str
    phone: str | None
    notes: str | None
