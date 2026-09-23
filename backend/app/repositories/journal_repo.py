"""Database access for the patient's 'My Day' journal entries."""

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.journal_entry import JournalEntry


def get_for_date(db: Session, patient_id: int, entry_date: date) -> JournalEntry | None:
    stmt = select(JournalEntry).where(
        JournalEntry.patient_id == patient_id, JournalEntry.entry_date == entry_date
    )
    return db.execute(stmt).scalar_one_or_none()


def list_for_patient(db: Session, patient_id: int) -> list[JournalEntry]:
    stmt = (
        select(JournalEntry)
        .where(JournalEntry.patient_id == patient_id)
        .order_by(JournalEntry.entry_date.desc())
    )
    return list(db.execute(stmt).scalars())


def upsert(db: Session, patient_id: int, entry_date: date, text: str) -> JournalEntry:
    entry = get_for_date(db, patient_id, entry_date)
    if entry is None:
        entry = JournalEntry(patient_id=patient_id, entry_date=entry_date, text=text)
        db.add(entry)
    else:
        entry.text = text
    db.flush()
    return entry
