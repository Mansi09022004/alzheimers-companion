"""Vision API tests. The InsightFace model is mocked — we test the HTTP contract,
auth, and validation, not the ML itself."""

import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import face
from app.config import get_settings
from app.main import app

get_settings.cache_clear()
TOKEN = get_settings().vision_service_token
client = TestClient(app)


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), (200, 180, 160)).save(buf, format="PNG")
    return buf.getvalue()


def test_health_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_embed_requires_service_token():
    r = client.post("/embed", files={"file": ("f.png", _png_bytes(), "image/png")})
    assert r.status_code == 401


def test_embed_rejects_non_image():
    r = client.post(
        "/embed",
        headers={"X-Service-Token": TOKEN},
        files={"file": ("f.txt", b"hello", "text/plain")},
    )
    assert r.status_code == 415


def test_embed_returns_vector(monkeypatch):
    fake = face.FaceEmbedding(embedding=[0.1] * 512, det_score=0.99, box=[1, 2, 3, 4])
    monkeypatch.setattr(face, "embed_primary_face", lambda _b: fake)

    r = client.post(
        "/embed",
        headers={"X-Service-Token": TOKEN},
        files={"file": ("f.png", _png_bytes(), "image/png")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["dim"] == 512
    assert body["det_score"] == 0.99


def test_embed_no_face_is_422(monkeypatch):
    def _raise(_b):
        raise face.NoFaceError("No face detected in the image.")

    monkeypatch.setattr(face, "embed_primary_face", _raise)
    r = client.post(
        "/embed",
        headers={"X-Service-Token": TOKEN},
        files={"file": ("f.png", _png_bytes(), "image/png")},
    )
    assert r.status_code == 422


def test_detect_counts_faces(monkeypatch):
    monkeypatch.setattr(
        face, "detect", lambda _b: [face.DetectedFace(box=[0, 0, 1, 1], det_score=0.9)]
    )
    r = client.post(
        "/detect",
        headers={"X-Service-Token": TOKEN},
        files={"file": ("f.png", _png_bytes(), "image/png")},
    )
    assert r.status_code == 200
    assert r.json()["count"] == 1
