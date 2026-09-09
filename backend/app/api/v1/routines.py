"""Caregiver-side daily routine management."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User, UserRole
from app.schemas.routine import (
    CompleteRoutineRequest,
    RoutineCreate,
    RoutineResponse,
    RoutineUpdate,
)
from app.services import routine_service

_caregiver = require_role(UserRole.caregiver)

patient_routines_router = APIRouter(prefix="/patients/{patient_id}", tags=["routine"])
routines_router = APIRouter(prefix="/routine-items", tags=["routine"])


@patient_routines_router.post(
    "/routine-items", response_model=RoutineResponse, status_code=status.HTTP_201_CREATED
)
def create_item(
    patient_id: int,
    data: RoutineCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return routine_service.create_item(db, patient_id, data, user)


@patient_routines_router.get("/routine-items", response_model=list[RoutineResponse])
def list_items(
    patient_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    return routine_service.list_items(db, patient_id, user)


@routines_router.patch("/{item_id}", response_model=RoutineResponse)
def update_item(
    item_id: int,
    data: RoutineUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return routine_service.update_item(db, item_id, data, user)


@routines_router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    routine_service.delete_item(db, item_id, user)


@routines_router.post("/{item_id}/complete", response_model=dict)
def caregiver_complete(
    item_id: int,
    data: CompleteRoutineRequest,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return routine_service.caregiver_complete(db, item_id, data, user)
