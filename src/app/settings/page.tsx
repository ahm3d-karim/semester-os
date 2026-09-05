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
  const rawLlm = useLocalRaw('sos_llm');
  const rawPrefs = useLocalRaw('sos_prefs');
  const llm = parseJson<LlmConfig | null>(rawLlm, null);
  const prefs = parseJson<DeliveryPrefs>(rawPrefs, DEFAULT_PREFS);

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
  const keyPlaceholder = savedHasKey ? 'Key saved, paste a new one to replace' : 'sk-...';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Your key never leaves this browser except to call your provider.
        </p>
      </div>

      {/* BYOK */}
      <div className="border border-stone-200 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold">LLM API key</h2>
          <p className="text-sm text-stone-600 mt-1">
            Extraction runs on your own key (bring your own key). It is stored
            in this browser only, sent directly to your provider when you upload
            a syllabus, and never stored on the server.
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="provider" className="block text-sm font-medium mb-1">Provider</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-600"
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
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-600"
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
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-600"
                />
              </div>
            </>
          )}
          <div>
            <label htmlFor="apikey" className="block text-sm font-medium mb-1">API key</label>
            <input
              id="apikey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={keyPlaceholder}
              autoComplete="off"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-600"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveKey}
              className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Save key
            </button>
            {savedKey && <span className="text-sm text-emerald-700">Saved to this browser.</span>}
            {!savedKey && savedHasKey && (
              <span className="text-sm text-stone-600">A key is saved for this browser.</span>
            )}
          </div>
          {keyMessage && <p className="text-sm text-red-700">{keyMessage}</p>}
        </div>
      </div>

      {/* Delivery */}
      <div className="border border-stone-200 rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold">Delivery preferences</h2>
        <p className="text-sm text-stone-600">
          Where weekly digests and deadline warnings should reach you. In-app is
          live; the others arrive with the notification pipeline.
        </p>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} className="rounded accent-emerald-700" />
          <span className="text-sm">In-app (Today page and course pages)</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} className="rounded accent-emerald-700" />
          <span className="text-sm text-stone-600">WhatsApp (coming soon)</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="rounded accent-emerald-700" />
          <span className="text-sm">Email</span>
        </label>
        <button
          onClick={handleSavePrefs}
          className="border border-stone-300 text-stone-700 px-4 py-2 rounded-lg text-sm font-medium hover:border-stone-500 transition-colors"
        >
          Save preferences
        </button>
        {prefsMessage && <p className="text-sm text-emerald-700">{prefsMessage}</p>}
      </div>

      {/* About */}
      <div className="border border-stone-200 rounded-xl p-5">
        <h2 className="text-base font-semibold mb-2">About</h2>
        <p className="text-sm text-stone-600">
          Semester OS v0.1.1. The verification-first study planner: nothing
          enters your plan until it is checked against its source. Open source
          on <a href="https://github.com/ahm3d-karim/semester-os" className="text-emerald-700 hover:underline">GitHub</a>.
        </p>
      </div>
    </div>
  );
}
