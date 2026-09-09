# Alzheimer's Companion

> **Prototype / portfolio project. NOT a medical device.** No diagnosis, no treatment,
> no medical advice. Not a substitute for professional care or supervision.

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
| Maps | Leaflet + OpenStreetMap | no API key / billing needed |
| Notifications | Expo Push | one integration for FCM + APNs |
| Infra | Docker Compose, GitHub Actions | |

**Deliberately not used:** Kubernetes, Kafka, Redis, Neo4j, a dedicated vector DB,
GraphQL, monorepo tooling. Each would add operational weight with no benefit at this
scale. The "memory graph" is a self-referential Postgres table.

## Repository layout

```
backend/          Core API (FastAPI) — app/{api,services,repositories,models,schemas}, alembic/
vision-service/   Face detection + embedding (InsightFace), containerised
mobile/           Patient app (Expo)
dashboard/        Caregiver web app (React + Vite)
infra/            docker-compose, DB init
docs/             architecture, schema, ADRs, competitive analysis, deployment
```

## Run it locally

Prerequisites: Docker Desktop, Python 3.11, Node 20+.

```bash
# 1. database + (optional) vision service
cd infra && docker compose up -d
#    docker compose --profile vision up -d --build   # for "Who is this?"

# 2. backend
cd ../backend
py -3.11 -m venv .venv && ./.venv/Scripts/python -m pip install -e ".[dev]"   # (Scripts\ on Windows)
cp .env.example .env   # generate a JWT secret; set GEMINI_API_KEY or keep LLM_PROVIDER=fake
./.venv/Scripts/python -m alembic upgrade head
./.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000

# 3. dashboard
cd ../dashboard && npm install && npm run dev          # http://localhost:5173

# 4. patient app
cd ../mobile && npm install
cp .env.example .env   # EXPO_PUBLIC_API_URL
npm start              # scan the QR in Expo Go, or `npx expo start --web`
```

Or the whole stack in Docker: `cd infra && docker compose --profile full up -d --build`.

## Tests

```bash
cd backend && ./.venv/Scripts/python -m pytest              # 105 tests, ~88% coverage
cd vision-service && ./.venv/Scripts/python -m pytest       # 6 (InsightFace mocked)
cd dashboard && npm test                                    # vitest
cd mobile && npx tsc --noEmit
```

## AI pipelines

**RAG** — question → embed → pgvector similarity search over the patient's *approved*
memories → drop matches below a cosine-similarity floor → if none, *"I'm not sure"* →
otherwise build a prompt (system rules + retrieved memories + question) → LLM → answer
+ the exact memories used.

**Face recognition** — caregiver records **consent** → uploads a photo → vision service
returns a 512-d embedding (photo discarded) → stored in pgvector → patient's camera
frame → embed → nearest-neighbour search **scoped to that patient's people** → above
threshold → identity + context; below → *"I don't recognise this person."*

## Security & privacy

See [`SECURITY.md`](SECURITY.md). Highlights: Argon2, rotating refresh tokens,
resource-scoped authorization (404 not 403 for unlinked patients), consent-first
biometrics, embeddings-not-photos, deletion cascades, rate limiting, prompt-injection
delimiting, hallucination guards, "not a medical device" throughout.

## Limitations

Face-match threshold not tuned on real data · background location on iOS/Android is
delayed/unreliable (missing updates = "unknown", never "safe") · caregiver alert
delivery is the dashboard feed + a logging hook (no caregiver app) · single-instance
scheduler · not penetration-tested.

## Deployment

[`docs/deployment.md`](docs/deployment.md) — Neon + Render + Vercel + Expo EAS, with an
AWS migration path. `render.yaml` and `dashboard/vercel.json` included.
