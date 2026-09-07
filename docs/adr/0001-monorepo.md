# ADR 0001 — Monorepo

**Status:** accepted · **Date:** 2026-09-07

## Context
The system has four deployable parts: core API, vision service, patient mobile app, caregiver
dashboard. It is built by one person. Features routinely touch the DB schema, a backend
endpoint, and both frontends at once.

## Decision
Keep everything in one Git repository with top-level folders per part. No monorepo tooling
(Nx / Turborepo / Lerna) — plain folders.

## Consequences
- One clone, one history, one CI pipeline, one issue tracker, one place to demo.
- Cross-cutting changes land in a single atomic commit.
- Shared TypeScript API types live in `packages/shared-types/` and are imported by both frontends.
- Each folder keeps its own dependency file, Dockerfile, and tests — services stay
  independently deployable. **Shared repo, not shared runtime.**

## Alternatives considered
- **Polyrepo (one repo per service):** solves team-ownership and access-control problems we
  don't have; adds cross-repo PR coordination and version drift. Rejected for a solo project.
- **Monorepo tooling:** solves build-graph/caching problems that appear at many-package scale.
  Premature here. Can add later without moving files.
