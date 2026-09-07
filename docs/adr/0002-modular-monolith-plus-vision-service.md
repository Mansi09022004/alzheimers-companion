# ADR 0002 — Modular monolith for the core API, plus one vision service

**Status:** accepted · **Date:** 2026-09-07

## Context
We need a backend for auth, profiles, memories, RAG, medication, location, geofencing,
notifications, SOS — and a face-embedding capability using InsightFace.

## Decision
- Build the **core API as a modular monolith**: one FastAPI app, internally split into service
  modules (`auth_service`, `people_service`, `memory_service`, `rag_service`, `context_engine`,
  `geofence_service`, `notification_service`, ...). One process, one database.
- Extract **exactly one** separate service: **vision-service** (FastAPI + InsightFace) for face
  detection and embedding.

## Consequences
- Core API keeps real DB transactions across modules; no distributed-transaction problems.
- Vision service isolates a heavy, unrelated dependency tree (`onnxruntime`, `opencv`, ~300 MB
  model weights) and a different scaling profile (CPU-bound vs I/O-bound). It is stateless
  (image in → vector out) and easy to test and scale alone.
- One internal HTTP hop (core → vision), secured with a shared secret.
- Module boundaries in the monolith are kept clean, so another service could be extracted later
  if a real scaling need appears.

## Alternatives considered
- **Full microservices:** service discovery, N deploy pipelines, network failure handling,
  distributed transactions — all cost, no benefit for one developer / pre-product scale.
- **Vision inside the monolith:** triples the API image size, slows every unrelated deploy,
  couples GPU/CPU concerns to the web tier.
- **Cloud face API (AWS Rekognition / Azure Face):** see ADR 0004.
