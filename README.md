# Alzheimer's Companion

> **Prototype / portfolio project. NOT a medical device.** It does not provide diagnosis,
> treatment, or medical advice, and is not a substitute for professional care or supervision.

An AI-powered companion app for people living with Alzheimer's / dementia and their caregivers.

The product direction is **Context + Personalized Memory + Caregiver Control**:

- The **patient app** helps recognise family members ("Who is this?"), understand the current
  situation ("Why am I here?"), surfaces gentle **Memory Moments**, answers questions by voice
  or text, gives medication and routine reminders, and has an emergency SOS button.
- The **caregiver dashboard** manages the patient profile, registers family members (with
  consent), curates memories, approves or rejects **AI-suggested memories**, sets medication
  schedules and safe zones, and receives **explainable** alerts.
- Every AI answer is grounded in caregiver-approved memories and shows its **sources**. If
  nothing relevant is found, the assistant says so instead of guessing.

## Core features

Face recognition · Patient / family profiles · Memory system · AI assistant (RAG) ·
Voice assistant · Medication reminders · Daily routine reminders · GPS / location tracking ·
Geofencing · Caregiver alerts · Emergency / SOS · Caregiver dashboard · Push notifications ·
Authentication & authorization · Security / privacy · Testing · Docker · CI/CD · Deployment

## Differentiation layer

Context-aware memory · Personal memory relationships (graph) · Caregiver-controlled AI memory ·
AI memory suggestions with approve/reject · Hallucination-resistant RAG · Source attribution ·
Contextual "Who is this?" · Contextual "Why am I here?" · Memory Moments · Adaptive simple
patient UI · Explainable safety alerts

## Tech stack

| Layer            | Technology |
|------------------|------------|
| Patient app      | React Native + Expo + TypeScript |
| Caregiver dashboard | React + Vite + TypeScript |
| Core API         | FastAPI (Python), modular monolith |
| Vision service   | FastAPI + InsightFace (face detection + embeddings) |
| Database         | PostgreSQL 16 + pgvector |
| ORM / migrations | SQLAlchemy 2.0 + Alembic |
| Auth             | JWT (access + refresh), Argon2 password hashing |
| LLM + embeddings | Google Gemini (behind a provider interface, swappable) |
| Notifications    | Expo Push (→ FCM / APNs) |
| Maps / location  | expo-location + Google Maps (dashboard) |
| Local dev        | Docker Compose |
| CI/CD            | GitHub Actions |

## Repository layout

```
alzheimers-companion/
├── backend/          # Core API (FastAPI modular monolith)
├── vision-service/   # Face detection + embedding microservice (InsightFace)
├── mobile/           # Patient app (Expo)
├── dashboard/        # Caregiver web app (React + Vite)
├── packages/
│   └── shared-types/ # Shared TypeScript API-contract types (mobile + dashboard)
├── infra/            # docker-compose, DB init
└── docs/             # architecture, database schema, ADRs
```

Monorepo = one repo, but each service is **independently deployable** and talks only over HTTP.

## Getting started (will grow each phase)

```bash
# Local infrastructure (Postgres + pgvector)
cd infra
docker compose up -d
```

Backend, vision service, and frontends are added in later phases — see `docs/architecture.md`
for the phase plan.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — system architecture, data flows, phase plan
- [`docs/database-schema.md`](docs/database-schema.md) — draft data model
- [`docs/adr/`](docs/adr/) — Architecture Decision Records (why we chose what we chose)
