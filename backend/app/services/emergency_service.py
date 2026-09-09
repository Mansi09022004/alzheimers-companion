"""Emergency contacts (caregiver CRUD) + the SOS trigger (patient).

SOS favours availability over strictness: it works even with a slightly stale token
and it always creates the alert. A 30-second dedup window collapses accidental
double-taps into one alert.

Actual delivery (push to caregivers, SMS to contacts) is Phase 16 — for now the SOS
creates a `critical` alert with the latest known location baked into its context.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.alert import Alert, AlertSeverity, AlertType
from app.models.patient_caregiver import PatientCaregiver
from app.models.patient_profile import PatientProfile
from app.models.user import User
from app.repositories import alert_repo, emergency_repo, location_repo
from app.schemas.emergency import EmergencyContactCreate, EmergencyContactUpdate, SosRequest
from app.services.access import require_patient_access

_DEDUP_SECONDS = 30


# --- caregiver: contacts CRUD ---

def add_contact(db: Session, patient_id: int, data: EmergencyContactCreate, user: User):
    require_patient_access(db, patient_id, user)
    contact = emergency_repo.create(
        db, patient_id=patient_id, created_by=user.id, **data.model_dump()
    )
    db.commit()
    db.refresh(contact)
    return contact


def list_contacts(db: Session, patient_id: int, user: User):
    require_patient_access(db, patient_id, user)
    return emergency_repo.list_for_patient(db, patient_id)


def _get_for_user(db: Session, contact_id: int, user: User):
    contact = emergency_repo.get(db, contact_id)
    if contact is None:
        raise NotFoundError("Contact not found.")
    require_patient_access(db, contact.patient_id, user)
    return contact


def update_contact(db: Session, contact_id: int, data: EmergencyContactUpdate, user: User):
    contact = _get_for_user(db, contact_id, user)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(contact, k, v)
    db.commit()
    db.refresh(contact)
    return contact


def delete_contact(db: Session, contact_id: int, user: User) -> None:
    contact = _get_for_user(db, contact_id, user)
    emergency_repo.delete(db, contact)
    db.commit()


# --- patient: SOS ---

def trigger_sos(db: Session, patient: PatientProfile, data: SosRequest) -> dict:
    now = datetime.now(UTC)

    recent = db.execute(
        select(Alert).where(
            Alert.patient_id == patient.id,
            Alert.type == AlertType.sos,
            Alert.created_at >= now - timedelta(seconds=_DEDUP_SECONDS),
        )
    ).scalars().first()

    contacts = emergency_repo.list_for_patient(db, patient.id)
    caregiver_ids = list(
        db.execute(
            select(PatientCaregiver.caregiver_id).where(
                PatientCaregiver.patient_id == patient.id
            )
        ).scalars()
    )

    location = _resolve_location(db, patient.id, data)

    if recent is None:
        alert = alert_repo.create(
            db,
            patient_id=patient.id,
            type=AlertType.sos,
            severity=AlertSeverity.critical,
            reason_text=f"{patient.full_name} pressed the emergency button.",
            context={
                "triggered_at": now.isoformat(),
                "note": data.note,
                "location": location,
                "notified_caregiver_ids": caregiver_ids,
                "notified_contacts": [
                    {"name": c.name, "phone": c.phone, "priority": c.priority} for c in contacts
                ],
            },
        )
        db.commit()
        db.refresh(alert)
    else:
        alert = recent  # collapse a double-tap

    return {
        "alert_id": alert.id,
        "message": "Help is on the way. Your caregivers have been told.",
        "notified_caregivers": len(caregiver_ids),
        "notified_contacts": [c.name for c in contacts],
    }


def _resolve_location(db: Session, patient_id: int, data: SosRequest) -> dict | None:
    if data.lat is not None and data.lng is not None:
        return {"lat": data.lat, "lng": data.lng, "source": "sos_fix"}
    row = location_repo.latest(db, patient_id)
    if row is None:
        return None
    age = int((datetime.now(UTC) - row.recorded_at).total_seconds())
    return {"lat": row.lat, "lng": row.lng, "accuracy_m": row.accuracy_m,
            "age_seconds": max(age, 0), "source": "last_report"}
