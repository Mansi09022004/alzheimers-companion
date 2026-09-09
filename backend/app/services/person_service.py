"""People (family members) + person-to-person relationship business logic.

Every function first checks the caller can access the patient, then checks that any
referenced person actually belongs to that patient (so you can't attach a stranger's
person id to your patient).
"""

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.models.person import Person
from app.models.user import User
from app.repositories import person_repo
from app.schemas.person import PersonCreate, PersonUpdate, RelationshipCreate
from app.services.access import require_patient_access


# --- people ---------------------------------------------------------------

def add_person(db: Session, patient_id: int, data: PersonCreate, user: User) -> Person:
    require_patient_access(db, patient_id, user)
    person = person_repo.create(
        db, patient_id=patient_id, data=data.model_dump(exclude_unset=True), created_by=user.id
    )
    db.commit()
    db.refresh(person)
    return person


def list_people(db: Session, patient_id: int, user: User) -> list[Person]:
    require_patient_access(db, patient_id, user)
    return person_repo.list_for_patient(db, patient_id)


def update_person(db: Session, person_id: int, data: PersonUpdate, user: User) -> Person:
    person = _get_person_for_user(db, person_id, user)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(person, field, value)
    db.commit()
    db.refresh(person)
    return person


def delete_person(db: Session, person_id: int, user: User) -> None:
    person = _get_person_for_user(db, person_id, user)
    person_repo.delete(db, person)  # cascades to face embeddings + relationships later
    db.commit()


# --- relationships -------------------------------------------------------

def add_relationship(
    db: Session, patient_id: int, data: RelationshipCreate, user: User
):
    require_patient_access(db, patient_id, user)
    for pid in (data.from_person_id, data.to_person_id):
        person = person_repo.get(db, pid)
        if person is None or person.patient_id != patient_id:
            raise NotFoundError(f"Person {pid} does not belong to this patient.")
    if data.from_person_id == data.to_person_id:
        raise PermissionDeniedError("A person cannot have a relationship with themselves.")

    rel = person_repo.create_relationship(
        db, patient_id=patient_id, data=data.model_dump()
    )
    db.commit()
    db.refresh(rel)
    return rel


def list_relationships(db: Session, patient_id: int, user: User):
    require_patient_access(db, patient_id, user)
    return person_repo.list_relationships(db, patient_id)


def delete_relationship(db: Session, rel_id: int, user: User) -> None:
    rel = person_repo.get_relationship(db, rel_id)
    if rel is None:
        raise NotFoundError("Relationship not found.")
    require_patient_access(db, rel.patient_id, user)
    person_repo.delete_relationship(db, rel)
    db.commit()


def _get_person_for_user(db: Session, person_id: int, user: User) -> Person:
    person = person_repo.get(db, person_id)
    if person is None:
        raise NotFoundError("Person not found.")
    require_patient_access(db, person.patient_id, user)
    return person
