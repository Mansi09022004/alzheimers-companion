"""Resource-level authorization for patient data.

Being a caregiver (role check) is not enough — you must be LINKED to the specific
patient. Every patient-scoped service call goes through `require_patient_access`.

Returns the `PatientProfile` plus the caller's `PatientCaregiver` link so callers
can also check `owner` vs `viewer` without another query.
"""

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.models.patient_caregiver import AccessLevel, PatientCaregiver
from app.models.patient_profile import PatientProfile
from app.models.user import User
from app.repositories import patient_repo


@dataclass
class PatientAccess:
    patient: PatientProfile
    link: PatientCaregiver

    @property
    def is_owner(self) -> bool:
        return self.link.access_level == AccessLevel.owner


def require_patient_access(
    db: Session, patient_id: int, user: User, *, owner_only: bool = False
) -> PatientAccess:
    patient = patient_repo.get(db, patient_id)
    link = patient_repo.get_link(db, patient_id, user.id)

    # Same 404 whether the patient doesn't exist or the caregiver isn't linked —
    # don't reveal the existence of patients a caregiver has no relationship with.
    if patient is None or link is None:
        raise NotFoundError("Patient not found.")

    if owner_only and link.access_level != AccessLevel.owner:
        raise PermissionDeniedError("This action requires owner access to the patient.")

    return PatientAccess(patient=patient, link=link)
