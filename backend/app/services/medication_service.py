"""Medication schedules, the patient "today" view, dose logging, and adherence.

No dose rows are pre-created. The "today" view is computed from each medication's
`schedule_times` against the logs that exist:

  log exists            -> its stored status (taken / skipped / missed)
  no log, time upcoming  -> "upcoming"
  no log, time is now-ish -> "due"       (within GRACE_MINUTES after the scheduled time)
  no log, time long past  -> "missed"

`marked_via = "patient"` means the patient tapped "I took it" on their device;
`"caregiver"` means a caregiver recorded it.
"""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.models.medication import DoseStatus, Medication
from app.models.patient_profile import PatientProfile
from app.models.user import User
from app.repositories import medication_repo
from app.schemas.medication import MedicationCreate, MedicationUpdate, TakeDoseRequest
from app.services.access import require_patient_access

GRACE_MINUTES = 90  # a dose stays "due" this long after its time before it counts as missed


# --- caregiver: schedule CRUD ---

def create_medication(db: Session, patient_id: int, data: MedicationCreate, user: User) -> Medication:
    require_patient_access(db, patient_id, user)
    med = medication_repo.create(
        db, patient_id=patient_id, created_by=user.id, **data.model_dump()
    )
    db.commit()
    db.refresh(med)
    return med


def list_medications(db: Session, patient_id: int, user: User) -> list[Medication]:
    require_patient_access(db, patient_id, user)
    return medication_repo.list_for_patient(db, patient_id)


def _get_med_for_user(db: Session, medication_id: int, user: User) -> Medication:
    med = medication_repo.get(db, medication_id)
    if med is None:
        raise NotFoundError("Medication not found.")
    require_patient_access(db, med.patient_id, user)
    return med


def update_medication(db: Session, medication_id: int, data: MedicationUpdate, user: User) -> Medication:
    med = _get_med_for_user(db, medication_id, user)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(med, k, v)
    db.commit()
    db.refresh(med)
    return med


def delete_medication(db: Session, medication_id: int, user: User) -> None:
    med = _get_med_for_user(db, medication_id, user)
    medication_repo.delete(db, med)
    db.commit()


# --- shared: compute a dose's view status ---

def _view_status(stored: DoseStatus | None, slot_dt: datetime, now: datetime) -> str:
    if stored is not None:
        return stored.value
    if slot_dt > now:
        return "upcoming"
    if slot_dt + timedelta(minutes=GRACE_MINUTES) >= now:
        return "due"
    return "missed"


def _slots_for_day(
    db: Session, meds: list[Medication], day: date, now: datetime
) -> list[dict]:
    out: list[dict] = []
    for med in meds:
        for t in med.schedule_times:
            hh, mm = (int(x) for x in t.split(":"))
            slot_dt = datetime(day.year, day.month, day.day, hh, mm, tzinfo=UTC)
            log = medication_repo.get_log(db, med.id, day, t)
            out.append(
                {
                    "medication_id": med.id,
                    "name": med.name,
                    "dosage_note": med.dosage_note,
                    "time": t,
                    "status": _view_status(log.status if log else None, slot_dt, now),
                }
            )
    out.sort(key=lambda s: s["time"])
    return out


# --- patient: today + logging ---

def today_for_patient(db: Session, patient: PatientProfile, local_now: datetime | None) -> list[dict]:
    now = local_now or datetime.now(UTC)
    day = now.date()
    meds = medication_repo.list_for_patient(db, patient.id, active_only=True)
    return _slots_for_day(db, meds, day, now)


def _record_dose(
    db: Session,
    *,
    medication: Medication,
    scheduled_date: date,
    scheduled_time: str,
    status: DoseStatus,
    marked_via: str,
    marked_by: int | None,
    marked_at: datetime | None,
):
    if scheduled_time not in medication.schedule_times:
        raise PermissionDeniedError("That time is not on this medication's schedule.")
    log = medication_repo.upsert_log(
        db,
        medication_id=medication.id,
        scheduled_date=scheduled_date,
        scheduled_time=scheduled_time,
        status=status,
        marked_via=marked_via,
        marked_by=marked_by,
        marked_at=marked_at or datetime.now(UTC),
    )
    db.commit()
    db.refresh(log)
    return log


def patient_take_dose(
    db: Session, patient: PatientProfile, medication_id: int, time: str, data: TakeDoseRequest
):
    med = medication_repo.get(db, medication_id)
    if med is None or med.patient_id != patient.id:
        raise NotFoundError("Medication not found.")
    return _record_dose(
        db,
        medication=med,
        scheduled_date=data.scheduled_date,
        scheduled_time=time,
        status=DoseStatus(data.status),
        marked_via="patient",
        marked_by=None,
        marked_at=data.marked_at,
    )


def caregiver_record_dose(
    db: Session, medication_id: int, time: str, data: TakeDoseRequest, user: User
):
    med = _get_med_for_user(db, medication_id, user)
    return _record_dose(
        db,
        medication=med,
        scheduled_date=data.scheduled_date,
        scheduled_time=time,
        status=DoseStatus(data.status),
        marked_via="caregiver",
        marked_by=user.id,
        marked_at=data.marked_at,
    )


# --- caregiver: adherence ---

def adherence(
    db: Session, patient_id: int, from_date: date, to_date: date, user: User, now: datetime
) -> dict:
    require_patient_access(db, patient_id, user)
    meds = medication_repo.list_for_patient(db, patient_id)
    logs = {
        (log.medication_id, log.scheduled_date, log.scheduled_time): log
        for log in medication_repo.logs_in_range(db, patient_id, from_date, to_date)
    }

    days: list[dict] = []
    totals = {"taken": 0, "missed": 0, "skipped": 0}
    d = from_date
    while d <= to_date:
        day_counts = {"taken": 0, "missed": 0, "skipped": 0, "upcoming": 0}
        for med in meds:
            for t in med.schedule_times:
                hh, mm = (int(x) for x in t.split(":"))
                slot_dt = datetime(d.year, d.month, d.day, hh, mm, tzinfo=UTC)
                log = logs.get((med.id, d, t))
                status = _view_status(log.status if log else None, slot_dt, now)
                if status == "due":
                    status = "upcoming"
                day_counts[status] = day_counts.get(status, 0) + 1
        for k in totals:
            totals[k] += day_counts[k]
        days.append({"date": d, **day_counts})
        d += timedelta(days=1)

    denom = totals["taken"] + totals["missed"]
    return {
        "from_date": from_date,
        "to_date": to_date,
        **totals,
        "adherence_rate": round(totals["taken"] / denom, 3) if denom else 1.0,
        "days": days,
    }


def next_dose_hint(db: Session, patient: PatientProfile, now: datetime) -> str | None:
    """Used by the Context Engine: the next upcoming dose today, phrased simply."""
    slots = today_for_patient(db, patient, now)
    upcoming = [s for s in slots if s["status"] in ("upcoming", "due")]
    if not upcoming:
        return None
    s = upcoming[0]
    hh, mm = s["time"].split(":")
    hour12 = ((int(hh) - 1) % 12) + 1
    ampm = "am" if int(hh) < 12 else "pm"
    when = f"{hour12} {ampm}" if mm == "00" else f"{hour12}:{mm} {ampm}"
    return f"Your next medicine, {s['name']}, is at {when}."
