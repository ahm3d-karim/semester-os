// Semester OS — BYOK LLM client
// Calls any OpenAI-compatible API (DeepSeek, OpenAI, custom).
//
// Key resolution order: per-call override (BYOK from the browser, demo mode)
// → LLM_API_KEY env var. Throws a clear error when neither is set.

const ENV_BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com';
const ENV_API_KEY = process.env.LLM_API_KEY || '';
const ENV_MODEL = process.env.LLM_MODEL || 'deepseek-chat';

export interface LLMOverride {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface LLMCallOptions {
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
  llm?: LLMOverride;
}

export async function chatCompletion(
  messages: LLMMessage[],
  options?: LLMCallOptions
): Promise<LLMResponse> {
  const apiKey = options?.llm?.apiKey || ENV_API_KEY;
  const baseUrl = options?.llm?.baseUrl || ENV_BASE_URL;
  const model = options?.llm?.model || ENV_MODEL;

  if (!apiKey || apiKey === '***') {
    throw new Error(
      'No LLM API key configured. Add your key in Settings (BYOK) — it stays in your browser and is sent only to your provider.'
    );
  }

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.max_tokens ?? 4096,
      response_format: options?.response_format,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content ?? '',
    usage: data.usage,
  };
}
