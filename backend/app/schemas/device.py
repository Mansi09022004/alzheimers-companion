"""Schemas for patient-device provisioning and pairing."""

from datetime import datetime

from pydantic import BaseModel, Field

_ORM = {"from_attributes": True}


class DeviceCreate(BaseModel):
    label: str = Field(min_length=1, max_length=80)  # e.g. "Dad's phone"


class DevicePairingResponse(BaseModel):
    """Returned once, to the caregiver. The pairing code is not stored in plain text."""

    device_id: int
    label: str
    pairing_code: str
    pairing_expires_at: datetime


class DeviceResponse(BaseModel):
    id: int
    label: str
    claimed_at: datetime | None
    revoked: bool

    model_config = _ORM


class DeviceClaimRequest(BaseModel):
    pairing_code: str = Field(min_length=4, max_length=16)


class DeviceClaimResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    patient_id: int
    patient_name: str
