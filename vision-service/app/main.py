"""Vision service HTTP API.

Only the Core API calls this, authenticated with a shared secret in `X-Service-Token`.
It is stateless: image in -> vector out. No database.

  GET  /health   -> liveness + whether the model is warmed up
  POST /detect   -> list of face boxes + scores
  POST /embed    -> a single 512-d embedding for the one face in the image
"""

from fastapi import Depends, FastAPI, Header, HTTPException, UploadFile, status

from app import face
from app.config import get_settings

app = FastAPI(title="Alzheimer's Companion — Vision Service", version="0.1.0")

MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB


def require_service_token(x_service_token: str = Header(default="")) -> None:
    if x_service_token != get_settings().vision_service_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Bad service token")


async def _read_image(file: UploadFile) -> bytes:
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Use JPEG, PNG or WebP")
    data = await file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Image too large")
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty file")
    return data


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_loaded": face.is_model_loaded()}


@app.post("/detect", dependencies=[Depends(require_service_token)])
async def detect(file: UploadFile) -> dict:
    data = await _read_image(file)
    faces = face.detect(data)
    return {
        "count": len(faces),
        "faces": [{"box": f.box, "det_score": f.det_score} for f in faces],
    }


@app.post("/embed", dependencies=[Depends(require_service_token)])
async def embed(file: UploadFile) -> dict:
    data = await _read_image(file)
    try:
        result = face.embed_primary_face(data)
    except face.NoFaceError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    except face.MultipleFacesError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    return {
        "embedding": result.embedding,
        "det_score": result.det_score,
        "box": result.box,
        "dim": len(result.embedding),
    }
