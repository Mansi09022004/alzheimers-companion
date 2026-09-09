"""Dependency for patient-device authentication.

Patient device tokens are separate from caregiver tokens: `type=device`, `role=patient`,
`sub=<patient_id>`. There is no `users` row for a patient. This dependency verifies the
token, checks the device isn't revoked, and returns the `PatientProfile` (or, via
`get_current_device`, the `PatientDevice` itself).
"""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core import security
from app.core.database import get_db
from app.models.patient_device import PatientDevice
from app.models.patient_profile import PatientProfile
from app.repositories import device_repo, patient_repo

_bearer = HTTPBearer(auto_error=False)


def get_current_device(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> PatientDevice:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = security.decode_token(creds.credentials, expected_type="device")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    device = device_repo.get_by_jti(db, payload.get("jti", ""))
    if device is None or device.revoked:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "This device is no longer paired")
    return device


def get_current_patient(
    device: PatientDevice = Depends(get_current_device),
    db: Session = Depends(get_db),
) -> PatientProfile:
    patient = patient_repo.get(db, device.patient_id)
    if patient is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Patient not found")
    return patient
