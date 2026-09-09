"""Health and readiness endpoints.

- GET /api/v1/health    : liveness — "the process is up and serving requests".
- GET /api/v1/ready     : readiness — "the process AND its dependencies (DB) are working".

Deployment platforms and CI use these to decide if the service is healthy.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.health import HealthResponse, ReadinessResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Liveness check — does not touch the database."""
    return HealthResponse(service=get_settings().project_name)


@router.get("/ready", response_model=ReadinessResponse)
def ready(db: Session = Depends(get_db)) -> ReadinessResponse:
    """Readiness check — runs `SELECT 1` to confirm the database is reachable."""
    try:
        db.execute(text("SELECT 1"))
        return ReadinessResponse(status="ok", database="up")
    except SQLAlchemyError:
        return ReadinessResponse(status="degraded", database="down")
