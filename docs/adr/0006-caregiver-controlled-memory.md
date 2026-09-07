# ADR 0006 — Caregiver-controlled AI memory & hallucination-resistant RAG

**Status:** accepted · **Date:** 2026-09-07

## Context
This is the product's differentiation layer: **Context + Personalized Memory + Caregiver
Control**. A wrong-but-confident answer to someone with dementia is harmful. Caregivers must
stay in control of what the AI "knows" and says.

## Decision
1. **Memory status workflow.** `memories.status ∈ {pending, approved, rejected}`. RAG retrieves
   **only** `approved` memories.
2. **AI suggestions need approval.** When the AI proposes a memory (from a chat or voice
   transcript), it is stored as `status = 'pending'`, `source = 'ai_suggestion'`, with its
   origin excerpt in `memory_sources`. The caregiver approves or rejects it in the dashboard.
3. **Hallucination guards in RAG.**
   - Hard filter by `patient_id` (+ `person_id` when known).
   - Vector rank, then a **similarity floor** — matches below threshold are dropped.
   - Small `LIMIT`.
   - System prompt: answer only from the supplied memories; if they don't contain the answer,
     say "I'm not sure"; never invent relationships or events.
4. **Source attribution.** Every AI answer returns the memory ids/text it used; both apps
   display "Based on: …".
5. **Personal relationships** stored in a self-referential `person_relationships` table (SQL,
   not a graph database) and fed into the context prompt.

## Consequences
- The caregiver is the single source of truth; the LLM only rephrases approved facts.
- Answers are auditable and explainable.
- Slightly more UI (an approval queue) and one extra column + table.

## Alternatives considered
- **Let the LLM answer freely from all notes:** simplest, but unbounded hallucination risk and
  no caregiver control — unacceptable for this user group.
- **Neo4j for relationships:** the graph is tiny (a family); a SQL table with a recursive query
  is enough and avoids a second database.
