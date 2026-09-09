"""Import every model here so Alembic autogenerate and `Base.metadata` see them."""

from app.models.caregiver_profile import CaregiverProfile
from app.models.patient_caregiver import AccessLevel, PatientCaregiver
from app.models.patient_profile import PatientProfile
from app.models.person import Person
from app.models.person_relationship import PersonRelationship, RelationshipType
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole

__all__ = [
    "User",
    "UserRole",
    "RefreshToken",
    "CaregiverProfile",
    "PatientProfile",
    "PatientCaregiver",
    "AccessLevel",
    "Person",
    "PersonRelationship",
    "RelationshipType",
]
