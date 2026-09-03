# Semester OS — v1 Build Plan (LUMS-first)

> **Status:** Phases 0–6 COMPLETE (builds green, CI green). Phase 7 deployed pending Vercel auth (repo public, CLI installed).
> **Updated:** 2026-09-03 — v0.1 shipped to github.com/ahm3d-karim/semester-os; CI = lint + build + eval gate (harness thresholds: coverage ≥50%, verified ≥10). Deploy: `vercel link --yes && vercel --prod --yes` in DEMO_MODE (no env needed; DEMO falls back to true without SUPABASE_URL).
> **Goal:** A LUMS-first syllabus copilot: upload a syllabus → verified course model (deadlines, grade weights, policies, Session-N→date mapping) → weekly briefings + 5-day warnings delivered to WhatsApp/in-app, with a grade-budget that updates as grades land.
> **Architecture:** Thin Next.js 16 + Supabase + Vercel shell. All cognition lives in an agent-worker pipeline (ingest → parse → extract → verify → approve → model → brief). BYOK API keys per user. Local-first course-model JSON as the data contract.
> **Tech Stack:** Next.js 16 (App Router, React 19, Tailwind v4), Supabase (Postgres + Auth + Storage), Vercel, OpenAI-compatible BYOK LLM, WhatsApp Cloud API (+ in-app fallback). TDD + eval harness from day 1.

---

## 0. Locked decisions (from marination)

| Decision | Choice | Why |
|---|---|---|
| Scope | LUMS-first, campus beachhead | Dogfoodable now; session-based calendar is a real wedge |
| Calendar unit | "Session N" engine | LUMS syllabi say "due Session 12"; generic tools fail on this |
| Ground truth | Official LUMS academic calendar (lums.edu.pk/academic-calendar) seeded as data | Trust layer: institution layer is fact, course layer is cited |
| Ingestion | Upload-driven (PDF/docx/image) | No Sakai scraping; ToS-safe, robust. Sakai sync = v2 if ever |
| Hallucination control | Extract → verify → approve (human gate) | Sourced vs synthesized tiers, citation anchors, coverage score |
| Consult layer | Course-model JSON store + anchor index; full-text, no vector DB in v1 | Tiny corpus; precision beats recall |
| Backend | Agent-worker jobs (BYOK), agent-kanban pattern | Not hand-coded one-shot prompts; not Hermes-as-engine |
| Delivery | WhatsApp first, in-app fallback | LUMS lives on WhatsApp; templates/24h-window = Phase 5 risk |
| Grades | Manual entry v1 | Screenshot parsing is a v2 rabbit hole |
| Pilot course | FINN 372 (already processed once) | Warm start, golden fixture available |
| Repo | `~/Documents/Projects/Active/semester-os/` (public GitHub) | Portfolio piece |

## 1. Data model (Supabase)

```
institutions        id, code (LUMS), name, calendar_url
sessions            inst_id, term, session_no, date_start, date_end   -- Session N → dates
calendar_events     inst_id, term, title, date_start, date_end, official (add/drop, Q-drop, midterm week, finals…)
courses             id, inst_id, code, title, offering, status (active/archived)
syllabi             id, course_id, file_key (Storage), filename, status
ingest_jobs         id, syllabus_id, stage (parse|extract|verify|approve|model), status, log_json, error
model_items         id, course_id, kind (deadline|grade_component|policy|milestone|note),
                    title, detail, session_no, date, weight,
                    tier (sourced|synthesized), anchors_json (citations), verification_json (status, score),
                    approved (bool), created_at
course_models       id, course_id, version, items_ref, budget_json, status, supersedes_id
approvals           id, model_id, item_id, action (approve|edit|reject), user_note, decided_at
grade_entries       id, course_id, component_id, score, added_at
briefings           id, user_id, kind (weekly|warning|budget_delta), content, delivered_via, delivered_at
profiles            id, whatsapp_phone, delivery_prefs, default_course_ids
api_keys            user_id, provider, key_encrypted  -- BYOK
```

Course-model JSON = the versioned contract (schema in `docs/contract/course-model.v1.json`). Every item carries `anchors` + `tier` + `verification`.

