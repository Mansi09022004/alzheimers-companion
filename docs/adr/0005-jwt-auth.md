# ADR 0005 — JWT authentication (access + refresh)

**Status:** accepted · **Date:** 2026-09-07

## Context
Two client types (mobile app, web dashboard) need to authenticate to the same API. Patients
with dementia cannot manage passwords; caregivers can.

## Decision
- JWT bearer tokens: short-lived **access token** (~15 min) + longer-lived **refresh token**
  (~14 days). `HS256` signed with `JWT_SECRET_KEY` from the environment.
- Passwords hashed with **Argon2**.
- Roles `caregiver` / `patient` in the token; a FastAPI dependency enforces role, and a second
  check enforces that a caregiver is linked to the patient (`patient_caregivers`).
- **Patient devices** are provisioned by the caregiver with a long-lived device token — the
  patient never logs in with credentials.
- Refresh tokens are rotated on use and can be revoked (denylist); access tokens just expire.

## Consequences
- Stateless verification, identical mechanism for mobile and web, no server session store.
- Instant revocation of an access token is not possible — mitigated by short expiry + refresh
  rotation.
- Client storage: Expo SecureStore on mobile; httpOnly cookie / in-memory on the dashboard
  (avoid localStorage).

## Alternatives considered
- **Server-side sessions:** easy revocation, but needs a shared session store and is awkward
  for a native mobile client.
- **Third-party auth (Auth0 / Firebase Auth / Supabase Auth):** faster to start, but this
  project is partly *about* understanding auth, and it adds a vendor on a sensitive path.
