# Semester OS

A LUMS-first syllabus copilot. Upload a syllabus, get verified course models, weekly briefings, and grade tracking.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app runs in DEMO_MODE with a seeded FINN 372 course.

## Architecture

```
Upload Syllabus (PDF/docx)
        |
    [1] Parse        pdf-parse / mammoth -> markdown chunks
        |
    [2] Extract      LLM (BYOK) -> structured model_items (Zod validated)
        |
    [3] Verify       deterministic checks + LLM judge -> per-item scores
        |
    [4] Approve      human diff UI -> approve / edit / reject
        |
    [5] Model Build  Session-N resolver + grade budget calculator
        |
    [6] Brief        weekly briefs + T-5 warnings + budget deltas
```

## Tech Stack

- **Frontend:** Next.js 16 (App Router, React 19, Tailwind v4)
- **Backend:** Supabase (Postgres + Auth + Storage) or DEMO_MODE in-memory
- **LLM:** BYOK (bring your own key) - any OpenAI-compatible API
- **Validation:** Zod schemas matching course-model.v1.json contract
- **Deployment:** Vercel

## Environment Variables

See `.env.example`. Key variables:

| Variable | Description | Default |
|---|---|---|
| `DEMO_MODE` | Run with in-memory store | `true` |
| `LLM_BASE_URL` | OpenAI-compatible API endpoint | `https://api.deepseek.com` |
| `LLM_API_KEY` | Your LLM API key | - |
| `LLM_MODEL` | Model name | `deepseek-chat` |
| `SUPABASE_URL` | Supabase project URL | - |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | - |

## How to Add a Course

1. Go to `/courses` and click "Add Course"
2. Enter course code and title
3. Upload a syllabus (PDF or DOCX)
4. The pipeline extracts items automatically
5. Review extracted items at `/courses/[id]/approve`
6. Approve items to build the course model
7. View timeline and grade budget at `/courses/[id]`

## API Routes

| Method | Path | Description |
|---|---|---|
| POST | `/api/ingest` | Upload syllabus, run pipeline |
| POST | `/api/approve` | Approve or reject model items |
| POST | `/api/brief` | Generate a briefing for a course |
| GET | `/api/brief?courseId=...` | List briefings for a course |

## Project Structure

```
src/
  app/              pages and API routes
  lib/
    db.ts           DEMO_MODE in-memory / Supabase
    types.ts        TypeScript types (matches schema)
    llm.ts          BYOK LLM client
    session-engine.ts   Session-N date resolver
    grade-budget.ts     Budget calculator
    brief.ts            Brief generator
    ingest/         pipeline (parse, extract, verify)
eval/               evaluation harness + fixtures
supabase/           migrations and seed data
docs/contract/      data contract, brief templates, verification rules
```

## Data Contract

The course model schema is defined in `docs/contract/course-model.v1.json`. Every extracted item carries:
- `kind`: deadline, grade_component, policy, milestone, or note
- `tier`: sourced (directly quoted) or synthesized (inferred)
- `anchors`: citations back to the source syllabus
- `verification`: score (0-1) with deterministic checks + LLM judge

## Phase Status

- [x] Phase 0: Contract freeze (schema, brief templates, verification rules)
- [x] Phase 1: Scaffold + data layer (Next.js 16, Supabase, DEMO_MODE)
- [x] Phase 2: Ingestion pipeline (parse, extract, verify)
- [x] Phase 3: Approval gate (diff UI, model versioning)
- [x] Phase 4: Session engine + grade budget
- [x] Phase 5: Brief agent + delivery
- [x] Phase 6: Eval harness + seed data
- [x] Phase 7: Deploy config + docs

## License

MIT
