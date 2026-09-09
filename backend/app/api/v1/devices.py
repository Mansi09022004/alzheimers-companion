"""Caregiver-side patient device management."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User, UserRole
from app.schemas.device import DeviceCreate, DevicePairingResponse, DeviceResponse
from app.services import device_service

_caregiver = require_role(UserRole.caregiver)

patient_devices_router = APIRouter(prefix="/patients/{patient_id}", tags=["devices"])
devices_router = APIRouter(prefix="/devices", tags=["devices"])


@patient_devices_router.post(
    "/devices", response_model=DevicePairingResponse, status_code=status.HTTP_201_CREATED
)
def provision_device(
    patient_id: int,
    data: DeviceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    """Create a device and return a one-time pairing code (shown once)."""
    return device_service.provision_device(db, patient_id, data, user)


@patient_devices_router.get("/devices", response_model=list[DeviceResponse])
def list_devices(
    patient_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    return device_service.list_devices(db, patient_id, user)


@devices_router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_device(
    device_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    device_service.revoke_device(db, device_id, user)
