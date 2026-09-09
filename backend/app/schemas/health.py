"""Response schemas for the health endpoints.

Pydantic models define the exact JSON shape the API returns. FastAPI uses them to
serialize responses and to document the API automatically.
"""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str


class ReadinessResponse(BaseModel):
    status: Literal["ok", "degraded"]
    database: Literal["up", "down"]
