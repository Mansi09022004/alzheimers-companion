"""FastAPI dependencies for authentication and role checks.

- `get_current_user`  : reads the Bearer access token, verifies it, loads the user.
- `require_role(...)`  : dependency factory — 403s unless the user has one of the roles.

Usage in a route:
    @router.get("/patients")
    def list_patients(user: User = Depends(require_role(UserRole.caregiver))):
        ...
"""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core import security
from app.core.database import get_db
from app.models.user import User, UserRole
from app.repositories import user_repo

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = security.decode_token(creds.credentials, expected_type="access")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user = user_repo.get_by_id(db, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account not found or disabled")
    return user


def require_role(*roles: UserRole):
    def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Requires role: {', '.join(r.value for r in roles)}",
            )
        return user

    return _dep
