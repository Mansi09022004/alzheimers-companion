"""Caregiver-side location reading (latest + history)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User, UserRole
from app.schemas.location import LatestLocation, LocationPoint
from app.services import location_service

router = APIRouter(prefix="/patients/{patient_id}/location", tags=["location"])
_caregiver = require_role(UserRole.caregiver)


@router.get("", response_model=LatestLocation)
def latest(
    patient_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    return location_service.latest(db, patient_id, user)


@router.get("/history", response_model=list[LocationPoint])
def history(
    patient_id: int,
    hours: int = 24,
    limit: int = 500,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return location_service.history(db, patient_id, user, hours=hours, limit=limit)
