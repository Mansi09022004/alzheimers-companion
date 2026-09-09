"""Schemas for the RAG memory assistant."""

from datetime import date

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


class MemorySource(BaseModel):
    memory_id: int
    text: str
    memory_date: date | None
    similarity: float


class AskResponse(BaseModel):
    answer: str
    grounded: bool  # True when the answer is built from retrieved memories
    sources: list[MemorySource]


class VoiceAskResponse(AskResponse):
    transcript: str  # what we heard the patient say

