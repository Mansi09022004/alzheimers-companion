"""'Routine Detection' — surfaces patterns already sitting in the patient's own
history (medication adherence, repeated tasks, routine/visit consistency, frequently
visited safe zones). Nothing here is stored or invented: every call recomputes from
existing medication/task/routine/geofence data, so it updates automatically as new
data comes in, and a pattern is only reported once there's enough history to support it.
"""

from collections import defaultdict
from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.models.medication import DoseStatus
from app.models.patient_profile import PatientProfile
from app.repositories import geofence_repo, medication_repo, routine_repo, task_repo
from app.schemas.routine_insights import DetectedRoutine

_LOOKBACK_DAYS = 30
_MIN_MED_DAYS = 5
_MED_RATE = 0.7
_MIN_TASK_OCCURRENCES = 3
_MIN_ROUTINE_DAYS = 5
_ROUTINE_RATE = 0.6
_MIN_LOCATION_VISITS = 5


def _first_name(patient: PatientProfile) -> str:
    return patient.full_name.split()[0] if patient.full_name else "You"


def _friendly_time(hhmm: str) -> str:
    hh, mm = hhmm.split(":")
    hour12 = ((int(hh) - 1) % 12) + 1
    ampm = "am" if int(hh) < 12 else "pm"
    return f"{hour12} {ampm}" if mm == "00" else f"{hour12}:{mm} {ampm}"


def _days_in_range(start: date, end: date) -> int:
    return (end - start).days + 1 if end >= start else 0


def _medication_routines(db: Session, patient: PatientProfile, start: date, end: date, name: str) -> list[DetectedRoutine]:
    meds = medication_repo.list_for_patient(db, patient.id, active_only=True)
    logs = medication_repo.logs_in_range(db, patient.id, start, end)
    taken_counts: dict[tuple[int, str], int] = defaultdict(int)
    for log in logs:
        if log.status == DoseStatus.taken:
            taken_counts[(log.medication_id, log.scheduled_time)] += 1

    out: list[DetectedRoutine] = []
    for med in meds:
        active_since = max(med.created_at.date(), start)
        expected_days = _days_in_range(active_since, end)
        if expected_days < _MIN_MED_DAYS:
            continue
        for slot_time in med.schedule_times:
            taken = taken_counts.get((med.id, slot_time), 0)
            if taken / expected_days >= _MED_RATE:
                out.append(DetectedRoutine(
                    category="medication",
                    icon="💊",
                    message=f"{name} usually takes {med.name} around {_friendly_time(slot_time)}.",
                ))
    return out


def _task_routines(db: Session, patient: PatientProfile, name: str) -> list[DetectedRoutine]:
    tasks = task_repo.list_for_patient(db, patient.id, limit=200)
    seen_dates: dict[str, set[date]] = defaultdict(set)
    labels: dict[str, str] = {}
    for t in tasks:
        if not t.completed:
            continue
        key = t.text.strip().lower()
        if not key:
            continue
        labels.setdefault(key, t.text.strip())
        seen_dates[key].add(t.task_date)

    out: list[DetectedRoutine] = []
    for key, dates in seen_dates.items():
        if len(dates) >= _MIN_TASK_OCCURRENCES:
            out.append(DetectedRoutine(
                category="task",
                icon="✅",
                message=f'{name} often completes: "{labels[key]}".',
            ))
    return out


def _routine_item_routines(db: Session, patient: PatientProfile, start: date, end: date, name: str) -> list[DetectedRoutine]:
    items = routine_repo.list_for_patient(db, patient.id, active_only=True)
    if not items:
        return []
    completions = routine_repo.completions_in_range(db, [i.id for i in items], start, end)
    done_counts: dict[int, int] = defaultdict(int)
    for c in completions:
        done_counts[c.routine_item_id] += 1

    out: list[DetectedRoutine] = []
    for item in items:
        active_since = max(item.created_at.date(), start)
        expected_days = sum(
            1
            for n in range(_days_in_range(active_since, end))
            if (active_since + timedelta(days=n)).weekday() in item.days_of_week
        )
        if expected_days < _MIN_ROUTINE_DAYS:
            continue
        done = done_counts.get(item.id, 0)
        if done / expected_days >= _ROUTINE_RATE:
            is_visit = "visit" in item.title.lower()
            out.append(DetectedRoutine(
                category="visit" if is_visit else "my_day",
                icon="👥" if is_visit else "📝",
                message=f'{name} usually does "{item.title}" around {_friendly_time(item.time_of_day)}.',
            ))
    return out


def _location_routines(db: Session, patient: PatientProfile, start_dt: datetime, end_dt: datetime, name: str) -> list[DetectedRoutine]:
    fences = {f.id: f for f in geofence_repo.list_for_patient(db, patient.id, active_only=True)}
    if not fences:
        return []
    events = geofence_repo.events_in_range(db, patient.id, start_dt, end_dt, limit=2000)
    enter_counts: dict[int, int] = defaultdict(int)
    for ev in events:
        if ev.event.value == "enter":
            enter_counts[ev.geofence_id] += 1

    out: list[DetectedRoutine] = []
    for geofence_id, count in enter_counts.items():
        if count >= _MIN_LOCATION_VISITS and geofence_id in fences:
            out.append(DetectedRoutine(
                category="location",
                icon="📍",
                message=f"{name} often visits {fences[geofence_id].name}.",
            ))
    return out


def detect_routines(db: Session, patient: PatientProfile) -> list[DetectedRoutine]:
    now = datetime.now(UTC)
    end = now.date()
    start = end - timedelta(days=_LOOKBACK_DAYS - 1)
    name = _first_name(patient)

    routines: list[DetectedRoutine] = []
    routines += _medication_routines(db, patient, start, end, name)
    routines += _routine_item_routines(db, patient, start, end, name)
    routines += _task_routines(db, patient, name)
    routines += _location_routines(db, patient, now - timedelta(days=_LOOKBACK_DAYS), now, name)
    return routines
