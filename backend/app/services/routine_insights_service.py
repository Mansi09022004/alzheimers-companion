"""'Routine Detection' — surfaces patterns already sitting in the patient's own
history: medication confirmations, routine-item/visit completions, repeated tasks,
My Day/journal writing times, and frequently visited safe zones. Nothing here is
stored or invented, and memory text is never used as routine evidence — only
structured, timestamped activity records, each counted by the distinct calendar
dates it was actually confirmed on (not the age of the medication/routine-item
row itself, which only reflects when a caregiver set it up, not how much history
exists for it). Every call recomputes from existing medication/task/routine/
journal/geofence data, so it updates automatically as new data comes in, and a
pattern is only reported once the same activity has repeated on enough genuinely
different dates within the last 30 days.
"""

from collections import Counter, defaultdict
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models.medication import DoseStatus
from app.models.patient_profile import PatientProfile
from app.repositories import geofence_repo, journal_repo, medication_repo, routine_repo, task_repo
from app.schemas.routine_insights import DetectedRoutine

_LOOKBACK_DAYS = 30
_MIN_MED_OCCURRENCES = 3
_MIN_TASK_OCCURRENCES = 3
_MIN_ROUTINE_OCCURRENCES = 3
_MIN_LOCATION_VISITS = 5
_MIN_JOURNAL_DAYS = 5
_JOURNAL_TIME_RATE = 0.5


def _first_name(patient: PatientProfile) -> str:
    return patient.full_name.split()[0] if patient.full_name else "You"


def _friendly_time(hhmm: str) -> str:
    hh, mm = hhmm.split(":")
    hour12 = ((int(hh) - 1) % 12) + 1
    ampm = "am" if int(hh) < 12 else "pm"
    return f"{hour12} {ampm}" if mm == "00" else f"{hour12}:{mm} {ampm}"


def _medication_routines(db: Session, patient: PatientProfile, start: date, end: date, name: str) -> list[DetectedRoutine]:
    meds = {m.id: m for m in medication_repo.list_for_patient(db, patient.id, active_only=True)}
    logs = medication_repo.logs_in_range(db, patient.id, start, end)
    taken_dates: dict[tuple[int, str], set[date]] = defaultdict(set)
    for log in logs:
        if log.status == DoseStatus.taken:
            taken_dates[(log.medication_id, log.scheduled_time)].add(log.scheduled_date)

    out: list[DetectedRoutine] = []
    for (med_id, slot_time), dates in taken_dates.items():
        med = meds.get(med_id)
        if med is None or len(dates) < _MIN_MED_OCCURRENCES:
            continue
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
    items = {i.id: i for i in routine_repo.list_for_patient(db, patient.id, active_only=True)}
    if not items:
        return []
    completions = routine_repo.completions_in_range(db, list(items.keys()), start, end)
    done_dates: dict[int, set[date]] = defaultdict(set)
    for c in completions:
        done_dates[c.routine_item_id].add(c.on_date)

    out: list[DetectedRoutine] = []
    for item_id, dates in done_dates.items():
        item = items.get(item_id)
        if item is None or len(dates) < _MIN_ROUTINE_OCCURRENCES:
            continue
        is_visit = "visit" in item.title.lower()
        out.append(DetectedRoutine(
            category="visit" if is_visit else "routine",
            icon="👥" if is_visit else "📅",
            message=f'{name} usually does "{item.title}" around {_friendly_time(item.time_of_day)}.',
        ))
    return out


def _journal_routines(db: Session, patient: PatientProfile, start: date, name: str) -> list[DetectedRoutine]:
    entries = [e for e in journal_repo.list_for_patient(db, patient.id) if e.entry_date >= start]
    if len(entries) < _MIN_JOURNAL_DAYS:
        return []

    tz = ZoneInfo(patient.timezone or "UTC")
    hour_counts = Counter(e.created_at.astimezone(tz).hour for e in entries)
    hour, count = hour_counts.most_common(1)[0]
    if count / len(entries) >= _JOURNAL_TIME_RATE:
        when = _friendly_time(f"{hour:02d}:00")
        message = f"{name} usually writes in My Day around {when}."
    else:
        message = f"{name} often writes in My Day."
    return [DetectedRoutine(category="journal", icon="📝", message=message)]


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
    routines += _journal_routines(db, patient, start, name)
    routines += _location_routines(db, patient, now - timedelta(days=_LOOKBACK_DAYS), now, name)
    return routines
