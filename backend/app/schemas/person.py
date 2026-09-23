"""Schemas for people (family members) and person-to-person relationships."""

from pydantic import BaseModel, Field

from app.models.person_relationship import RelationshipType

_ORM = {"from_attributes": True}


class PersonCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    relationship_label: str = Field(min_length=1, max_length=60)  # relation to the patient
    short_bio: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=32)


class PersonUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    relationship_label: str | None = Field(default=None, min_length=1, max_length=60)
    short_bio: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=32)
    is_active: bool | None = None


class PersonResponse(BaseModel):
    id: int
    patient_id: int
    display_name: str
    relationship_label: str
    short_bio: str | None
    phone: str | None
    photo_url: str | None
    is_active: bool

    model_config = _ORM


class PatientPersonResponse(BaseModel):
    """Trimmed view for the patient app's "familiar people" list — no contact details."""

    id: int
    display_name: str
    relationship_label: str
    photo_url: str | None

    model_config = _ORM


class RelationshipCreate(BaseModel):
    from_person_id: int
    to_person_id: int
    relationship: RelationshipType
    note: str | None = Field(default=None, max_length=200)


class RelationshipResponse(BaseModel):
    id: int
    from_person_id: int
    to_person_id: int
    relationship: RelationshipType
    note: str | None

    model_config = _ORM
