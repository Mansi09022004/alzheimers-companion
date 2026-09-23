"""Caregiver-side "Today's Tasks" management."""

from datetime import date

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User, UserRole
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.services import task_service

_caregiver = require_role(UserRole.caregiver)

# mounted at /patients/{patient_id}/tasks
patient_tasks_router = APIRouter(prefix="/patients/{patient_id}", tags=["tasks"])
# mounted at /tasks/{id}
tasks_router = APIRouter(prefix="/tasks", tags=["tasks"])


@patient_tasks_router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    patient_id: int,
    data: TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return task_service.create_task(db, patient_id, data, user)


@patient_tasks_router.get("/tasks", response_model=list[TaskResponse])
def list_tasks(
    patient_id: int,
    task_date: date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return task_service.list_tasks(db, patient_id, user, task_date=task_date)


@tasks_router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return task_service.update_task(db, task_id, data, user)


@tasks_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    task_service.delete_task(db, task_id, user)
