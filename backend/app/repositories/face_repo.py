"""Database access for consents and face embeddings, including similarity search."""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.consent import Consent
from app.models.face_embedding import FaceEmbedding
from app.models.person import Person


# --- consent -------------------------------------------------------------

def active_consent(db: Session, person_id: int) -> Consent | None:
    return db.execute(
        select(Consent)
        .where(Consent.person_id == person_id, Consent.revoked_at.is_(None))
        .order_by(Consent.granted_at.desc())
    ).scalars().first()


def create_consent(
    db: Session, *, patient_id: int, person_id: int, granted_by: int, purpose: str
) -> Consent:
    consent = Consent(
        patient_id=patient_id, person_id=person_id, granted_by=granted_by, purpose=purpose
    )
    db.add(consent)
    db.flush()
    return consent


def revoke_consents(db: Session, person_id: int) -> None:
    rows = db.execute(
        select(Consent).where(Consent.person_id == person_id, Consent.revoked_at.is_(None))
    ).scalars()
    now = datetime.now(UTC)
    for row in rows:
        row.revoked_at = now
        db.add(row)


# --- face embeddings ---------------------------------------------------

def add_embedding(
    db: Session, *, person_id: int, vector: list[float], model_version: str,
    det_score: float, created_by: int,
) -> FaceEmbedding:
    row = FaceEmbedding(
        person_id=person_id, embedding=vector, model_version=model_version,
        det_score=det_score, created_by=created_by,
    )
    db.add(row)
    db.flush()
    return row


def list_for_person(db: Session, person_id: int) -> list[FaceEmbedding]:
    return list(
        db.execute(
            select(FaceEmbedding)
            .where(FaceEmbedding.person_id == person_id)
            .order_by(FaceEmbedding.created_at.desc())
        ).scalars()
    )


def get(db: Session, face_id: int) -> FaceEmbedding | None:
    return db.get(FaceEmbedding, face_id)


def delete(db: Session, row: FaceEmbedding) -> None:
    db.delete(row)


def nearest_person(
    db: Session, *, patient_id: int, query_vector: list[float], model_version: str
) -> tuple[int, str, str, float] | None:
    """Return (person_id, display_name, relationship_label, cosine_similarity) for the
    closest registered face belonging to this patient's active people, or None.
    Only embeddings from the same model are comparable, so others are ignored."""
    distance = FaceEmbedding.embedding.cosine_distance(query_vector)
    stmt = (
        select(
            Person.id,
            Person.display_name,
            Person.relationship_label,
            distance.label("distance"),
        )
        .join(Person, Person.id == FaceEmbedding.person_id)
        .where(
            Person.patient_id == patient_id,
            Person.is_active.is_(True),
            FaceEmbedding.model_version == model_version,
        )
        .order_by(distance)
        .limit(1)
    )
    row = db.execute(stmt).first()
    if row is None:
        return None
    person_id, name, label, dist = row
    return person_id, name, label, 1.0 - float(dist)  # cosine similarity
