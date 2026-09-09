"""Authentication business logic.

Owns the transaction (commit/rollback). Routes call these functions; they never
touch the database or security primitives directly.

Flow summary:
  register  -> create user with an Argon2 password hash
  login     -> verify password, then issue an access + refresh token pair
  refresh   -> validate the stored refresh token, ROTATE it (revoke old, issue new)
  logout    -> revoke the presented refresh token
"""

from datetime import UTC, datetime

import jwt
from sqlalchemy.orm import Session

from app.core import security
from app.core.exceptions import AuthenticationError, ConflictError
from app.models.user import User, UserRole
from app.repositories import refresh_token_repo, user_repo
from app.schemas.auth import RegisterRequest, TokenResponse


def register_caregiver(db: Session, data: RegisterRequest) -> User:
    if user_repo.get_by_email(db, data.email):
        raise ConflictError("An account with this email already exists.")
    user = user_repo.create(
        db,
        email=data.email,
        password_hash=security.hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.caregiver,
    )
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User:
    user = user_repo.get_by_email(db, email)
    # Same error whether the email is unknown or the password is wrong — do not leak
    # which emails are registered.
    if user is None or user.password_hash is None:
        raise AuthenticationError("Incorrect email or password.")
    if not security.verify_password(password, user.password_hash):
        raise AuthenticationError("Incorrect email or password.")
    if not user.is_active:
        raise AuthenticationError("This account is disabled.")
    return user


def issue_token_pair(db: Session, user: User) -> TokenResponse:
    access = security.create_access_token(user.id, user.role.value)
    refresh, jti, expires_at = security.create_refresh_token(user.id)
    refresh_token_repo.create(db, jti=jti, user_id=user.id, expires_at=expires_at)
    db.commit()
    return TokenResponse(access_token=access, refresh_token=refresh)


def rotate_refresh_token(db: Session, raw_refresh: str) -> TokenResponse:
    try:
        payload = security.decode_token(raw_refresh, expected_type="refresh")
    except jwt.InvalidTokenError as exc:
        raise AuthenticationError("Invalid or expired refresh token.") from exc

    stored = refresh_token_repo.get_by_jti(db, payload["jti"])
    if stored is None or stored.revoked:
        raise AuthenticationError("Refresh token is no longer valid.")
    if stored.expires_at <= datetime.now(UTC):
        raise AuthenticationError("Refresh token has expired.")

    user = user_repo.get_by_id(db, int(payload["sub"]))
    if user is None or not user.is_active:
        raise AuthenticationError("Account not found or disabled.")

    # Rotation: the old refresh token can only be used once.
    refresh_token_repo.revoke(db, stored)
    return issue_token_pair(db, user)


def logout(db: Session, raw_refresh: str) -> None:
    try:
        payload = security.decode_token(raw_refresh, expected_type="refresh")
    except jwt.InvalidTokenError:
        return  # nothing to do; treat as already logged out
    stored = refresh_token_repo.get_by_jti(db, payload.get("jti", ""))
    if stored and not stored.revoked:
        refresh_token_repo.revoke(db, stored)
        db.commit()
