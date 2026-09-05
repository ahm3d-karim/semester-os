// Semester OS — Pipeline orchestrator
// parse → extract → verify (synchronous for v1)

import { parseSyllabus, type ParsedSyllabus } from './parse';
import { extractItems } from './extract';
import { verifyItems, type VerifyResult } from './verify';
import type { LLMOverride } from '@/lib/llm';
import type { ModelItem, IngestJob } from '@/lib/types';

export interface PipelineResult {
  parsed: ParsedSyllabus;
  verified: VerifyResult;
  job: IngestJob;
}

export async function runPipeline(
  fileBuffer: Buffer,
  filename: string,
  courseId: string,
  modelVersion: number,
  jobId: string,
  logFn?: (stage: string, msg: string) => void,
  llm?: LLMOverride
): Promise<PipelineResult> {
  const log = logFn ?? (() => {});

  // Stage 1: Parse
  log('parse', `Parsing ${filename} (${fileBuffer.length} bytes)`);
  const parsed = await parseSyllabus(fileBuffer, filename);
  log('parse', `Parsed ${parsed.page_count} pages, ${parsed.chunks.length} chunks, ${parsed.section_headings.length} sections`);

  // Stage 2: Extract
  log('extract', `Extracting items via LLM`);
  const { items, extraction } = await extractItems(parsed, courseId, modelVersion, llm);
  log('extract', `Extracted ${items.length} items (confidence: ${extraction.confidence})`);

  // Stage 3: Verify
  log('verify', `Verifying ${items.length} items`);
  const verified = await verifyItems(items, parsed, llm);
  log('verify', `Verified: ${verified.summary.passed} passed, ${verified.summary.failed} failed, ${verified.summary.auto_rejected} auto-rejected, coverage: ${verified.summary.coverage_pct}%`);

  return { parsed, verified, job: { id: jobId } as IngestJob };
}

// Re-export so the ingest route can persist extracted+verified items
export type { ModelItem };
