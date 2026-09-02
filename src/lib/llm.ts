// Semester OS — BYOK LLM client
// Calls any OpenAI-compatible API (DeepSeek, OpenAI, etc.)

const BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com';
const API_KEY = process.env.LLM_API_KEY || '';
const MODEL = process.env.LLM_MODEL || 'deepseek-chat';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export async function chatCompletion(
  messages: LLMMessage[],
  options?: { temperature?: number; max_tokens?: number; response_format?: { type: 'json_object' } }
): Promise<LLMResponse> {
  if (!API_KEY || API_KEY === 'sk-placeholder') {
    throw new Error('LLM_API_KEY not configured. Set your BYOK key in Settings.');
  }

  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.max_tokens ?? 4096,
      response_format: options?.response_format,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content ?? '',
    usage: data.usage,
  };
}
