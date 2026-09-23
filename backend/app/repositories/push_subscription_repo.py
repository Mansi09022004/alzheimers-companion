"""Database access for caregiver Web Push subscriptions."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.push_subscription import PushSubscription


def upsert(db: Session, caregiver_id: int, endpoint: str, p256dh: str, auth: str) -> PushSubscription:
    existing = db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == endpoint)
    ).scalar_one_or_none()
    if existing is None:
        existing = PushSubscription(caregiver_id=caregiver_id, endpoint=endpoint, p256dh=p256dh, auth=auth)
        db.add(existing)
    else:
        existing.caregiver_id = caregiver_id
        existing.p256dh = p256dh
        existing.auth = auth
    db.flush()
    return existing


def remove(db: Session, caregiver_id: int, endpoint: str) -> None:
    sub = db.execute(
        select(PushSubscription).where(
            PushSubscription.caregiver_id == caregiver_id, PushSubscription.endpoint == endpoint
        )
    ).scalar_one_or_none()
    if sub is not None:
        db.delete(sub)


def list_for_caregiver(db: Session, caregiver_id: int) -> list[PushSubscription]:
    stmt = select(PushSubscription).where(PushSubscription.caregiver_id == caregiver_id)
    return list(db.execute(stmt).scalars())


def list_for_caregivers(db: Session, caregiver_ids: list[int]) -> list[PushSubscription]:
    if not caregiver_ids:
        return []
    stmt = select(PushSubscription).where(PushSubscription.caregiver_id.in_(caregiver_ids))
    return list(db.execute(stmt).scalars())


def delete_by_endpoint(db: Session, endpoint: str) -> None:
    sub = db.execute(select(PushSubscription).where(PushSubscription.endpoint == endpoint)).scalar_one_or_none()
    if sub is not None:
        db.delete(sub)
