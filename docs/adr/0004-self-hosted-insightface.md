# ADR 0004 — Self-hosted InsightFace for face recognition

**Status:** accepted · **Date:** 2026-09-07

## Context
The patient points a camera at a person and asks "Who is this?". We need face detection and a
face embedding we can compare against registered family members. The subjects are vulnerable
people and their families — biometric data is sensitive.

## Decision
Run **InsightFace** (`buffalo_l` pack) inside our own `vision-service`. It outputs a 512-dim
embedding per detected face. Matching (cosine similarity + threshold) happens in Postgres via
pgvector, scoped to the patient's own registered people.

## Consequences
- No per-call cost; works offline; we control the match threshold and the "not sure" fallback.
- No biometric data of vulnerable people sent to a third-party cloud.
- We own model hosting, updates, and the ~300 MB weight download (cached in the container).
- Needs a Python 3.11/3.12 environment (onnxruntime wheels lag on 3.14).

## Alternatives considered
- **AWS Rekognition / Azure Face / Google Vision:** less code, managed scaling — but per-call
  cost, sends face images off-box, less control over thresholds, and vendor lock-in on a
  privacy-critical path.
- **On-device recognition:** avoids uploads but hard to keep the family database in sync across
  devices and weaker models on-device. We do detect-and-crop hints client-side later as an
  optimization, but matching stays server-side.
