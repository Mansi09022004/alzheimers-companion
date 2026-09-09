"""Caregiver-side emergency contact management."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User, UserRole
from app.schemas.emergency import (
    EmergencyContactCreate,
    EmergencyContactResponse,
    EmergencyContactUpdate,
)
from app.services import emergency_service

_caregiver = require_role(UserRole.caregiver)

patient_contacts_router = APIRouter(prefix="/patients/{patient_id}", tags=["emergency"])
contacts_router = APIRouter(prefix="/emergency-contacts", tags=["emergency"])


@patient_contacts_router.post(
    "/emergency-contacts",
    response_model=EmergencyContactResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_contact(
    patient_id: int,
    data: EmergencyContactCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return emergency_service.add_contact(db, patient_id, data, user)


@patient_contacts_router.get(
    "/emergency-contacts", response_model=list[EmergencyContactResponse]
)
def list_contacts(
    patient_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    return emergency_service.list_contacts(db, patient_id, user)


@contacts_router.patch("/{contact_id}", response_model=EmergencyContactResponse)
def update_contact(
    contact_id: int,
    data: EmergencyContactUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return emergency_service.update_contact(db, contact_id, data, user)


@contacts_router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    emergency_service.delete_contact(db, contact_id, user)
