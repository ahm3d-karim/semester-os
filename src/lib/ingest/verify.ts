// Semester OS — Verification step
// Deterministic checks + LLM round-trip judge

import { chatCompletion } from '@/lib/llm';
import type { ModelItem } from '@/lib/types';
import type { ParsedSyllabus } from './parse';

export interface VerifyResult {
  items: ModelItem[];
  summary: {
    total_items: number;
    passed: number;
    failed: number;
    auto_rejected: number;
    coverage_pct: number;
  };
}

export async function verifyItems(
  items: ModelItem[],
  parsed: ParsedSyllabus
): Promise<VerifyResult> {
  const fullText = parsed.markdown.toLowerCase();
  const verified: ModelItem[] = [];

  for (const item of items) {
    // Check 1: anchor exists in source text
    const anchorExists = item.anchors.some((a) =>
      fullText.includes(a.source_text.toLowerCase().slice(0, 20))
    );

    // Check 2: numbers match (sourced items only)
    let numberMatch = true;
    if (item.tier === 'sourced' && item.weight !== null) {
      numberMatch = fullText.includes(String(item.weight));
    }

    // Check 3: session-date consistent (placeholder — real check needs sessions table)
    const sessionDateConsistent = item.session_no === null || item.session_no >= 1;

    // Deterministic score
    const detScore = (Number(anchorExists) + Number(numberMatch) + Number(sessionDateConsistent)) / 3;

    // LLM judge
    let llmPass = false;
    let llmReason = 'pending';
    try {
      const anchorText = item.anchors[0]?.source_text ?? '';
      const judgeRes = await chatCompletion([
        {
          role: 'system',
          content: 'You are a verification judge. Given a source text from a syllabus and an extracted item, determine if the item accurately represents the source. Answer with JSON: {"pass": true/false, "reason": "one sentence"}',
        },
        {
          role: 'user',
          content: `Source: "${anchorText}"\n\nItem: ${item.title} — ${item.detail}\n\nDoes this accurately represent the source?`,
        },
      ], { temperature: 0, max_tokens: 200, response_format: { type: 'json_object' } });

      const judgeResult = JSON.parse(judgeRes.content);
      llmPass = judgeResult.pass === true;
      llmReason = judgeResult.reason ?? 'no reason';
    } catch {
      llmPass = false;
      llmReason = 'LLM judge call failed';
    }

    // Compute score: det * 0.5 + llm * 0.5
    const score = detScore * 0.5 + (llmPass ? 0.5 : 0);

    // Update verification
    item.verification = {
      score,
      checks: {
        anchor_exists: anchorExists,
        number_match: numberMatch,
        session_date_consistent: sessionDateConsistent,
        llm_judge: { pass: llmPass, reason: llmReason },
      },
      auto_rejected: score < 0.5,
    };

    verified.push(item);
  }

  // Compute summary
  const passed = verified.filter((i) => i.verification.score >= 0.5).length;
  const failed = verified.length - passed;
  const autoRejected = verified.filter((i) => i.verification.auto_rejected).length;

  // Coverage: sections with at least one item / total sections
  const sectionsWithItems = new Set(
    verified.flatMap((i) => i.anchors.map((a) => a.section).filter(Boolean))
  ).size;
  const totalSections = parsed.section_headings.length || 1;
  const coveragePct = Math.min(100, Math.round((sectionsWithItems / totalSections) * 100));

  return {
    items: verified,
    summary: {
      total_items: verified.length,
      passed,
      failed,
      auto_rejected: autoRejected,
      coverage_pct: coveragePct,
    },
  };
}
