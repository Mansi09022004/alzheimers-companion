# dashboard — Caregiver web app

React + Vite + TypeScript + Tailwind. Manage the patient, register family (with consent),
curate memories, approve/reject AI-suggested memories, medication schedules, safe zones,
explainable alerts.

## Phase 15a (done): foundation + first sections

- Vite + React 19 + Tailwind 3
- `src/api.ts` — fetch client with in-memory access token + localStorage refresh token,
  transparent refresh-and-retry on 401; typed endpoint helpers
- `src/auth.tsx` — AuthProvider (login / restore from refresh token / logout)
- `src/App.tsx` — react-router, protected routes, app shell
- Pages: Login (+ register), Patients list (+ create), Patient detail with tabs:
  - **Overview** — provision a patient device (one-time pairing code)
  - **People** — add / remove family members
  - **Memories** — add, filter by status, **approve / reject** workflow

Later phases add: medications + adherence, routine, location map, geofences, alerts feed,
emergency contacts.

## Requirements

- The backend running: `cd ../backend && ...uvicorn app.main:app --port 8000`

## Setup & run

```bash
cd dashboard
npm install
cp .env.example .env     # VITE_API_URL defaults to http://localhost:8000
npm run dev              # http://localhost:5173
```

## Build / typecheck

```bash
npm run build            # tsc -b && vite build
```
