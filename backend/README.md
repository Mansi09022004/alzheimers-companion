# backend — Core API

FastAPI modular monolith. Auth, profiles, memories, RAG, context engine, medication,
location, geofencing, notifications, SOS.

## Phase 1 (done): foundation

- FastAPI app factory (`app/main.py`)
- Config from environment via `pydantic-settings` (`app/core/config.py`)
- SQLAlchemy 2.0 engine + session + `Base` + `get_db` dependency (`app/core/database.py`)
- Alembic migrations (`alembic/`); first migration enables `pgvector`
- `GET /api/v1/health` (liveness) and `GET /api/v1/ready` (checks the DB)
- pytest suite (`tests/`)

## Requirements

- Python **3.11 or 3.12** (not 3.14 — ML deps in later phases lag)
- The local database running: `cd ../infra && docker compose up -d`

## Setup

```bash
# from backend/
py -3.11 -m venv .venv
./.venv/Scripts/python -m pip install -e ".[dev]"      # Windows
# source .venv/bin/activate && pip install -e ".[dev]" # macOS/Linux

cp .env.example .env
# generate a real secret and paste it into .env:
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(64))"
```

## Run

```bash
./.venv/Scripts/python -m alembic upgrade head      # apply migrations
./.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

- API docs (Swagger UI): http://localhost:8000/docs
- Health: http://localhost:8000/api/v1/health
- Readiness: http://localhost:8000/api/v1/ready

## Test

```bash
./.venv/Scripts/python -m pytest
```

## Migrations (Alembic)

```bash
# after adding/changing ORM models:
./.venv/Scripts/python -m alembic revision --autogenerate -m "add users table"
./.venv/Scripts/python -m alembic upgrade head
./.venv/Scripts/python -m alembic downgrade -1   # undo last
```

## Layout

```
app/
├── main.py            # app factory, middleware, router mount
├── core/
│   ├── config.py      # Settings (env vars) — no hardcoded secrets
│   └── database.py    # engine, SessionLocal, Base, get_db
├── api/v1/
│   ├── router.py      # aggregates all v1 routers
│   └── health.py      # /health, /ready
├── schemas/           # Pydantic request/response models
├── models/            # SQLAlchemy ORM models (tables)          — from Phase 2
├── services/          # business logic (framework-independent)  — from Phase 2
├── repositories/      # DB query functions                      — from Phase 2
└── dependencies/      # FastAPI DI (get_current_user, ...)       — from Phase 2
alembic/               # migration scripts
tests/
```
