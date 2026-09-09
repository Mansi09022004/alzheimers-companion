"""Schemas for patient profiles and caregiver links."""

from datetime import date

from pydantic import BaseModel, EmailStr, Field

from app.models.patient_caregiver import AccessLevel

_ORM = {"from_attributes": True}


class PatientCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    date_of_birth: date | None = None
    notes: str | None = Field(default=None, max_length=1000)
    home_label: str | None = Field(default=None, max_length=120)
    home_lat: float | None = Field(default=None, ge=-90, le=90)
    home_lng: float | None = Field(default=None, ge=-180, le=180)


class PatientUpdate(BaseModel):
    """All optional — only supplied fields are changed (PATCH semantics)."""

    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    date_of_birth: date | None = None
    notes: str | None = Field(default=None, max_length=1000)
    home_label: str | None = Field(default=None, max_length=120)
    home_lat: float | None = Field(default=None, ge=-90, le=90)
    home_lng: float | None = Field(default=None, ge=-180, le=180)


class PatientResponse(BaseModel):
    id: int
    full_name: str
    date_of_birth: date | None
    notes: str | None
    home_label: str | None
    home_lat: float | None
    home_lng: float | None
    created_by: int
    my_access: AccessLevel  # this caregiver's access level for the patient

    model_config = _ORM


class CaregiverLinkCreate(BaseModel):
    email: EmailStr
    access_level: AccessLevel = AccessLevel.viewer


class CaregiverLinkResponse(BaseModel):
    caregiver_id: int
    email: EmailStr
    full_name: str
    access_level: AccessLevel

    model_config = _ORM
