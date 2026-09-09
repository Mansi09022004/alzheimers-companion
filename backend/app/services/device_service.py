"""Patient-device provisioning + pairing.

  provision  (caregiver, owner)  -> creates a device row, returns a one-time pairing code
  claim      (public)            -> exchange a valid pairing code for a device token
  revoke     (caregiver, owner)  -> kill a device's token

The pairing code is single-use and expires after `pairing_code_ttl_minutes`.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core import security
from app.core.config import get_settings
from app.core.exceptions import AuthenticationError, NotFoundError
from app.models.user import User
from app.repositories import device_repo, patient_repo
from app.schemas.device import DeviceCreate
from app.services.access import require_patient_access


def provision_device(db: Session, patient_id: int, data: DeviceCreate, caregiver: User) -> dict:
    require_patient_access(db, patient_id, caregiver, owner_only=True)

    code = security.generate_pairing_code()
    expires_at = datetime.now(UTC) + timedelta(minutes=get_settings().pairing_code_ttl_minutes)
    device = device_repo.create(
        db,
        patient_id=patient_id,
        label=data.label,
        code_hash=security.hash_pairing_code(code),
        expires_at=expires_at,
    )
    db.commit()
    return {
        "device_id": device.id,
        "label": device.label,
        "pairing_code": code,  # shown once; only its hash is stored
        "pairing_expires_at": expires_at,
    }


def claim_device(db: Session, pairing_code: str) -> dict:
    device = device_repo.get_by_code_hash(db, security.hash_pairing_code(pairing_code))
    if (
        device is None
        or device.revoked
        or device.claimed_at is not None
        or device.pairing_expires_at is None
        or device.pairing_expires_at <= datetime.now(UTC)
    ):
        raise AuthenticationError("Invalid or expired pairing code.")

    patient = patient_repo.get(db, device.patient_id)
    if patient is None:
        raise NotFoundError("Patient not found.")

    token, jti, _ = security.create_device_token(patient.id)
    device.token_jti = jti
    device.claimed_at = datetime.now(UTC)
    device.pairing_code_hash = None  # burn the code
    device.pairing_expires_at = None
    db.add(device)
    db.commit()

    return {"access_token": token, "patient_id": patient.id, "patient_name": patient.full_name}


def list_devices(db: Session, patient_id: int, caregiver: User):
    require_patient_access(db, patient_id, caregiver)
    return device_repo.list_for_patient(db, patient_id)


def revoke_device(db: Session, device_id: int, caregiver: User) -> None:
    device = device_repo.get(db, device_id)
    if device is None:
        raise NotFoundError("Device not found.")
    require_patient_access(db, device.patient_id, caregiver, owner_only=True)
    device.revoked = True
    db.add(device)
    db.commit()
