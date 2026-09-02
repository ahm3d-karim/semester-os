# Verification Rules

Every model_item passes through these checks during the verify stage (step 3 of the pipeline). Items that fail any deterministic check OR score below the threshold are flagged for human review or auto-rejected.

---

## Deterministic Checks (pass/fail, no LLM)

### 1. Anchor Exists
- Rule: at least one anchor's `source_text` must appear as a substring in the parsed syllabus markdown.
- Implementation: case-insensitive substring match, ignoring whitespace normalization.
- Fail action: item score penalized by 0.3; flagged for human review.

### 2. Number Match
- Rule: if the item contains numeric values (weights, scores, dates, percentages), each number must appear in the corresponding anchor's source_text.
- Implementation: regex extraction of numbers from item detail and anchor text; set comparison.
- Fail action: item score penalized by 0.2; flagged for human review.
- Exception: synthesized items may have numbers not in any single anchor (inferred from multiple); this check applies only to sourced items.

### 3. Session-Date Consistent
- Rule: if `session_no` is set, it must map to a valid date in the `sessions` table for this institution + term.
- Implementation: `SELECT date_start FROM sessions WHERE inst_id = ? AND term = ? AND session_no = ?` — must return a row.
- Fail action: item auto-rejected (session number is factually wrong).

### 4. Weight Sum (grade components only)
- Rule: all approved `grade_component` items for a course must have weights that sum to 100.
- Implementation: sum of `weight` across all grade_component items with `approved = true`.
- Fail action: budget status set to `over` or `under`; warning shown to user; items NOT rejected (user may have partial syllabus).

---

## LLM Round-Trip Judge

After deterministic checks, each item is scored by the LLM:

**Prompt pattern:**
```
Given this source text from a course syllabus:
---
{anchor.source_text}
---

Does this extracted item accurately represent the source?
Item: {item.title} — {item.detail}
Kind: {item.kind}

Answer: pass/fail + one-sentence reason.
```

- Score = (deterministic_passes / 4) * 0.5 + (llm_judge_pass ? 0.5 : 0.0)
- Deterministic passes = count of checks 1-4 that passed (check 4 is pass/fail for the whole model, not per-item, so per-item score uses checks 1-3 + llm).

**Per-item score formula:**
```
det_score = (anchor_exists + number_match + session_date_consistent) / 3
item_score = det_score * 0.5 + (llm_judge.pass ? 0.5 : 0.0)
```

---

## Thresholds

| Score | Action |
|---|---|
| >= 0.7 | Auto-approved (still shown in diff UI for human confirmation) |
| 0.5 - 0.69 | Needs human review (shown in diff UI with warnings) |
| < 0.5 | Auto-rejected (not shown in diff UI; logged in verification_summary) |

---

## Coverage Gate

After all items are verified:
- `coverage_pct` = (sections with at least one item / total sections in syllabus) * 100
- Minimum threshold: 60%
- If coverage < 60%: model status stays `draft`; user is prompted "The extracted model covers only {coverage}% of the syllabus sections. Consider re-uploading or manually adding missing items."

Sections are identified by headings in the parsed markdown (e.g., "Grading", "Schedule", "Policies", "Course Description").

---

## Deterministic Check Implementation Notes

All checks run in-memory against the parsed syllabus markdown (stored as a blob in `ingest_jobs.log_json` during the parse stage). No external API calls needed for checks 1-4. The LLM judge (check 5) calls the user's BYOK endpoint.

Checks 1-3 are per-item. Check 4 is per-model (run once after all items are extracted). The LLM judge is per-item and runs in parallel across items (batched by the worker).

---

## Failure Handling

- Deterministic failure → item gets `verification.checks.{check} = false`; score penalized; item still enters the diff UI unless auto-rejected (score < 0.5).
- LLM failure (API error, timeout) → item treated as `llm_judge.pass = false`; score penalized; flagged for retry or human review.
- All failures logged in `ingest_jobs.log_json` with timestamps and error details.
