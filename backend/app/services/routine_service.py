"""Daily routine business logic. Same shape as medication_service, minus adherence."""

from datetime import UTC, date, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.patient_profile import PatientProfile
from app.models.routine import RoutineItem
from app.models.user import User
from app.repositories import routine_repo
from app.schemas.routine import CompleteRoutineRequest, RoutineCreate, RoutineUpdate
from app.services.access import require_patient_access


def create_item(db: Session, patient_id: int, data: RoutineCreate, user: User) -> RoutineItem:
    require_patient_access(db, patient_id, user)
    item = routine_repo.create(db, patient_id=patient_id, created_by=user.id, **data.model_dump())
    db.commit()
    db.refresh(item)
    return item


def list_items(db: Session, patient_id: int, user: User) -> list[RoutineItem]:
    require_patient_access(db, patient_id, user)
    return routine_repo.list_for_patient(db, patient_id)


def _get_for_user(db: Session, item_id: int, user: User) -> RoutineItem:
    item = routine_repo.get(db, item_id)
    if item is None:
        raise NotFoundError("Routine item not found.")
    require_patient_access(db, item.patient_id, user)
    return item


def update_item(db: Session, item_id: int, data: RoutineUpdate, user: User) -> RoutineItem:
    item = _get_for_user(db, item_id, user)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, item_id: int, user: User) -> None:
    item = _get_for_user(db, item_id, user)
    routine_repo.delete(db, item)
    db.commit()


def _today_items(db: Session, patient_id: int, day: date) -> list[RoutineItem]:
    weekday = day.weekday()  # Mon = 0
    return [
        i for i in routine_repo.list_for_patient(db, patient_id, active_only=True)
        if weekday in i.days_of_week
    ]


def today_for_patient(db: Session, patient: PatientProfile, local_now: datetime | None) -> list[dict]:
    now = local_now or datetime.now(UTC)
    day = now.date()
    items = _today_items(db, patient.id, day)
    done = routine_repo.completions_on(db, [i.id for i in items], day)
    return [
        {"routine_item_id": i.id, "title": i.title, "time_of_day": i.time_of_day, "done": i.id in done}
        for i in items
    ]


def _complete(
    db: Session, item: RoutineItem, data: CompleteRoutineRequest, marked_via: str
) -> dict:
    if data.done:
        routine_repo.set_completion(
            db, item_id=item.id, d=data.on_date, completed_at=datetime.now(UTC), marked_via=marked_via
        )
    else:
        routine_repo.clear_completion(db, item.id, data.on_date)
    db.commit()
    return {"routine_item_id": item.id, "on_date": data.on_date, "done": data.done}


def patient_complete(db: Session, patient: PatientProfile, item_id: int, data: CompleteRoutineRequest):
    item = routine_repo.get(db, item_id)
    if item is None or item.patient_id != patient.id:
        raise NotFoundError("Routine item not found.")
    return _complete(db, item, data, "patient")


def caregiver_complete(db: Session, item_id: int, data: CompleteRoutineRequest, user: User):
    item = _get_for_user(db, item_id, user)
    return _complete(db, item, data, "caregiver")


def next_routine_hint(db: Session, patient: PatientProfile, now: datetime) -> str | None:
    """Context Engine: the next not-yet-done routine item today."""
    items = today_for_patient(db, patient, now)
    hhmm = now.strftime("%H:%M")
    upcoming = [i for i in items if not i["done"] and i["time_of_day"] >= hhmm]
    if not upcoming:
        return None
    nxt = upcoming[0]
    hh, mm = nxt["time_of_day"].split(":")
    hour12 = ((int(hh) - 1) % 12) + 1
    ampm = "am" if int(hh) < 12 else "pm"
    when = f"{hour12} {ampm}" if mm == "00" else f"{hour12}:{mm} {ampm}"
    return f"At {when}: {nxt['title']}."
