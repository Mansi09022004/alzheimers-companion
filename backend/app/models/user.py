"""User account model.

One row per login identity. `role` decides what a user is allowed to do.

Note: patients with dementia do not manage passwords — their accounts are created
by a caregiver and the mobile device is provisioned with a long-lived token
(Phase 4). So `password_hash` is nullable: a caregiver row always has one, a
patient row may not.
"""

import enum

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class UserRole(str, enum.Enum):
    caregiver = "caregiver"
    patient = "patient"


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False, length=20),
        nullable=False,
        default=UserRole.caregiver,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(  # noqa: F821
        back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # helpful in logs / tests
        return f"<User id={self.id} email={self.email!r} role={self.role.value}>"
