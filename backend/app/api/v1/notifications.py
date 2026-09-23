"""Caregiver Web Push subscriptions (browser alerts, no dashboard tab required)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User, UserRole
from app.repositories import push_subscription_repo
from app.schemas.push_subscription import PushSubscriptionCreate, PushSubscriptionDelete

router = APIRouter(prefix="/notifications", tags=["notifications"])
_caregiver = require_role(UserRole.caregiver)


@router.post("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
def subscribe(
    data: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    push_subscription_repo.upsert(db, user.id, data.endpoint, data.keys.p256dh, data.keys.auth)
    db.commit()


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe(
    data: PushSubscriptionDelete,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    push_subscription_repo.remove(db, user.id, data.endpoint)
    db.commit()
