'use client';

import { useState } from 'react';
import { useLocalRaw, writeLocal } from '@/lib/use-local-store';

interface LlmConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

interface DeliveryPrefs {
  inApp: boolean;
  whatsapp: boolean;
  email: boolean;
}

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com',
  deepseek: 'https://api.deepseek.com',
  custom: '',
};

const DEFAULT_PREFS: DeliveryPrefs = { inApp: true, whatsapp: false, email: false };

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function SettingsPage() {
  // Reactive reads from localStorage (SSR-safe, no setState-in-effect)
  const rawLlm = useLocalRaw('sos_llm');
  const rawPrefs = useLocalRaw('sos_prefs');
  const llm = parseJson<LlmConfig | null>(rawLlm, null);
  const prefs = parseJson<DeliveryPrefs>(rawPrefs, DEFAULT_PREFS);

  // Form state (what the user is typing right now)
  const [provider, setProvider] = useState('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [savedKey, setSavedKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null);
  const [inApp, setInApp] = useState(prefs.inApp);
  const [whatsapp, setWhatsapp] = useState(prefs.whatsapp);
  const [email, setEmail] = useState(prefs.email);

  function handleProviderChange(p: string) {
    setProvider(p);
    setBaseUrl(PROVIDER_BASE_URLS[p] ?? '');
  }

  function handleSaveKey() {
    if (!apiKey.trim()) {
      setKeyMessage('Paste an API key first.');
      return;
    }
    const cfg: LlmConfig = {
      provider,
      apiKey: apiKey.trim(),
      baseUrl: (baseUrl || PROVIDER_BASE_URLS[provider] || '').trim() || undefined,
      model: model.trim() || undefined,
    };
    writeLocal('sos_llm', JSON.stringify(cfg));
    setApiKey('');
    setSavedKey(true);
    setKeyMessage(null);
  }

  function handleSavePrefs() {
    writeLocal('sos_prefs', JSON.stringify({ inApp, whatsapp, email }));
    setPrefsMessage('Preferences saved.');
  }

  const savedHasKey = Boolean(llm?.apiKey);
  const keyPlaceholder = savedHasKey ? 'Key saved — paste a new one to replace' : 'sk-...';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your Semester OS</p>
      </div>

      {/* BYOK */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">API Keys (BYOK)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Bring your own LLM API key. Stored only in this browser (localStorage) and sent directly
          to your provider when a syllabus is extracted. Never shared, never logged.
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="provider" className="block text-sm font-medium mb-1">Provider</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="deepseek">DeepSeek</option>
              <option value="openai">OpenAI</option>
              <option value="custom">Other (OpenAI-compatible)</option>
            </select>
          </div>
          {provider === 'custom' && (
            <>
              <div>
                <label htmlFor="baseurl" className="block text-sm font-medium mb-1">Base URL</label>
                <input
                  id="baseurl"
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://your-provider.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="model" className="block text-sm font-medium mb-1">Model name</label>
                <input
                  id="model"
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. llama-3.1-70b"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </>
          )}
          <div>
            <label htmlFor="apikey" className="block text-sm font-medium mb-1">API Key</label>
            <input
              id="apikey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={keyPlaceholder}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveKey}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Save Key
            </button>
            {savedKey && <span className="text-sm text-green-700">Key saved to this browser.</span>}
            {!savedKey && savedHasKey && (
              <span className="text-sm text-gray-500">A key is saved for this browser.</span>
            )}
          </div>
          {keyMessage && <p className="text-sm text-red-600">{keyMessage}</p>}
        </div>
      </div>

      {/* Delivery */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">Delivery Preferences</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} className="rounded" />
            <span className="text-sm">In-app notifications</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} className="rounded" />
            <span className="text-sm">WhatsApp (coming after template approval)</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="rounded" />
            <span className="text-sm">Email</span>
          </label>
          <button
            onClick={handleSavePrefs}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:border-gray-400 transition-colors"
          >
            Save preferences
          </button>
          {prefsMessage && <p className="text-sm text-green-700">{prefsMessage}</p>}
        </div>
      </div>

      {/* About */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">About</h2>
        <p className="text-sm text-gray-500">
          Semester OS v0.1.1 — LUMS syllabus copilot. Built with Next.js 16, Supabase, and Vercel.
        </p>
      </div>
    </div>
  );
}
