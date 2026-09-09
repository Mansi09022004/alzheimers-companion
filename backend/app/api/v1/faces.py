"""Caregiver-side face registration: consent + face embeddings for a person."""

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User, UserRole
from app.schemas.face import ConsentCreate, ConsentResponse, FaceResponse
from app.services import face_service

_caregiver = require_role(UserRole.caregiver)

# mounted at /people/{person_id}/...
router = APIRouter(prefix="/people/{person_id}", tags=["faces"])
# mounted at /faces/...
faces_router = APIRouter(prefix="/faces", tags=["faces"])


@router.post("/consent", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
def grant_consent(
    person_id: int,
    data: ConsentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    return face_service.grant_consent(db, person_id, data.purpose, user)


@router.delete("/consent", status_code=status.HTTP_204_NO_CONTENT)
def revoke_consent(
    person_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    face_service.revoke_consent(db, person_id, user)


@router.post("/faces", response_model=FaceResponse, status_code=status.HTTP_201_CREATED)
async def register_face(
    person_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(_caregiver),
):
    data = await file.read()
    return face_service.register_face(db, person_id, data, file.content_type, user)


@router.get("/faces", response_model=list[FaceResponse])
def list_faces(
    person_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    return face_service.list_faces(db, person_id, user)


@faces_router.delete("/{face_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_face(
    face_id: int, db: Session = Depends(get_db), user: User = Depends(_caregiver)
):
    face_service.delete_face(db, face_id, user)
