""""Today's Tasks" business logic — simple one-off to-dos, addable by either the
caregiver (dashboard) or the patient (device), completable by either.
"""

from datetime import UTC, date, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.patient_profile import PatientProfile
from app.models.task import Task
from app.models.user import User
from app.repositories import task_repo
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.access import require_patient_access


# --- caregiver (dashboard) -------------------------------------------------

def create_task(db: Session, patient_id: int, data: TaskCreate, user: User) -> Task:
    require_patient_access(db, patient_id, user)
    task = task_repo.create(
        db,
        patient_id=patient_id,
        task_date=data.task_date or date.today(),
        text=data.text,
        created_by=user.id,
    )
    db.commit()
    db.refresh(task)
    return task


def list_tasks(db: Session, patient_id: int, user: User, *, task_date: date | None) -> list[Task]:
    require_patient_access(db, patient_id, user)
    if task_date is not None:
        return task_repo.list_for_date(db, patient_id, task_date)
    return task_repo.list_for_patient(db, patient_id)


def update_task(db: Session, task_id: int, data: TaskUpdate, user: User) -> Task:
    task = _get_for_user(db, task_id, user)
    if data.text is not None:
        task.text = data.text
    if data.completed is not None:
        _apply_completed(task, data.completed)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int, user: User) -> None:
    task = _get_for_user(db, task_id, user)
    task_repo.delete(db, task)
    db.commit()


def _get_for_user(db: Session, task_id: int, user: User) -> Task:
    task = task_repo.get(db, task_id)
    if task is None:
        raise NotFoundError("Task not found.")
    require_patient_access(db, task.patient_id, user)
    return task


# --- patient (device) -------------------------------------------------------

def patient_create_task(db: Session, patient: PatientProfile, data: TaskCreate) -> Task:
    task = task_repo.create(
        db,
        patient_id=patient.id,
        task_date=data.task_date or date.today(),
        text=data.text,
        created_by=None,
    )
    db.commit()
    db.refresh(task)
    return task


def patient_list_for_date(db: Session, patient: PatientProfile, task_date: date) -> list[Task]:
    return task_repo.list_for_date(db, patient.id, task_date)


def patient_set_completed(db: Session, patient: PatientProfile, task_id: int, completed: bool) -> Task:
    task = task_repo.get(db, task_id)
    if task is None or task.patient_id != patient.id:
        raise NotFoundError("Task not found.")
    _apply_completed(task, completed)
    db.commit()
    db.refresh(task)
    return task


def patient_delete_task(db: Session, patient: PatientProfile, task_id: int) -> None:
    task = task_repo.get(db, task_id)
    if task is None or task.patient_id != patient.id:
        raise NotFoundError("Task not found.")
    task_repo.delete(db, task)
    db.commit()


def _apply_completed(task: Task, completed: bool) -> None:
    task.completed = completed
    task.completed_at = datetime.now(UTC) if completed else None
