---
title: Alzheimer's Companion Vision
emoji: 🧠
colorFrom: green
colorTo: blue
sdk: docker
app_port: 8001
pinned: false
---

# vision-service

Stateless FastAPI service: face detection + 512-dim embeddings via InsightFace.
Called only by the Core API (shared-secret auth via `X-Service-Token`).

The YAML block above is Hugging Face Spaces config (`app_port` must match the Dockerfile's port).
