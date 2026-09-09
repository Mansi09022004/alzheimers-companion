"""Patient-app facing routes. Auth is the device token (see dependencies/patient_auth).

`/patient/pair` is the only public route here — it trades a pairing code for a token.
"""

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.patient_auth import get_current_patient
from app.models.patient_profile import PatientProfile
from app.schemas.context import (
    MemoryMomentResponse,
    WhoIsThisResponse,
    WhyAmIHereResponse,
)
from app.schemas.device import DeviceClaimRequest, DeviceClaimResponse
from app.schemas.face import IdentifyMatch
from app.schemas.memory import PatientMemoryResponse
from app.schemas.patient import PatientSelfResponse
from app.schemas.rag import AskRequest, AskResponse, VoiceAskResponse
from app.services import (
    context_engine,
    device_service,
    face_service,
    memory_service,
    rag_service,
)

router = APIRouter(prefix="/patient", tags=["patient-app"])


@router.post("/pair", response_model=DeviceClaimResponse)
def pair(data: DeviceClaimRequest, db: Session = Depends(get_db)):
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
    local_hour: int | None = None,
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Reassure the patient about where they are and what time it is.
    `local_hour` (0-23) comes from the device clock."""
    return context_engine.why_am_i_here(db, patient, local_hour)


@router.get("/memory-moment", response_model=MemoryMomentResponse)
def memory_moment(
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """One gentle approved memory, phrased kindly."""
    return context_engine.memory_moment(db, patient)


@router.get("/memories", response_model=list[PatientMemoryResponse])
def my_memories(
    db: Session = Depends(get_db),
    patient: PatientProfile = Depends(get_current_patient),
):
    """Approved memories about the patient (used by Memory Moments later)."""
    return memory_service.list_approved_for_patient(db, patient.id)


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
