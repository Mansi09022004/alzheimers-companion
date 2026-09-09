"""Schemas for consent, face registration, and identification."""

from datetime import datetime

from pydantic import BaseModel, Field

_ORM = {"from_attributes": True}


class ConsentCreate(BaseModel):
    purpose: str = Field(
        default="Face recognition to help the patient recognise this person.",
        max_length=200,
    )


class ConsentResponse(BaseModel):
    id: int
    person_id: int
    purpose: str
    granted_at: datetime
    revoked_at: datetime | None

    model_config = _ORM


class FaceResponse(BaseModel):
    id: int
    person_id: int
    model_version: str
    det_score: float
    created_at: datetime

    model_config = _ORM


class IdentifyMatch(BaseModel):
    matched: bool
    person_id: int | None = None
    display_name: str | None = None
    relationship_label: str | None = None
    similarity: float | None = None
    message: str
