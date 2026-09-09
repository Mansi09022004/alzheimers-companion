"""Database access for routine items and completions."""

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.routine import RoutineCompletion, RoutineItem


def create(db: Session, **fields) -> RoutineItem:
    item = RoutineItem(**fields)
    db.add(item)
    db.flush()
    return item


def get(db: Session, item_id: int) -> RoutineItem | None:
    return db.get(RoutineItem, item_id)


def list_for_patient(db: Session, patient_id: int, *, active_only: bool = False) -> list[RoutineItem]:
    stmt = select(RoutineItem).where(RoutineItem.patient_id == patient_id)
    if active_only:
        stmt = stmt.where(RoutineItem.active.is_(True))
    return list(db.execute(stmt.order_by(RoutineItem.time_of_day)).scalars())


def delete(db: Session, item: RoutineItem) -> None:
    db.delete(item)


def completions_on(db: Session, item_ids: list[int], d: date) -> set[int]:
    if not item_ids:
        return set()
    rows = db.execute(
        select(RoutineCompletion.routine_item_id).where(
            RoutineCompletion.routine_item_id.in_(item_ids),
            RoutineCompletion.on_date == d,
        )
    ).scalars()
    return set(rows)


def get_completion(db: Session, item_id: int, d: date) -> RoutineCompletion | None:
    return db.execute(
        select(RoutineCompletion).where(
            RoutineCompletion.routine_item_id == item_id,
            RoutineCompletion.on_date == d,
        )
    ).scalar_one_or_none()


def set_completion(db: Session, *, item_id: int, d: date, completed_at, marked_via: str):
    existing = get_completion(db, item_id, d)
    if existing:
        existing.completed_at = completed_at
        existing.marked_via = marked_via
        db.add(existing)
        return existing
    row = RoutineCompletion(
        routine_item_id=item_id, on_date=d, completed_at=completed_at, marked_via=marked_via
    )
    db.add(row)
    db.flush()
    return row


def clear_completion(db: Session, item_id: int, d: date) -> None:
    existing = get_completion(db, item_id, d)
    if existing:
        db.delete(existing)
