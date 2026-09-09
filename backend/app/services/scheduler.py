"""Background jobs (APScheduler). Runs in-process; enabled with ENABLE_SCHEDULER=true.

- every 15 min: medication reminders — for each patient, in their local time, push a
  reminder for any dose that just became due and has no log yet
- daily at 10:00 local-ish (checked hourly): one Memory Moment push per patient

Kept deliberately simple: no distributed lock, no persistence. Fine for a single
backend instance; a multi-instance deploy would move this to a worker + a real queue.
"""

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.database import SessionLocal
from app.models.patient_profile import PatientProfile
from app.repositories import medication_repo
from app.services import context_engine, notification_service

log = logging.getLogger("scheduler")
_scheduler: BackgroundScheduler | None = None


def _patient_local_now(patient: PatientProfile) -> datetime:
    try:
        return datetime.now(ZoneInfo(patient.timezone or "UTC"))
    except Exception:  # noqa: BLE001 — bad tz string
        return datetime.now(ZoneInfo("UTC"))


def medication_reminders() -> None:
    db = SessionLocal()
    try:
        for patient in db.query(PatientProfile).all():
            now = _patient_local_now(patient)
            for med in medication_repo.list_for_patient(db, patient.id, active_only=True):
                for t in med.schedule_times:
                    # due if the scheduled minute is within the last 15 minutes
                    dt = now.replace(hour=int(t[:2]), minute=int(t[3:]), second=0, microsecond=0)
                    mins_since = (now - dt).total_seconds() / 60
                    if 0 <= mins_since < 15 and medication_repo.get_log(db, med.id, now.date(), t) is None:
                        notification_service.notify_patient(
                            db,
                            patient.id,
                            "Time for your medicine",
                            f"{med.name}" + (f" — {med.dosage_note}" if med.dosage_note else ""),
                            {"type": "medication", "medication_id": med.id, "time": t},
                        )
    finally:
        db.close()


def memory_moments() -> None:
    db = SessionLocal()
    try:
        for patient in db.query(PatientProfile).all():
            if _patient_local_now(patient).hour != 10:
                continue
            moment = context_engine.memory_moment(db, patient)
            if moment["available"]:
                notification_service.notify_patient(
                    db, patient.id, "A memory", moment["message"], {"type": "memory_moment"}
                )
    finally:
        db.close()


def start() -> None:
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(medication_reminders, "interval", minutes=15, id="med_reminders")
    _scheduler.add_job(memory_moments, "cron", minute=0, id="memory_moments")  # hourly check
    _scheduler.start()
    log.info("scheduler started")


def shutdown() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
