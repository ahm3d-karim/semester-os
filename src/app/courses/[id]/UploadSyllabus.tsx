'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalRaw } from '@/lib/use-local-store';

interface LlmConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const STAGES = ['Parsing document', 'Extracting items', 'Verifying against source'] as const;

export function UploadSyllabus({ courseId }: { courseId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reactive BYOK state: saving a key in Settings clears this banner instantly
  const rawLlm = useLocalRaw('sos_llm');
  let hasKey = false;
  let llm: LlmConfig | null = null;
  try {
    if (rawLlm) {
      llm = JSON.parse(rawLlm) as LlmConfig;
      hasKey = Boolean(llm.apiKey);
    }
  } catch {
    hasKey = false;
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!file) {
      setError('Choose a PDF or DOCX syllabus first.');
      return;
    }
    setUploading(true);
    setStage(0);
    // Stage ticker: MOTION 1's one purposeful animation. A 60s extraction must
    // show it is alive. Stages are estimates of the real pipeline order.
    const ticker = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 18000);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('courseId', courseId);
      if (llm?.apiKey) fd.set('llmApiKey', llm.apiKey);
      if (llm?.baseUrl) fd.set('llmBaseUrl', llm.baseUrl);
      if (llm?.model) fd.set('llmModel', llm.model);
      const res = await fetch('/api/ingest', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Upload failed.');
        return;
      }
      const s = data.summary ?? {};
      setMessage(
        `Extracted ${s.total_items ?? 0} items: ${s.passed ?? 0} passed, ${s.failed ?? 0} failed, ${s.auto_rejected ?? 0} auto-rejected. Review them below.`
      );
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      clearInterval(ticker);
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="border border-stone-200 rounded-xl p-5 space-y-3">
      <h2 className="text-base font-semibold">Syllabus</h2>
      {!hasKey && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Extraction needs an LLM key. <a href="/settings" className="underline font-medium">Add it in Settings</a> first;
          it stays in your browser and goes only to your provider.
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-stone-600 file:mr-3 file:px-4 file:py-2.5 file:rounded-lg file:border-0 file:bg-stone-100 file:text-sm file:font-medium file:cursor-pointer hover:file:bg-stone-200"
      />
      <button
        type="submit"
        disabled={uploading}
        className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {uploading ? 'Working...' : 'Upload and extract'}
      </button>

      {uploading && (
        <div className="pt-1">
          <ul className="space-y-1.5">
            {STAGES.map((label, i) => (
              <li key={label} className="flex items-center gap-2 text-sm">
                {i < stage ? (
                  <span aria-hidden="true" className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 16 16" className="w-2.5 h-2.5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3.2 3.2L13 5" /></svg>
                  </span>
                ) : i === stage ? (
                  <span aria-hidden="true" className="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin shrink-0" />
                ) : (
                  <span aria-hidden="true" className="w-4 h-4 rounded-full border-2 border-stone-300 shrink-0" />
                )}
                <span className={i <= stage ? 'text-stone-900' : 'text-stone-600'}>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {message && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{message}</p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
