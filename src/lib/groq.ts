// User-provided Groq API key support. Stored in localStorage only — never sent
// anywhere except directly to the Groq API from the browser. When present, the
// app prefers Groq for AI generation (chat, workout, diet) and falls back to
// Supabase Edge Functions / on-device generators if the call fails.

const KEY = "user_groq_api_key";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

export function getGroqKey(): string {
  if (typeof window === "undefined") return "";
  try { return localStorage.getItem(KEY) || ""; } catch { return ""; }
}

export function setGroqKey(value: string) {
  if (typeof window === "undefined") return;
  const v = value.trim();
  try {
    if (v) localStorage.setItem(KEY, v);
    else localStorage.removeItem(KEY);
  } catch {}
}

export function clearGroqKey() {
  setGroqKey("");
}

export function hasGroqKey(): boolean {
  return getGroqKey().length > 0;
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function groqChat(
  messages: Msg[],
  opts: { model?: string; json?: boolean; temperature?: number; signal?: AbortSignal } = {},
): Promise<string> {
  const key = getGroqKey();
  if (!key) throw new Error("no_groq_key");
  const body: any = {
    model: opts.model || DEFAULT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`groq_${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error("groq_empty");
  return reply as string;
}

export async function groqJson<T = any>(
  systemPrompt: string,
  userPrompt: string,
  timeoutMs = 12000,
): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const text = await groqChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { json: true, signal: ctrl.signal, temperature: 0.8 },
    );
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(t);
  }
}
