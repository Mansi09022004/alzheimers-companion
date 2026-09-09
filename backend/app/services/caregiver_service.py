"""Caregiver own-profile business logic (1-to-1 with the user row)."""

from sqlalchemy.orm import Session

from app.models.caregiver_profile import CaregiverProfile
from app.models.user import User
from app.schemas.caregiver import CaregiverProfileUpdate


def _get_or_create(db: Session, user: User) -> CaregiverProfile:
    profile = db.get(CaregiverProfile, user.id)
    if profile is None:
        profile = CaregiverProfile(user_id=user.id)
        db.add(profile)
        db.flush()
    return profile


def get_profile(db: Session, user: User) -> dict:
    profile = _get_or_create(db, user)
    db.commit()
    return _to_response(user, profile)


def update_profile(db: Session, user: User, data: CaregiverProfileUpdate) -> dict:
    profile = _get_or_create(db, user)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return _to_response(user, profile)


def _to_response(user: User, profile: CaregiverProfile) -> dict:
    return {
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": profile.phone,
        "notes": profile.notes,
    }
