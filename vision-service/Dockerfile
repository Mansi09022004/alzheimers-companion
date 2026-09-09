# Vision service: FastAPI + InsightFace (CPU). Linux base so onnxruntime / insightface
# install from prebuilt wheels — no Windows build tools needed.

FROM python:3.11-slim AS base

# build-essential: insightface 0.7.3 compiles a Cython C++ extension from sdist.
# libgl1 / libglib2.0-0: runtime libs for OpenCV (pulled in by insightface).
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    INSIGHTFACE_ROOT=/models

WORKDIR /srv

COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir .

# Warm the model into the image so the first request isn't a ~300 MB download.
RUN python -c "import os; from insightface.app import FaceAnalysis; \
    a=FaceAnalysis(name='buffalo_l', root=os.environ['INSIGHTFACE_ROOT'], providers=['CPUExecutionProvider']); \
    a.prepare(ctx_id=0, det_size=(640,640))"

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
