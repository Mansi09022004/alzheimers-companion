"""Import every model here so Alembic autogenerate and `Base.metadata` see them."""

from app.models.alert import Alert, AlertSeverity, AlertType
from app.models.caregiver_profile import CaregiverProfile
from app.models.consent import Consent
from app.models.emergency_contact import EmergencyContact
from app.models.geofence import (
    Geofence,
    GeofenceEvent,
    GeofenceEventType,
    GeofenceState,
)
from app.models.face_embedding import FaceEmbedding
from app.models.location import Location
from app.models.medication import DoseStatus, Medication, MedicationLog
from app.models.memory import Memory, MemorySource, MemoryStatus
from app.models.memory_source import MemoryOrigin, MemorySourceRecord
from app.models.patient_caregiver import AccessLevel, PatientCaregiver
from app.models.patient_device import PatientDevice
from app.models.patient_profile import PatientProfile
from app.models.person import Person
from app.models.person_relationship import PersonRelationship, RelationshipType
from app.models.routine import RoutineCompletion, RoutineItem
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole

__all__ = [
    "User",
    "UserRole",
    "RefreshToken",
    "CaregiverProfile",
    "PatientProfile",
    "PatientCaregiver",
    "PatientDevice",
    "AccessLevel",
    "Person",
    "PersonRelationship",
    "RelationshipType",
    "Consent",
    "FaceEmbedding",
    "Memory",
    "MemoryStatus",
    "MemorySource",
    "MemorySourceRecord",
    "MemoryOrigin",
    "Medication",
    "MedicationLog",
    "DoseStatus",
    "RoutineItem",
    "RoutineCompletion",
    "Location",
    "Geofence",
    "GeofenceState",
    "GeofenceEvent",
    "GeofenceEventType",
    "Alert",
    "AlertType",
    "AlertSeverity",
    "EmergencyContact",
]
