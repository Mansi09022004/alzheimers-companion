"""A person in the patient's life (family member, friend, carer).

`relationship_label` is this person's relation *to the patient* ("son", "wife",
"neighbour") — the common case for "Who is this?". Person-to-person links (e.g.
"Meera is married to Rahul") live in `person_relationships`.

Faces are registered against a Person in Phase 5, with an explicit consent record.
"""

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Person(TimestampMixin, Base):
    __tablename__ = "people"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    relationship_label: Mapped[str] = mapped_column(String(60), nullable=False)
    short_bio: Mapped[str | None] = mapped_column(String(500), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    patient: Mapped["PatientProfile"] = relationship(back_populates="people")  # noqa: F821
