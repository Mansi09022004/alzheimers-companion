# Competitive analysis & differentiation

> Purpose: show that this project was designed *after* researching what already exists, that we
> understand the gaps, and that our differentiation is a **specific, defensible combination** —
> not the false claim "nobody has built a dementia app".

_Last researched: 2026-09-09._

## 1. What already exists

### Face recognition for family members — **EXISTS**
| Product | What it does | Notes |
|---|---|---|
| **Timeless** (Timeless Innovations) | "Identify" feature: point camera → name + relationship. Also photo feed, day reminders, picture phone book. | Built by a teenager for a grandparent; consumer app. Faces auto-tagged by AI. |
| **I-Remember** (Microsoft / Univ. of Lisbon) | AI face recognition to help early-stage patients recognise people. | Research/pilot. |
| **"Remember Me!"** | Uploaded photos + GPS: alerts patient when a known contact approaches, shows who + photo. | Concept/prototype. |
| Various academic apps | Real-time face recognition, add faces live or by image. | Papers, not shipped products. |

**Takeaway:** face-ID for family is **not novel on its own.** We must not claim it is.

### GPS tracking & geofencing — **EXISTS, mature, mostly hardware**
AngelSense, SureSafe, Family1st, MedicAlert — dedicated GPS watches/pendants with live location,
safe-zone geofencing, exit alerts, SOS button. This is a solved, commoditised space and the
incumbents have better hardware battery life than a phone app ever will.

**Takeaway:** our geofencing is table-stakes, not a differentiator. Be honest that dedicated
trackers are better for pure safety; our value is *integration* with the rest of the context.

### Medication reminders — **COMMODITY**
Medisafe, MyTherapy, plus every dementia app bundles reminders. Nothing to claim here.

### Caregiver coordination — **EXISTS**
Carely (private family feed, visit coordination, shared updates), CareMobi (connects caregivers +
day centres + providers), Alzheimer's Association "My ALZ Journey" (2025, newly-diagnosed
navigation). These are communication/logistics tools, not AI memory systems.

### AI chatbots in dementia care — **EXISTS, but aimed at the CAREGIVER, grounded in CLINICAL text**
| System | Who it helps | Knowledge source |
|---|---|---|
| **RISE** (social robot + RAG) | Caregiver — training, stress management | Verified *REACH Caregiver Notebook*. Reports 87% correctness, 92% relevancy. Explicitly uses RAG to minimise hallucination. |
| **ADQueryAid** | ADRD caregivers — Q&A, emotional support | LLM + RAG over ADRD knowledge; beat ChatGPT-3.5 on usability. |
| **AlzheimerRAG** | Clinicians / researchers | Multimodal RAG over PubMed articles. |
| **DEMENTIA-PLAN** | Care planning | Multi-knowledge-graph RAG. |

**Takeaway:** "RAG to reduce hallucination in dementia AI" is a **known research idea** — but
every instance grounds on a *fixed, generic, clinical* corpus and serves the *caregiver*.

### Integrated "all-in-one" platforms — **EMERGING in research, still fragmented in market**
CareBuddy / "mobile care ecosystem" (assessments + AI chatbot + GPS + telemedicine + peer
support) and Demensia KITA ("one-stop centre") are academic prototypes. Systematic reviews say
commercial apps remain **fragmented**, lack **personalization**, and struggle with the tension
between **simple** and **multifunctional**.

## 2. Gaps we found (and target)

