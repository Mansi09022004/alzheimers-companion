"""Database access for stored refresh tokens."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken


def create(db: Session, *, jti: str, user_id: int, expires_at: datetime) -> RefreshToken:
    row = RefreshToken(jti=jti, user_id=user_id, expires_at=expires_at)
    db.add(row)
    db.flush()
    return row


def get_by_jti(db: Session, jti: str) -> RefreshToken | None:
    return db.execute(
        select(RefreshToken).where(RefreshToken.jti == jti)
    ).scalar_one_or_none()


def revoke(db: Session, row: RefreshToken) -> None:
    row.revoked = True
    db.add(row)


def revoke_all_for_user(db: Session, user_id: int) -> None:
    rows = db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False)
        )
    ).scalars()
    for row in rows:
        row.revoked = True
        db.add(row)
