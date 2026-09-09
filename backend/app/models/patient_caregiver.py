"""Link table: which caregivers may access which patient, and at what level.

`owner`  — full control, can add/remove other caregivers and delete the patient.
`viewer` — read + normal updates, cannot manage caregivers or delete the patient.

Authorization everywhere in the app is "does a row exist here for (patient, caregiver)?".
"""

import enum

from sqlalchemy import Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class AccessLevel(str, enum.Enum):
    owner = "owner"
    viewer = "viewer"


class PatientCaregiver(TimestampMixin, Base):
    __tablename__ = "patient_caregivers"
    __table_args__ = (UniqueConstraint("patient_id", "caregiver_id", name="uq_patient_caregiver"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    caregiver_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    access_level: Mapped[AccessLevel] = mapped_column(
        Enum(AccessLevel, name="access_level", native_enum=False, length=10),
        nullable=False,
        default=AccessLevel.owner,
    )

    patient: Mapped["PatientProfile"] = relationship(back_populates="caregiver_links")  # noqa: F821
