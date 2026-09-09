"""Family-member (people) routes and person-to-person relationship routes.

People are always addressed under a patient: /patients/{patient_id}/people ...
Single-person and single-relationship edits use their own id: /people/{id}, /relationships/{id}.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User, UserRole
from app.schemas.person import (
    PersonCreate,
    PersonResponse,
    PersonUpdate,
    RelationshipCreate,
    RelationshipResponse,
)
from app.services import person_service

_caregiver = require_role(UserRole.caregiver)

# mounted at /patients/{patient_id}/...
patient_people_router = APIRouter(prefix="/patients/{patient_id}", tags=["people"])
# mounted at /people/... and /relationships/...
people_router = APIRouter(tags=["people"])


@patient_people_router.get("/people", response_model=list[PersonResponse])
def list_people(
    patient_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    return person_service.list_people(db, patient_id, user)


@patient_people_router.post(
    "/people", response_model=PersonResponse, status_code=status.HTTP_201_CREATED
)
def add_person(
    patient_id: int,
    data: PersonCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return person_service.add_person(db, patient_id, data, user)


@patient_people_router.get("/relationships", response_model=list[RelationshipResponse])
def list_relationships(
    patient_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    return person_service.list_relationships(db, patient_id, user)


@patient_people_router.post(
    "/relationships",
    response_model=RelationshipResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_relationship(
    patient_id: int,
    data: RelationshipCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return person_service.add_relationship(db, patient_id, data, user)


@people_router.patch("/people/{person_id}", response_model=PersonResponse)
def update_person(
    person_id: int,
    data: PersonUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return person_service.update_person(db, person_id, data, user)


@people_router.delete("/people/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(
    person_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    person_service.delete_person(db, person_id, user)


@people_router.delete(
    "/relationships/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_relationship(
    relationship_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    person_service.delete_relationship(db, relationship_id, user)
