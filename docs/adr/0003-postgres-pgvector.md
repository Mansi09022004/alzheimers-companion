# ADR 0003 — PostgreSQL + pgvector (one database)

**Status:** accepted · **Date:** 2026-09-07

## Context
Data is highly relational (patients, caregivers, people, relationships, memories, medications,
locations all reference each other) and needs integrity and transactions. We also need vector
similarity search for two things: memory retrieval (RAG) and face matching.

## Decision
Use one PostgreSQL 16 database. Add the `pgvector` extension and store embeddings as `vector`
columns on the same tables (`memories.embedding`, `face_embeddings.embedding`). Manage schema
with SQLAlchemy 2.0 + Alembic migrations.

## Consequences
- A memory and its embedding are written in one transaction and deleted together — no sync job
  between two stores.
- Retrieval can filter relationally and rank by similarity in one SQL query
  (`WHERE patient_id = :p AND status = 'approved' ORDER BY embedding <=> :q LIMIT 5`).
- One datastore to run, back up, secure, and pay for.
- Approximate-nearest-neighbour via an HNSW index when data grows; exact scan is fine early.

## Alternatives considered
- **Dedicated vector DB (Pinecone / Weaviate / Qdrant):** faster at millions of vectors and
  richer ANN tuning, but adds a second service, a sync problem, and cost. Our scale
  (hundreds–thousands of memories per patient) does not need it. Revisit at millions of vectors.
- **MongoDB:** would push foreign-key integrity and joins into application code.
