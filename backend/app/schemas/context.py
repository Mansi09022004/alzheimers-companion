"""Schemas for the Context Engine (patient app)."""

from datetime import date

from pydantic import BaseModel


class MemorySource(BaseModel):
    memory_id: int
    text: str
    memory_date: date | None


class WhoIsThisResponse(BaseModel):
    matched: bool
    message: str
    person_id: int | None = None
    display_name: str | None = None
    relationship_label: str | None = None
    similarity: float | None = None
    sources: list[MemorySource] = []


class WhyAmIHereResponse(BaseModel):
    message: str
    place: str
    part_of_day: str | None = None


class MemoryMomentResponse(BaseModel):
    available: bool
    message: str
    memory_id: int | None = None
    memory_date: date | None = None
