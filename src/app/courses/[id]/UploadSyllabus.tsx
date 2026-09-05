'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalRaw } from '@/lib/use-local-store';

interface LlmConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export function UploadSyllabus({ courseId }: { courseId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reactive BYOK state — when a key is saved in Settings, this banner disappears
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
        `Extracted ${s.total_items ?? 0} items: ${s.passed ?? 0} passed, ${s.failed ?? 0} failed, ${s.auto_rejected ?? 0} auto-rejected. Review them on the approval page.`
      );
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="border border-gray-200 rounded-xl p-5 space-y-3">
      <h2 className="text-lg font-semibold">Syllabus</h2>
      {!hasKey && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No LLM key saved. Extraction needs one —{' '}
          <a href="/settings" className="underline">add it in Settings</a> first, or set LLM_API_KEY on the server.
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-gray-100 file:text-sm file:font-medium file:cursor-pointer"
      />
      <button
        type="submit"
        disabled={uploading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {uploading ? 'Extracting and verifying... (this can take a minute)' : 'Upload and extract'}
      </button>
      {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
