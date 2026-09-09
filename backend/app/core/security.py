"""Password hashing (Argon2) and JWT creation / verification.

Pure functions — no database, no FastAPI. This keeps them trivially testable and
reusable. Token *storage / revocation* lives in the auth service, not here.
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import get_settings

_ph = PasswordHasher()  # sensible defaults (memory/time cost) from the argon2 library

TokenType = Literal["access", "refresh"]


# --- passwords ---------------------------------------------------------------

def hash_password(plain: str) -> str:
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, plain)
    except VerifyMismatchError:
        return False


# --- JWT --------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(UTC)


def _encode(payload: dict[str, Any], expires: timedelta) -> str:
    s = get_settings()
    now = _now()
    payload = {**payload, "iat": now, "exp": now + expires}
    return jwt.encode(payload, s.jwt_secret_key, algorithm=s.jwt_algorithm)


def create_access_token(user_id: int, role: str) -> str:
    s = get_settings()
    return _encode(
        {"sub": str(user_id), "role": role, "type": "access"},
        timedelta(minutes=s.access_token_expire_minutes),
    )


def create_refresh_token(user_id: int) -> tuple[str, str, datetime]:
    """Return (token, jti, expires_at). The jti is stored so the token can be revoked."""
    s = get_settings()
    jti = uuid.uuid4().hex
    expires_at = _now() + timedelta(days=s.refresh_token_expire_days)
    token = _encode({"sub": str(user_id), "type": "refresh", "jti": jti},
                    timedelta(days=s.refresh_token_expire_days))
    return token, jti, expires_at


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    """Verify signature + expiry + token type. Raises `jwt.InvalidTokenError` on failure."""
    s = get_settings()
    payload = jwt.decode(token, s.jwt_secret_key, algorithms=[s.jwt_algorithm])
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(f"expected a {expected_type} token")
    return payload
