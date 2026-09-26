"""InsightFace wrapper.

The model is loaded lazily on first use (it downloads ~300 MB the very first time and
takes a few seconds to initialise). Everything here is pure CPU.

Vocabulary:
- **detection**: find face bounding boxes in an image.
- **embedding**: a 512-number vector describing one face; similar faces -> similar vectors.
  InsightFace returns an L2-normalised embedding, so cosine similarity == dot product.
"""

from __future__ import annotations

import io
import os
import threading
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageOps

from app.config import get_settings

_model_lock = threading.Lock()
_model = None

_MAX_SIDE = 1280  # the detector works at 640px, so more resolution buys nothing


@dataclass
class DetectedFace:
    box: list[int]  # [x1, y1, x2, y2]
    det_score: float


@dataclass
class FaceEmbedding:
    embedding: list[float]
    det_score: float
    box: list[int]


class NoFaceError(Exception):
    pass


class MultipleFacesError(Exception):
    pass


def _get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from insightface.app import FaceAnalysis

                s = get_settings()
                app = FaceAnalysis(
                    name=s.insightface_model,
                    root=os.path.expanduser(s.insightface_root),
                    providers=["CPUExecutionProvider"],
                )
                app.prepare(ctx_id=0, det_size=(640, 640))
                _model = app
    return _model


def is_model_loaded() -> bool:
    return _model is not None


def _to_rgb_array(image_bytes: bytes) -> np.ndarray:
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.draft("RGB", (_MAX_SIDE, _MAX_SIDE))  # JPEG: decode at reduced size, saves RAM
        img = ImageOps.exif_transpose(img)  # honour phone orientation
        img = img.convert("RGB")
        img.thumbnail((_MAX_SIDE, _MAX_SIDE))  # a 12 MP phone photo is ~36 MB as an array
    except Exception as exc:  # noqa: BLE001
        raise NoFaceError("Not a readable image.") from exc
    return np.array(img)


def detect(image_bytes: bytes) -> list[DetectedFace]:
    model = _get_model()
    faces = model.get(_to_rgb_array(image_bytes))
    min_score = get_settings().min_det_score
    return [
        DetectedFace(box=[int(v) for v in f.bbox], det_score=float(f.det_score))
        for f in faces
        if f.det_score >= min_score
    ]


def embed_primary_face(image_bytes: bytes) -> FaceEmbedding:
    """Embed exactly one face. Raises if there are none or more than one clear face."""
    model = _get_model()
    faces = model.get(_to_rgb_array(image_bytes))
    min_score = get_settings().min_det_score
    faces = [f for f in faces if f.det_score >= min_score]

    if not faces:
        raise NoFaceError("No face detected in the image.")
    if len(faces) > 1:
        raise MultipleFacesError("More than one face detected; use a photo of just one person.")

    f = faces[0]
    emb = np.asarray(f.normed_embedding, dtype=np.float32)
    return FaceEmbedding(
        embedding=emb.tolist(),
        det_score=float(f.det_score),
        box=[int(v) for v in f.bbox],
    )
