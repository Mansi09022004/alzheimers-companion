"""Caregiver-side medication schedule management + adherence."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User, UserRole
from app.schemas.medication import (
    AdherenceSummary,
    MedicationCreate,
    MedicationResponse,
    MedicationUpdate,
    TakeDoseRequest,
)
from app.services import medication_service

_caregiver = require_role(UserRole.caregiver)

patient_meds_router = APIRouter(prefix="/patients/{patient_id}", tags=["medications"])
meds_router = APIRouter(prefix="/medications", tags=["medications"])


@patient_meds_router.post(
    "/medications", response_model=MedicationResponse, status_code=status.HTTP_201_CREATED
)
def create_medication(
    patient_id: int,
    data: MedicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return medication_service.create_medication(db, patient_id, data, user)


@patient_meds_router.get("/medications", response_model=list[MedicationResponse])
def list_medications(
    patient_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    return medication_service.list_medications(db, patient_id, user)


@patient_meds_router.get("/medications/adherence", response_model=AdherenceSummary)
def adherence(
    patient_id: int,
    days: int = 7,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    now = datetime.now(UTC)
    to_date = now.date()
    from_date = to_date - timedelta(days=max(1, min(days, 90)) - 1)
    return medication_service.adherence(db, patient_id, from_date, to_date, user, now)


@meds_router.patch("/{medication_id}", response_model=MedicationResponse)
def update_medication(
    medication_id: int,
    data: MedicationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return medication_service.update_medication(db, medication_id, data, user)


@meds_router.delete("/{medication_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medication(
    medication_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    medication_service.delete_medication(db, medication_id, user)


@meds_router.post("/{medication_id}/doses/{time}", response_model=dict)
def caregiver_record_dose(
    medication_id: int,
    time: str,
    data: TakeDoseRequest,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    """Caregiver records a dose they administered (or marks it skipped)."""
    log = medication_service.caregiver_record_dose(db, medication_id, time, data, user)
    return {
        "medication_id": log.medication_id,
        "date": log.scheduled_date,
        "time": time,
        "status": log.status.value,
    }
