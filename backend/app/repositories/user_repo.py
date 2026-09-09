"""Database access for `User`. Only queries live here — no business rules."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole


def get_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_by_email(db: Session, email: str) -> User | None:
    return db.execute(select(User).where(User.email == email)).scalar_one_or_none()


def create(db: Session, *, email: str, password_hash: str | None, full_name: str,
           role: UserRole) -> User:
    user = User(email=email, password_hash=password_hash, full_name=full_name, role=role)
    db.add(user)
    db.flush()  # assigns user.id without committing (service controls the transaction)
    return user
