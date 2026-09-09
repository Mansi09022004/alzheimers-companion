"""Database access for people and person-to-person relationships."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.person import Person
from app.models.person_relationship import PersonRelationship


# --- people ---------------------------------------------------------------

def create(db: Session, *, patient_id: int, data: dict, created_by: int) -> Person:
    person = Person(patient_id=patient_id, created_by=created_by, **data)
    db.add(person)
    db.flush()
    return person


def get(db: Session, person_id: int) -> Person | None:
    return db.get(Person, person_id)


def list_for_patient(db: Session, patient_id: int) -> list[Person]:
    return list(
        db.execute(
            select(Person)
            .where(Person.patient_id == patient_id)
            .order_by(Person.display_name)
        ).scalars()
    )


def delete(db: Session, person: Person) -> None:
    db.delete(person)


# --- relationships -------------------------------------------------------

def get_relationship(db: Session, rel_id: int) -> PersonRelationship | None:
    return db.get(PersonRelationship, rel_id)


def create_relationship(db: Session, *, patient_id: int, data: dict) -> PersonRelationship:
    rel = PersonRelationship(patient_id=patient_id, **data)
    db.add(rel)
    db.flush()
    return rel


def list_relationships(db: Session, patient_id: int) -> list[PersonRelationship]:
    return list(
        db.execute(
            select(PersonRelationship)
            .where(PersonRelationship.patient_id == patient_id)
            .order_by(PersonRelationship.id)
        ).scalars()
    )


def delete_relationship(db: Session, rel: PersonRelationship) -> None:
    db.delete(rel)
