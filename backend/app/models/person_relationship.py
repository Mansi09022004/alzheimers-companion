"""Person-to-person edges — the small "family graph".

Read as: `from_person` is the `relationship` of `to_person`.
e.g. from=Meera, to=Rahul, relationship=spouse  ->  "Meera is Rahul's spouse".

Kept in a plain SQL table (self-join), not a graph database — the graph is a family,
a recursive query is more than enough.
"""

import enum

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin


class RelationshipType(str, enum.Enum):
    parent = "parent"
    child = "child"
    spouse = "spouse"
    sibling = "sibling"
    grandparent = "grandparent"
    grandchild = "grandchild"
    friend = "friend"
    other = "other"


class PersonRelationship(TimestampMixin, Base):
    __tablename__ = "person_relationships"
    __table_args__ = (
        UniqueConstraint(
            "from_person_id", "to_person_id", "relationship", name="uq_person_relationship"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    from_person_id: Mapped[int] = mapped_column(
        ForeignKey("people.id", ondelete="CASCADE"), index=True, nullable=False
    )
    to_person_id: Mapped[int] = mapped_column(
        ForeignKey("people.id", ondelete="CASCADE"), index=True, nullable=False
    )
    relationship: Mapped[RelationshipType] = mapped_column(
        Enum(RelationshipType, name="relationship_type", native_enum=False, length=20),
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
