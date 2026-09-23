"""Patient-app facing routes. Auth is the device token (see dependencies/patient_auth).

`/patient/pair` is the only public route here — it trades a pairing code for a token.
"""

from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.rate_limit import limiter

from app.core.database import get_db
from pydantic import BaseModel

from app.dependencies.patient_auth import get_current_patient, get_current_device
from app.models.patient_device import PatientDevice
from app.models.patient_profile import PatientProfile
from app.schemas.context import (
    MemoryMomentResponse,
    WhoIsThisResponse,
    WhyAmIHereResponse,
)
from app.schemas.device import DeviceClaimRequest, DeviceClaimResponse
from app.schemas.face import IdentifyMatch
from app.schemas.emergency import SosRequest, SosResponse
from app.schemas.journal import JournalEntryResponse, JournalEntrySave, JournalTranscriptResponse
from app.schemas.location import LocationReport
from app.schemas.medication import DoseSlot, TakeDoseRequest
from app.schemas.memory import PatientMemoryResponse
from app.schemas.patient import PatientSelfResponse
from app.schemas.person import PatientPersonResponse
from app.schemas.rag import AskRequest, AskResponse, VoiceAskResponse
from app.schemas.routine import CompleteRoutineRequest, RoutineTodayItem
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.repositories import person_repo
from app.services import (
    context_engine,
    device_service,
    emergency_service,
    face_service,
    journal_service,
    location_service,
    medication_service,
    memory_service,
    rag_service,
    routine_service,
    task_service,
)


def _parse_local(dt: str | None) -> datetime:
    """Device-provided local wall-clock time, e.g. '2026-09-10T14:30'. Falls back to now."""
    if not dt:
        return datetime.now(UTC)
    try:
        return datetime.fromisoformat(dt).replace(tzinfo=UTC)
    except ValueError:
        return datetime.now(UTC)

router = APIRouter(prefix="/patient", tags=["patient-app"])


@router.post("/pair", response_model=DeviceClaimResponse)
@limiter.limit("10/minute")
def pair(request: Request, data: DeviceClaimRequest, db: Session = Depends(get_db)):
    return device_service.claim_device(db, data.pairing_code)


@router.get("/me", response_model=PatientSelfResponse)
def me(patient: PatientProfile = Depends(get_current_patient)) -> PatientProfile:
    """The patient's own profile (used by the app home screen)."""
    return patient


