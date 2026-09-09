"""Patient-app facing routes. Auth is the device token (see dependencies/patient_auth).

`/patient/pair` is the only public route here — it trades a pairing code for a token.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.patient_auth import get_current_patient
from app.models.patient_profile import PatientProfile
from app.schemas.device import DeviceClaimRequest, DeviceClaimResponse
from app.schemas.patient import PatientSelfResponse
from app.services import device_service

router = APIRouter(prefix="/patient", tags=["patient-app"])


@router.post("/pair", response_model=DeviceClaimResponse)
def pair(data: DeviceClaimRequest, db: Session = Depends(get_db)):
    return device_service.claim_device(db, data.pairing_code)


@router.get("/me", response_model=PatientSelfResponse)
def me(patient: PatientProfile = Depends(get_current_patient)) -> PatientProfile:
    """The patient's own profile (used by the app home screen)."""
    return patient
