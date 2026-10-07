# Alzheimer's Companion

> **Prototype / portfolio project. NOT a medical device.** No diagnosis, no treatment,
> no medical advice. Not a substitute for professional care or supervision.

**Live demo:** [Patient app](https://alz-patient.vercel.app/) · [Caregiver dashboard](https://alz-companion.vercel.app/)

An AI companion for people living with Alzheimer's / dementia and their caregivers.
The product thesis is **Context + Personalized Memory + Caregiver Control**: the
assistant's entire knowledge is a caregiver-approved, per-patient memory store; every
answer is grounded and cites its sources; it refuses to guess; and a *Context Engine*
fuses face recognition, family relationships, memories, medication and location into
one calm response.

## Problem

Existing tools are fragmented — face recognition in one app, GPS in a hardware tracker,
reminders in another, caregiver coordination in a fourth — and where AI exists it helps
the *caregiver* using medical literature, with no human control over what it tells the
*patient*. See [`docs/competitive-analysis.md`](docs/competitive-analysis.md).

## What it does

**Patient app** — big buttons, few words, calm colours:
- **Who is this?** — point the camera at a registered family member → *"This is Rahul,
  your son. He visited last Sunday with mangoes."* (face match + relationship + recent
  memories, spoken aloud)
- **Ask a question** — by voice or text; RAG over approved memories with source
  attribution; says *"I'm not sure"* rather than guess
- **Why am I here?** — time + place + next medicine + next routine item
- **Memory Moments** — a gentle memory surfaced on the home screen
- **My medicines / Today's plan** — due doses and routine as simple checklists
- **I need help** — SOS → critical alert with the latest location

**Caregiver dashboard** — one place for everything:
- patient profiles, family members + relationship graph, device pairing
- memory curation + **approve / reject** queue; **AI suggests** memories from pasted notes
- medication schedules + **adherence** chart, daily routine
- **live location map** (OpenStreetMap), safe zones (geofences)
- **explainable alerts** feed (geofence exit / SOS) with acknowledge
- emergency contacts

## Architecture

```
Patient app (Expo)  ─┐
Caregiver dashboard ─┼─► Core API (FastAPI, modular monolith) ─► PostgreSQL + pgvector
                     │        │  ├─ Context Engine   └─► Vision service (InsightFace)
                     │        │  ├─ RAG  ──────────► Gemini (embeddings / chat / STT)
                     │        │  └─ APScheduler ───► Expo Push (→ FCM / APNs)
```

Full diagrams: [`docs/architecture.md`](docs/architecture.md) ·
ER diagram: [`docs/database-schema.md`](docs/database-schema.md) ·
decisions: [`docs/adr/`](docs/adr/)

## Tech stack

| Layer | Choice | Why (one line) |
|---|---|---|
| Patient app | React Native + Expo + TS | one codebase, camera / voice / location / push out of the box |
| Dashboard | React + Vite + TS + Tailwind | fast dev, static deploy, no SSR needed for an authed tool |
| Core API | FastAPI (Python) | async, Pydantic validation, OpenAPI for free, sits by the ML ecosystem |
| DB | PostgreSQL 16 + **pgvector** | relational integrity **and** vector search in one store |
| ORM | SQLAlchemy 2.0 + Alembic | explicit, versioned schema |
| Auth | JWT (access + rotating refresh), Argon2 | stateless, identical for mobile + web |
| Face | **InsightFace** `buffalo_l` (self-hosted) | no per-call cost, offline, no third-party biometric sharing |
| LLM | **Gemini** behind a provider interface | free tier; swappable (a `fake` provider runs offline) |
| Maps | Leaflet + OpenStreetMap | no