| # | Gap in the market | Our answer |
|---|---|---|
| G1 | AI dementia assistants retrieve from **generic clinical text** to help the **caregiver**. No one runs RAG over **the family's own curated memories** to answer **the patient's** "tell me about Rahul". | **Personal-memory RAG for the patient.** The knowledge base is per-patient, human-written family memories — not PubMed. |
| G2 | Face-ID apps "learn faces" and photo-feed apps let family post freely — but the **AI is not gated on human-verified facts**. Research RAG systems ground on a *fixed* notebook nobody edits. | **Caregiver-controlled knowledge with an approval queue.** `memories.status` = pending/approved/rejected. The assistant can only say **approved** facts. AI-suggested memories wait for caregiver approval. |
| G3 | Consumer dementia apps give answers with **no provenance**. Explainability is a research-only concept. | **Source attribution shown in-app**: "Based on: a memory from 12 March — 'Rahul visited with mangoes'." |
| G4 | A confidently **wrong** answer to a dementia patient is uniquely harmful, yet consumer assistants happily guess. | **Hallucination-resistant by design**: similarity floor, approved-only retrieval, explicit "I'm not sure — ask a family member" fallback. Never invents relationships or events. |
| G5 | Capabilities are **split across apps and devices**: face-ID in one app, GPS in a watch, reminders in another, coordination in a fourth. Patient must switch contexts; caregiver juggles dashboards. | **One Context Engine** fuses face + relationship graph + approved memories + medication + location into a *single* calm response. "Who is this?" → who + how they're related + when they last visited. "Why am I here?" → time + place + next medication + today's routine. |
| G6 | Biometric data of vulnerable people is captured casually ("the app learns faces"). | **Consent-first**: explicit consent record before any face is registered; we store the **embedding, not the photo**; one-tap delete of a person removes their embeddings + memories. |
| G7 | Personal relationships aren't modelled — apps store a flat contact list. | **Relationship graph** (self-referential table): "Rahul → son of → patient", "Meera → married to → Rahul" feeds richer context. |

## 3. Honest positioning (use this in interviews)

> "I researched the space first. Face recognition for family exists — Timeless, Microsoft's
> I-Remember. GPS geofencing is a mature hardware market — AngelSense, SureSafe. AI chatbots
> for dementia exist in research — RISE, ADQueryAid — but they help the *caregiver* and are
> grounded in *medical literature*.
>
> Two gaps stood out. **One**, the market is fragmented — each capability is a separate app or
> device. **Two**, where AI exists, no human controls what it tells the *patient*.
>
> So my project's thesis is a single system where the assistant's entire knowledge is a
> **caregiver-approved, per-patient memory store**; every answer is **grounded and cites its
> source**; it **refuses to guess**; and a **Context Engine** fuses recognition, relationships,
> memories, medication and location into one response.
>
> I'm not claiming I invented the dementia app. I'm claiming this specific combination —
> caregiver-controlled, hallucination-resistant, context-aware *personal* memory — is not
> something the current market or research prototypes actually ship."

## 4. What NOT to claim (interview traps)

- ❌ "Nothing like this exists." → False; you'll be caught. Say "this *combination* isn't shipped."
- ❌ "Better than AngelSense for safety." → Dedicated trackers have better battery/hardware. Our edge is integration, not raw tracking.
- ❌ "Medically validated." → It's a prototype, not a medical device. Always say so.
- ❌ "Face recognition is my innovation." → It isn't. The *caregiver-controlled, consent-first, context-fused* use of it is the story.

## 5. Sources

- https://caringvillage.com/blog/caregiver-tech/dementia-caregiver-apps/
- https://www.alz.org/news/2025/mobile-app-my-alz-journey-newly-diagnosed-dementia
- https://news.microsoft.com/europe/features/i-remember-an-app-that-helps-people-with-alzheimers-recognize-faces-using-ai/
- https://www.timeless.care/home
- https://patient-innovation.com/post/1551
- https://www.slashgear.com/timeless-app-by-14-year-old-helps-alzheimers-patients-identify-faces-03564498/
- https://family1st.io/best-gps-trackers-for-dementia-patients/
- https://health.usnews.com/senior-care/articles/best-ai-and-tech-tools-for-dementia-care-2026-guide
- https://www.ijert.org/an-ai-powered-wearable-system-for-context-aware-memory-assistance-in-alzheimers-and-dementia-care
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12886016/ (RISE — AI social robotics for caregivers)
- https://www.nature.com/articles/s44385-024-00004-8 (ADQueryAid — conversational AI for Alzheimer's caregivers)
- https://arxiv.org/pdf/2412.16701 (AlzheimerRAG)
- https://arxiv.org/pdf/2503.20950 (DEMENTIA-PLAN — KG-RAG)
- https://arxiv.org/pdf/2506.15047 (Mapping Caregiver Needs to AI Chatbot Design — strengths & gaps)
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12810113/ (mobile care ecosystem / CareBuddy)
- https://www.sciencedirect.com/org/science/article/pii/S256176052400104X (systematic review of mHealth dementia caregiver apps)
- https://www.nature.com/articles/s41598-024-69947-7 (Demensia KITA)
