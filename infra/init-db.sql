-- Runs automatically once when the Postgres container is first created.
-- Enables the pgvector extension so we can store embeddings and do
-- similarity search inside Postgres.

CREATE EXTENSION IF NOT EXISTS vector;
