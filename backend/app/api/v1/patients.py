"""Patient profile routes + caregiver-link management. Caregiver role required."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User, UserRole
from app.schemas.patient import (
    CaregiverLinkCreate,
    CaregiverLinkResponse,
    PatientCreate,
    PatientResponse,
    PatientUpdate,
)
from app.services import patient_service

router = APIRouter(prefix="/patients", tags=["patients"])
_caregiver = require_role(UserRole.caregiver)


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    data: PatientCreate, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    return patient_service.create_patient(db, data, user)


@router.get("", response_model=list[PatientResponse])
def list_patients(db: Session = Depends(get_db), user: User = Depends(_caregiver)):
    return patient_service.list_patients(db, user)


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    return patient_service.get_patient(db, patient_id, user)


@router.patch("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    data: PatientUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return patient_service.update_patient(db, patient_id, data, user)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    patient_service.delete_patient(db, patient_id, user)


@router.get("/{patient_id}/caregivers", response_model=list[CaregiverLinkResponse])
def list_caregivers(
    patient_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    return patient_service.list_caregivers(db, patient_id, user)


@router.post(
    "/{patient_id}/caregivers",
    response_model=CaregiverLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_caregiver(
    patient_id: int,
    data: CaregiverLinkCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return patient_service.add_caregiver(db, patient_id, data.email, data.access_level, user)
