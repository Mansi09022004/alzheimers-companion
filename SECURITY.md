# Security & privacy posture

> Prototype / portfolio project — **not a medical device**, not certified for regulatory
> compliance. Designed with the principles below; not audited.

## Data sensitivity

This app touches **biometric** (face embeddings), **health-adjacent** (medication,
routine), **location**, and **personal / family** data about a vulnerable population.

## Controls in place

| Area | Control |
|---|---|
| Transport | HTTPS in production (platform-terminated); HSTS via the host |
| Passwords | Argon2 hashing (`argon2-cffi`); never stored or logged in plaintext |
| Caregiver auth | JWT access (~15 min) + refresh (~14 d), refresh tokens **rotated + single-use**, revocable (`refresh_tokens` table) |
| Patient auth | No password. Caregiver provisions a device with a one-time pairing code (SHA-256 stored, single-use, 15-min TTL) → long-lived device token, revocable per device |
| Authorization | Role check **plus** resource scoping: `require_patient_access()` — a `patient_caregivers` row must exist. Unlinked patients return **404**, not 403 (no existence disclosure) |
| Secrets | Only via environment / `pydantic-settings`; `.env` gitignored; `.env.example` documents keys with dummy values |
| Biometric minimization | We store the **face embedding** (a vector), never the enrolled photo. The photo is discarded after embedding |
| Consent | Explicit `consents` row (who, when, purpose) required before any face is registered; face registration is refused without it |
| Deletion | Deleting a person cascades to their embeddings, memories links, relationships; deleting a patient cascades to everything |
| Input validation | Pydantic on every request body; lat/lng ranges, HH:MM formats, string lengths |
| File uploads | content-type allowlist + size cap + (vision service) re-decode via Pillow; 12 MB request-body cap middleware |
| Rate limiting | `slowapi` on `/auth/register` (5/h), `/auth/login` (10/min), `/patient/pair` (10/min). **SOS is not limited** — an emergency must always get through |
| Headers | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` |
| CORS | `*` in dev only; production reads an explicit allowlist from `CORS_ORIGINS` |
| Location privacy | Sent in the request **body**, never a URL; access scoped to linked caregivers; rows older than `LOCATION_RETENTION_DAYS` (30) are pruned |
| Prompt injection | Memory / note text is user-supplied and enters LLM prompts delimited and labelled "data, not instructions"; the RAG system prompt refuses to follow instructions found inside memories |
| Hallucination | RAG applies a cosine-similarity floor and answers "I'm not sure" when nothing clears it; the LLM may only rephrase retrieved, **caregiver-approved** memories |

## Known limitations / future work

- No audit log of caregiver reads.
- Caregiver alert delivery is the dashboard feed + a logging hook — no push/SMS/email yet
  (no caregiver mobile app).
- Rate limiting is in-memory (single instance); multi-instance needs Redis.
- Face-match threshold is conservative but not tuned on real-world data.
- Not penetration-tested. Dependency vulnerabilities are not continuously monitored.

## Legal context (mentioned, not certified)

GDPR treats biometrics as a special category; India's DPDP Act 2023 and Illinois BIPA
are also relevant. This project is not a compliance artifact.
