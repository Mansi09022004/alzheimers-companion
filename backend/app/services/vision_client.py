"""HTTP client for the vision service.

Isolated here so the rest of the app depends on a small interface, not on httpx or
the vision service's URL. In tests this module is monkeypatched with fakes.
"""

from dataclasses import dataclass

import httpx

from app.core.config import get_settings
from app.core.exceptions import AppError


class VisionUnavailableError(AppError):
    status_code = 503
    code = "vision_unavailable"


class NoFaceError(AppError):
    status_code = 422
    code = "no_face"


class MultipleFacesError(AppError):
    status_code = 422
    code = "multiple_faces"


@dataclass
class Embedding:
    vector: list[float]
    det_score: float
    model_version: str


def embed_face(image_bytes: bytes, content_type: str) -> Embedding:
    s = get_settings()
    try:
        resp = httpx.post(
            f"{s.vision_service_url}/embed",
            headers={"X-Service-Token": s.vision_service_token},
            files={"file": ("upload", image_bytes, content_type)},
            timeout=30.0,
        )
    except httpx.HTTPError as exc:
        raise VisionUnavailableError("Face service is not reachable.") from exc

    if resp.status_code == 422:
        detail = resp.json().get("detail", "")
        if "one face" in detail or "More than one" in detail:
            raise MultipleFacesError("Use a photo of just one person.")
        raise NoFaceError("No clear face found in the photo.")
    if resp.status_code >= 500:
        raise VisionUnavailableError("Face service error.")
    resp.raise_for_status()

    body = resp.json()
    return Embedding(
        vector=body["embedding"],
        det_score=body["det_score"],
        model_version="buffalo_l",
    )
