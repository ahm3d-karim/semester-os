// Semester OS — Zod schema for LLM structured output
// Validates extracted model_items against the course-model.v1 contract

import { z } from 'zod';

export const AnchorSchema = z.object({
  source_text: z.string().min(1).describe('Exact text from the syllabus that this item was extracted from'),
  page: z.number().int().positive().describe('Page number in the source PDF/docx'),
  section: z.string().nullable().optional().describe('Section heading if identifiable'),
});

export const ModelItemSchema = z.object({
  kind: z.enum(['deadline', 'grade_component', 'policy', 'milestone', 'note'])
    .describe('deadline=date-bound deliverable, grade_component=graded item with weight, policy=course rule, milestone=non-graded date marker, note=general info'),
  title: z.string().min(1).max(200).describe('Human-readable item title'),
  detail: z.string().max(2000).describe('Expanded description or policy text'),
  session_no: z.number().int().min(1).max(40).nullable()
    .describe('LUMS session number (1-based) from the syllabus, or null if not session-anchored'),
  weight: z.number().min(0).max(100).nullable()
    .describe('Percentage weight for grade_components only. null for non-grade items.'),
  tier: z.enum(['sourced', 'synthesized'])
    .describe('sourced=directly quoted from syllabus, synthesized=inferred from multiple passages'),
  anchors: z.array(AnchorSchema).min(1)
    .describe('Citations back to source text. At least one required.'),
});

export const ExtractionResultSchema = z.object({
  items: z.array(ModelItemSchema).min(1).describe('Extracted model items from the syllabus'),
  sections_found: z.array(z.string()).describe('Section headings identified in the syllabus'),
  confidence: z.number().min(0).max(1).describe('Overall extraction confidence'),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
export type ExtractedItem = z.infer<typeof ModelItemSchema>;
