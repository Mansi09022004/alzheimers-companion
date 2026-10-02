"""'Routine Detection' — patterns noticed in the patient's own historical data."""

from pydantic import BaseModel


class DetectedRoutine(BaseModel):
    category: str  # "medication" | "task" | "routine" | "location"
    icon: str
    message: str
