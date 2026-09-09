"""Schemas for emergency contacts and the SOS flow."""

from pydantic import BaseModel, Field

_ORM = {"from_attributes": True}


class EmergencyContactCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=3, max_length=32)
    relation: str | None = Field(default=None, max_length=60)
    priority: int = Field(default=10, ge=1, le=99)


class EmergencyContactUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, min_length=3, max_length=32)
    relation: str | None = Field(default=None, max_length=60)
    priority: int | None = Field(default=None, ge=1, le=99)


class EmergencyContactResponse(BaseModel):
    id: int
    name: str
    phone: str
    relation: str | None
    priority: int

    model_config = _ORM


class SosRequest(BaseModel):
    note: str | None = Field(default=None, max_length=200)
    # optional immediate fix from the device, in case periodic reporting is stale
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)


class SosResponse(BaseModel):
    alert_id: int
    message: str
    notified_caregivers: int
    notified_contacts: list[str]
