"""Database access for "Today's Tasks"."""

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task


def create(db: Session, *, patient_id: int, task_date: date, text: str, created_by: int | None) -> Task:
    task = Task(patient_id=patient_id, task_date=task_date, text=text, created_by=created_by)
    db.add(task)
    db.flush()
    return task


def get(db: Session, task_id: int) -> Task | None:
    return db.get(Task, task_id)


def list_for_date(db: Session, patient_id: int, task_date: date) -> list[Task]:
    stmt = (
        select(Task)
        .where(Task.patient_id == patient_id, Task.task_date == task_date)
        .order_by(Task.created_at)
    )
    return list(db.execute(stmt).scalars())


def list_for_patient(db: Session, patient_id: int, *, limit: int = 200) -> list[Task]:
    stmt = (
        select(Task)
        .where(Task.patient_id == patient_id)
        .order_by(Task.task_date.desc(), Task.created_at)
        .limit(limit)
    )
    return list(db.execute(stmt).scalars())


def delete(db: Session, task: Task) -> None:
    db.delete(task)