## 2. Pipeline (agent-worker jobs, BYOK)

1. **parse** — PDF/docx (proven extraction pipeline; tesseract OCR only when needed) → markdown chunks with section/session anchors.
2. **extract** — LLM job → draft `model_items` (tier-labeled, anchor-cited). Structured output schema (zod).
3. **verify** — deterministic checks (anchor exists, exact-number match, session↔date consistency) + LLM round-trip judge → per-item score + coverage %. Failing items rejected/demoted, never shipped.
4. **approve** — human diff UI (per-item approve/edit/reject). Once per course ingestion.
5. **model build** — resolve Session N → dates via `sessions`, compute grade budget from weights, policies → flags.
6. **brief** — Monday 8am weekly brief + T-5 warnings + budget deltas; WhatsApp Cloud API (template messages) / in-app notifications; every briefing stored.

Job runner: DB-backed queue (ingest_jobs) + Vercel cron or a tiny worker (Phase 5 decision, see risks). Jobs call the BYOK LLM endpoint (user-configured, opencode Zen Go pattern reusable).

## 3. App surface (thin)

- `/courses` — list + ingest upload
- `/course/[id]` — timeline (Session-aware), grade budget, policies
- `/course/[id]/approve` — the trust-layer diff screen
- `/today` — this week's brief (what the agent said)
- `/settings` — BYOK key, WhatsApp opt-in, schedule

## 4. Phases + verification gates

| Phase | Deliverable | Gate |
|---|---|---|
| 0. Contract freeze | `course-model.v1.json` schema + brief template + verification rules (docs/) | Schema review with user |
| 1. Scaffold + data layer | create-next-app, Supabase migrations, DEMO_MODE db, auth | `npm run build` exit 0; migrations apply; demo boot |
| 2. Ingestion pipeline | parse + extract + verify jobs, job queue, eval-harness skeleton | Harness runs on golden fixture; coverage score renders |
| 3. Approval gate | diff UI, model versioning, item edits | E2E: upload → extract → verify → approve → model built |
| 4. Session engine + budget | sessions seed (Fall 2026), Session-N resolver, grade-budget calculator | Unit: "due Session 12" → correct date; budget math vs FINN 372 known numbers |
| 5. Brief agent + delivery | weekly + warnings, WhatsApp/in-app, briefing store | A brief for FINN 372 renders correctly end-to-end |
| 6. Eval + seed | golden set (3 real syllabi), CI gates, calendar seed | Fresh-in-turn pytest: coverage/anchor gates pass |
| 7. Dogfood + friends | Vercel deploy, 5-10 LUMS users, polish | 4 weeks of briefings, zero surprise deadline misses |

Execution model: me = planner/verifier; child agents per batch (self-contained prompts); batches ping Discord on completion (long-build convention). Seed data + golden fixtures from vault: FINN 372 addendum, CS 3812 plan, FINN 454 syllabus.

## 5. Risks / tradeoffs

- **WhatsApp proactive messaging:** Cloud API needs approved template messages; 24h session window for free-form. Fallback: in-app + email delivery first, WhatsApp best-effort. (Reuse existing WhatsApp gateway creds where possible.)
- **Supabase free tier:** storage/limits fine at pilot scale; BYOK keeps LLM cost user-side.
- **Job runner location:** Vercel cron is fine for weekly briefs; a queue worker may need a small server (or Supabase Edge Function) — decide in Phase 5 with cost in mind.
- **Vendor lock:** BYOK + contract JSON keeps the LLM layer swappable; institution data as data (LUMS → NUST/FAST later = seeding, not rewrites).
- **Reach ceiling:** LUMS is a wedge, not the ceiling; schema abstracts calendar-unit so other unis are data-entry, not rework.

## 6. Open items (defaults in place unless user overrides)

1. WhatsApp-first vs in-app-first delivery (default: in-app + email first, WhatsApp after template approval).
2. Public GitHub from day 1 (portfolio) vs private until Phase 7.
3. Repo path confirmed: `~/Documents/Projects/Active/semester-os/`.