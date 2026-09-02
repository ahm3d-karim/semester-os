// Semester OS — Syllabus parser
// PDF/docx → markdown chunks with page markers and section anchors

import type { ParsedChunk } from '@/lib/types';

export interface ParsedSyllabus {
  markdown: string;
  chunks: ParsedChunk[];
  page_count: number;
  section_headings: string[];
}

// Parse PDF or docx buffer → structured markdown
export async function parseSyllabus(
  buffer: Buffer,
  filename: string
): Promise<ParsedSyllabus> {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'pdf') {
    return parsePDF(buffer);
  } else if (ext === 'docx') {
    return parseDOCX(buffer);
  } else {
    throw new Error(`Unsupported file type: .${ext}. Use PDF or DOCX.`);
  }
}

async function parsePDF(buffer: Buffer): Promise<ParsedSyllabus> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require('pdf-parse') as { PDFParse: (buf: Buffer) => Promise<{ text: string; numpages: number }> };
  const data = await PDFParse(buffer);

  const chunks: ParsedChunk[] = [];
  const section_headings: string[] = [];

  // pdf-parse gives us per-page text via the internal structure
  // We'll split by page markers and detect sections
  const fullText = data.text;
  const pages = fullText.split(/\f/); // form-feed = page break

  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i].trim();
    if (!pageText) continue;

    // Detect section headings (lines that look like headers)
    const lines = pageText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (isSectionHeading(trimmed)) {
        section_headings.push(trimmed);
      }
    }

    chunks.push({
      page: i + 1,
      text: pageText,
      markdown: textToMarkdown(pageText),
    });
  }

  // Build full markdown with page markers
  const markdown = chunks
    .map((c) => `<!-- PAGE ${c.page} -->\n${c.markdown}`)
    .join('\n\n---\n\n');

  return { markdown, chunks, page_count: pages.length, section_headings };
}

async function parseDOCX(buffer: Buffer): Promise<ParsedSyllabus> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });

  const text = result.value;
  const chunks: ParsedChunk[] = [];
  const section_headings: string[] = [];

  // Split by double newlines into sections
  const sections = text.split(/\n\s*\n/);

  let charOffset = 0;
  for (let i = 0; i < sections.length; i++) {
    const sectionText = sections[i].trim();
    if (!sectionText) {
      charOffset += 2;
      continue;
    }

    const firstLine = sectionText.split('\n')[0].trim();
    if (isSectionHeading(firstLine)) {
      section_headings.push(firstLine);
    }

    chunks.push({
      page: 1, // docx doesn't have pages
      text: sectionText,
      markdown: textToMarkdown(sectionText),
      char_offset: charOffset,
    });
    charOffset += sectionText.length + 2;
  }

  const markdown = chunks.map((c) => c.markdown).join('\n\n---\n\n');

  return { markdown, chunks, page_count: 1, section_headings };
}

// Detect if a line is likely a section heading
function isSectionHeading(line: string): boolean {
  // Common syllabus section headings
  const headingPatterns = [
    /^(course\s+(description|overview|objectives))/i,
    /^(instructor|ta\s|teaching\s+assistant)/i,
    /^(schedule|timeline|session|topics)/i,
    /^(grading|grade|assessment|evaluation)/i,
    /^(policies?|rules|regulations|attendance)/i,
    /^(prerequisites?|requirements?)/i,
    /^(textbook|books?|readings?|materials?)/i,
    /^(assignments?|homework|projects?|exams?)/i,
    /^(office\s+hours?|contact)/i,
    /^(academic\s+honesty|plagiarism|integrity)/i,
    /^(important\s+dates?|deadlines?)/i,
    /^(course\s+code|course\s+number)/i,
  ];

  // Short lines that are all caps or title case
  if (line.length < 60 && /^[A-Z][A-Z\s&:]+$/.test(line)) return true;
  if (line.length < 60 && /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(line)) {
    // Title case but check it matches known patterns
    for (const p of headingPatterns) {
      if (p.test(line)) return true;
    }
  }

  return false;
}

// Simple text → markdown conversion
function textToMarkdown(text: string): string {
  return text
    .replace(/\t/g, '  ')
    .replace(/ {2,}/g, '  ')
    .trim();
}
