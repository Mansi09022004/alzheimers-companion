"""Authentication routes.

Thin handlers: parse the validated request, call the auth service, shape the response.
Domain errors raised by the service are converted to HTTP responses by the handlers
registered in `app/main.py`.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)) -> User:
    """Register a caregiver account. (Patient accounts are created by a caregiver later.)"""
    return auth_service.register_caregiver(db, data)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = auth_service.authenticate(db, data.email, data.password)
    return auth_service.issue_token_pair(db, user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return auth_service.rotate_refresh_token(db, data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(data: RefreshRequest, db: Session = Depends(get_db)) -> None:
    auth_service.logout(db, data.refresh_token)


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> User:
    return user
