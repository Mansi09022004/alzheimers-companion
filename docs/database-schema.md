# Database schema (draft)

Single PostgreSQL 16 database with the `pgvector` extension. Finalised table-by-table as each
phase lands; this is the target shape.

## Identity & access

**users** — one row per login account
`id, email (unique), password_hash, role ('caregiver' | 'patient'), full_name, is_active, created_at`

**caregiver_profiles** — `user_id (FK, PK), phone, relation_to_patient_note`

**patient_profiles** — `user_id (FK, PK), date_of_birth, notes, home_lat, home_lng, created_by (caregiver user_id)`

**patient_caregivers** — many-to-many link + per-link role
`id, patient_id (FK patient_profiles.user_id), caregiver_id (FK users.id), access_level ('owner' | 'viewer'), created_at`
> Authorization rule: a caregiver may only act on a patient that appears here for them.

**devices** — push tokens / provisioned patient devices
`id, user_id (FK), expo_push_token, device_token (for patient app login), platform, last_seen_at`

## People & relationships (the "graph")

**people** — family members / friends registered for a patient
`id, patient_id (FK), display_name, relationship_label ('son', 'daughter', 'wife'...), short_bio, is_active, created_at`

**person_relationships** — self-referential edges (kept in SQL, not a graph DB)
`id, patient_id (FK), from_person_id (FK people.id, nullable = the patient), to_person_id (FK people.id), relationship ('son_of', 'married_to', 'friend_of'), created_at`

**person_photos** — transient; used to build embeddings then usually deleted
`id, person_id (FK), storage_ref, kept (bool, caregiver opt-in), created_at`

**face_embeddings**
`id, person_id (FK), embedding vector(512), model_version, created_at`
> Index: HNSW on `embedding` once data grows.

**consents** — explicit consent to register a person's face
`id, patient_id (FK), person_id (FK), granted_by (caregiver user_id), purpose, granted_at, revoked_at (nullable)`

## Memories

**memories**
`id, patient_id (FK), person_id (FK, nullable), text, memory_date (nullable),
status ('pending' | 'approved' | 'rejected'),
source ('caregiver' | 'ai_suggestion'),
created_by (user_id, nullable for AI), reviewed_by (caregiver user_id, nullable), reviewed_at,
embedding vector(768), embedding_model, created_at`
> Only `status = 'approved'` rows are retrievable by RAG.
> Index: HNSW on `embedding`; btree on `(patient_id, status)`.

**memory_sources** — traceability for AI-suggested memories
`id, memory_id (FK), origin ('voice_transcript' | 'dashboard_note' | 'chat'), raw_excerpt, created_at`

## Medication & routine

**medications** — `id, patient_id (FK), name, dosage_note, schedule_times (time[]), active, created_by, created_at`

**medication_logs** — `id, medication_id (FK), scheduled_for (timestamp), status ('taken' | 'missed' | 'pending'), marked_by, marked_at`

**routine_items** — `id, patient_id (FK), title, time_of_day, days_of_week (int[]), active`

## Location & safety

**locations** — `id, patient_id (FK), lat, lng, accuracy_m, recorded_at` (append-only; retention-limited)

**geofences** — `id, patient_id (FK), name, center_lat, center_lng, radius_m, active, created_by`

**geofence_events** — `id, geofence_id (FK), patient_id (FK), event ('exit' | 'enter'), at_lat, at_lng, distance_m, occurred_at`

**emergency_contacts** — `id, patient_id (FK), name, phone, relation, priority, created_by`

**alerts** — explainable notifications sent to caregivers
`id, patient_id (FK), type ('geofence_exit' | 'sos' | 'medication_missed'), severity,
reason_text, context_json (last point, distance, time, med name...), created_at, acknowledged_by, acknowledged_at`

## Conventions

- All PKs are `bigint generated always as identity` (or UUID — decided in Phase 1).
- All tables carry `created_at timestamptz default now()`.
- Deletes of a patient or a person cascade to their dependent rows (memories, embeddings, photos, consents).
- Timestamps stored in UTC.
