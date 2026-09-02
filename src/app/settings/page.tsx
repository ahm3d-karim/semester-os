export default function SettingsPage() {
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
          Bring your own LLM API key. Your key stays in your account and is never shared.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Provider</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option>OpenAI</option>
              <option>DeepSeek</option>
              <option>Other (OpenAI-compatible)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">API Key</label>
            <input type="password" placeholder="sk-..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Save Key
          </button>
        </div>
      </div>

      {/* Delivery */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">Delivery Preferences</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="rounded" />
            <span className="text-sm">In-app notifications</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">WhatsApp</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Email</span>
          </label>
        </div>
      </div>

      {/* About */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">About</h2>
        <p className="text-sm text-gray-500">
          Semester OS v0.1.0 — LUMS syllabus copilot. Built with Next.js 16, Supabase, and Vercel.
        </p>
      </div>
    </div>
  );
}