@router.post("/identify", response_model=IdentifyMatch)
async def identify(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Face match only — fast, templated message. Use /who-is-this for the full
    contextual answer."""
    data = await file.read()
    return face_service.identify(db, patient, data, file.content_type)


@router.post("/who-is-this", response_model=WhoIsThisResponse)
async def who_is_this(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Contextual "Who is this?": face match + relationship + a recent memory,
    phrased as one warm sentence."""
    data = await file.read()
    return context_engine.who_is_this(db, patient, data, file.content_type)


@router.get("/why-am-i-here", response_model=WhyAmIHereResponse)
def why_am_i_here(
    local_datetime: str | None = None,
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Reassure the patient about where they are, the time, and the next medicine.
    `local_datetime` (e.g. '2026-09-10T14:30') comes from the device clock."""
    return context_engine.why_am_i_here(db, patient, _parse_local(local_datetime))


@router.get("/memory-moment", response_model=MemoryMomentResponse)
def memory_moment(
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """One gentle approved memory, phrased kindly."""
    return context_engine.memory_moment(db, patient)


@router.get("/medications/today", response_model=list[DoseSlot])
def medications_today(
    local_datetime: str | None = None,
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Today's doses with a computed status (upcoming / due / taken / skipped / missed)."""
    return medication_service.today_for_patient(db, patient, _parse_local(local_datetime))


@router.post("/medications/{medication_id}/doses/{time}", response_model=dict)
def take_dose(
    medication_id: int,
    time: str,
    data: TakeDoseRequest,
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Patient marks a dose as taken (or skipped)."""
    log = medication_service.patient_take_dose(db, patient, medication_id, time, data)
    return {"medication_id": medication_id, "time": time, "status": log.status.value}


class PushTokenBody(BaseModel):
    expo_push_token: str


@router.post("/push-token", status_code=204)
def register_push_token(
    body: PushTokenBody,
    db: Session = Depends(get_db),
    device: PatientDevice = Depends(get_current_device),
):
    """The patient app registers its Expo push token so we can send reminders."""
    device.expo_push_token = body.expo_push_token
    db.add(device)
    db.commit()


@router.post("/sos", response_model=SosResponse)
def sos(
    data: SosRequest,
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Emergency button. Always creates a critical alert; collapses double-taps."""
    return emergency_service.trigger_sos(db, patient, data)


@router.post("/location", status_code=204)
def report_location(
    data: LocationReport,
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """The device reports its current location (periodically). Body only, never a URL."""
    location_service.report(db, patient, data)


@router.get("/routine/today", response_model=list[RoutineTodayItem])
def routine_today(
    local_datetime: str | None = None,
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Today's routine items (filtered by day of week) with a done/pending flag."""
    return routine_service.today_for_patient(db, patient, _parse_local(local_datetime))


@router.post("/routine/{item_id}/complete", response_model=dict)
def routine_complete(
    item_id: int,
    data: CompleteRoutineRequest,
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Patient checks a routine item off (or un-checks it)."""
    return routine_service.patient_complete(db, patient, item_id, data)


@router.get("/people", response_model=list[PatientPersonResponse])
def my_people(
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """The people this patient knows (name + relationship only), for the "familiar
    people" section. Reuses the same rows caregivers manage; no photos are stored."""
    return [p for p in person_repo.list_for_patient(db, patient.id) if p.is_active]


@router.get("/memories", response_model=list[PatientMemoryResponse])
def my_memories(
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Approved memories about the patient (used by Memory Moments later)."""
    memories = memory_service.list_approved_for_patient(db, patient.id)
    return [
        PatientMemoryResponse(
            id=m.id,
            text=context_engine._personalize(m.text, patient.full_name),
            memory_date=m.memory_date,
            person_id=m.person_id,
        )
        for m in memories
    ]


@router.post("/ask", response_model=AskResponse)
def ask(
    data: AskRequest,
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Ask the memory assistant a question. Answer is grounded in approved memories
    and lists its sources; says "I'm not sure" when nothing relevant is found."""
    return rag_service.ask(db, patient, data.question)


@router.post("/ask/voice", response_model=VoiceAskResponse)
async def ask_voice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Speech -> text -> RAG. The device speaks the answer aloud (TTS)."""
    data = await file.read()
    return rag_service.ask_voice(db, patient, data, file.content_type or "audio/mp4")


@router.get("/journal", response_model=list[JournalEntryResponse])
def journal_list(
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """All of this patient's 'My Day' entries, most recent first."""
    return journal_service.list_entries(db, patient)


@router.post("/journal", response_model=JournalEntryResponse)
def journal_save(
    data: JournalEntrySave,
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Write (or overwrite) today's — or any date's — journal entry."""
    return journal_service.save_entry(db, patient, data)


@router.post("/journal/transcribe", response_model=JournalTranscriptResponse)
async def journal_transcribe(
    file: UploadFile = File(...),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Speech -> text only, for the journal's voice-to-text option. No reply, no
    RAG — the patient reviews and edits the words before saving."""
    data = await file.read()
    return {"transcript": journal_service.transcribe(data, file.content_type)}


@router.get("/tasks", response_model=list[TaskResponse])
def tasks_for_date(
    task_date: date,
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Today's tasks (or any date's) — the device passes its own local date."""
    return task_service.patient_list_for_date(db, patient, task_date)


@router.post("/tasks", response_model=TaskResponse, status_code=201)
def add_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """The patient adds their own task for a day."""
    return task_service.patient_create_task(db, patient, data)


@router.post("/tasks/{task_id}/complete", response_model=TaskResponse)
def complete_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Check a task off (or back on)."""
    return task_service.patient_set_completed(db, patient, task_id, bool(data.completed))


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Remove a task (e.g. to fix a typo by retyping it)."""
    task_service.patient_delete_task(db, patient, task_id)
