"""Caregiver-side read access to the patient's 'My Day' journal.

Writing is patient-only (from the device); caregivers only ever read it — used by
the dashboard's daily summary to count today's entries.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User, UserRole
from app.schemas.journal import JournalEntryResponse
from app.services import journal_service
from app.services.access import require_patient_access

_caregiver = require_role(UserRole.caregiver)

patient_journal_router = APIRouter(prefix="/patients/{patient_id}", tags=["journal"])


@patient_journal_router.get("/journal", response_model=list[JournalEntryResponse])
def list_journal(
    patient_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    access = require_patient_access(db, patient_id, user)
    return journal_service.list_entries(db, access.patient)
