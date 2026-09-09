"""Patient-app facing routes. Auth is the device token (see dependencies/patient_auth).

`/patient/pair` is the only public route here — it trades a pairing code for a token.
"""

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.patient_auth import get_current_patient
from app.models.patient_profile import PatientProfile
from app.schemas.device import DeviceClaimRequest, DeviceClaimResponse
from app.schemas.face import IdentifyMatch
from app.schemas.memory import PatientMemoryResponse
from app.schemas.patient import PatientSelfResponse
from app.schemas.rag import AskRequest, AskResponse
from app.services import device_service, face_service, memory_service, rag_service

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
    """"Who is this?" — a camera frame in, a calm sentence out (or "not sure")."""
    data = await file.read()
    return face_service.identify(db, patient, data, file.content_type)


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
