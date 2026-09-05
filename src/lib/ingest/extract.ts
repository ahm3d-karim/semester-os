// Semester OS — LLM extraction step
// Takes parsed syllabus markdown → structured model_items via LLM

import { randomUUID } from 'node:crypto';
import { chatCompletion, type LLMOverride } from '@/lib/llm';
import { ExtractionResultSchema, type ExtractionResult } from './schema';
import type { ParsedSyllabus } from './parse';
import type { ModelItem } from '@/lib/types';

const SYSTEM_PROMPT = `You are a syllabus extraction engine. Given a course syllabus in markdown, extract all structured information as JSON.

Extract these item types:
- "deadline": date-bound deliverables (assignments, quizzes, exams, project due dates)
- "grade_component": graded items with percentage weights (midterm 30%, final 40%, etc.)
- "policy": course rules (attendance, late submission, academic honesty, grading scale)
- "milestone": non-graded date markers (add/drop deadline, midterm week, finals week)
- "note": general course information (prerequisites, textbook, office hours)

For each item:
1. Set session_no if the syllabus references a LUMS session number (e.g., "due Session 4" → 4)
2. Set weight only for grade_component items
3. Set tier: "sourced" if directly quoted, "synthesized" if inferred from multiple passages
4. Always include at least one anchor with the exact source text and page number

Return valid JSON matching the ExtractionResult schema.`;

export async function extractItems(
  parsed: ParsedSyllabus,
  courseId: string,
  modelVersion: number,
  llm?: LLMOverride
): Promise<{ items: ModelItem[]; extraction: ExtractionResult }> {
  // Truncate if too long (LLM context limit)
  const maxChars = 12000;
  const markdown = parsed.markdown.length > maxChars
    ? parsed.markdown.slice(0, maxChars) + '\n\n[...truncated...]'
    : parsed.markdown;

  const response = await chatCompletion([
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Extract all structured items from this syllabus. Return JSON with "items" array, "sections_found" array, and "confidence" number.\n\n${markdown}`,
    },
  ], {
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    llm,
  });

  // Parse and validate
  const raw = JSON.parse(response.content);
  const extraction = ExtractionResultSchema.parse(raw);

  // Convert to ModelItem format
  const items: ModelItem[] = extraction.items.map((item) => ({
    id: randomUUID(),
    course_id: courseId,
    model_version: modelVersion,
    kind: item.kind,
    title: item.title,
    detail: item.detail,
    session_no: item.session_no,
    date: null, // resolved in model-build step
    session_range: null,
    weight: item.weight,
    tier: item.tier,
    anchors: item.anchors.map((a) => ({
      source_text: a.source_text,
      page: a.page,
      section: a.section ?? null,
      char_offset: null,
    })),
    verification: {
      score: 0, // computed in verify step
      checks: {
        anchor_exists: false,
        number_match: false,
        session_date_consistent: false,
        llm_judge: { pass: false, reason: 'pending' },
      },
      auto_rejected: false,
    },
    approved: false,
    approved_at: null,
    approval_note: null,
    created_at: new Date().toISOString(),
  }));

  return { items, extraction };
}
