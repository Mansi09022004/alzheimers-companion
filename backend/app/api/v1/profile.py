"""The caregiver's own profile: GET/PUT /api/v1/me/profile."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User, UserRole
from app.schemas.caregiver import CaregiverProfileResponse, CaregiverProfileUpdate
from app.services import caregiver_service

router = APIRouter(prefix="/me", tags=["profile"])
_caregiver = require_role(UserRole.caregiver)


@router.get("/profile", response_model=CaregiverProfileResponse)
def get_my_profile(db: Session = Depends(get_db), user: User = Depends(_caregiver)):
    return caregiver_service.get_profile(db, user)


@router.put("/profile", response_model=CaregiverProfileResponse)
def update_my_profile(
    data: CaregiverProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return caregiver_service.update_profile(db, user, data)
