// Built-in Groq access for chat, workout, and diet generation. The key is
// embedded in the client bundle — every visitor shares the same quota, so we
// enforce a per-browser daily request cap to keep it from being burned.

const BUILTIN_KEY = "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";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

// Daily usage cap (per browser). Resets each calendar day in local time.
const DAILY_LIMIT = 25;
const USAGE_KEY = "arc_groq_usage";

type Usage = { day: string; count: number };

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function readUsage(): Usage {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { day: today(), count: 0 };
    const parsed = JSON.parse(raw) as Usage;
    if (parsed.day !== today()) return { day: today(), count: 0 };
    return parsed;
  } catch {
    return { day: today(), count: 0 };
  }
}

function bumpUsage() {
  const u = readUsage();
  u.count += 1;
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(u)); } catch { return; }
}

export function remainingGroqRequests(): number {
  return Math.max(0, DAILY_LIMIT - readUsage().count);
}

export function hasGroqKey(): boolean {
  return remainingGroqRequests() > 0;
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function groqChat(
  messages: Msg[],
  opts: { model?: string; json?: boolean; temperature?: number; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<string> {
  if (remainingGroqRequests() <= 0) throw new Error("groq_daily_limit");

  const body: Record<string, unknown> = {
    model: opts.model || DEFAULT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const ctrl = opts.signal ? null : new AbortController();
  const timeout = ctrl ? window.setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 8000) : undefined;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BUILTIN_KEY}`,
      },
      body: JSON.stringify(body),
      signal: opts.signal ?? ctrl?.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`groq_${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) throw new Error("groq_empty");
    bumpUsage();
    return reply as string;
  } finally {
    if (timeout !== undefined) window.clearTimeout(timeout);
  }
}

export async function groqJson<T = unknown>(
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
      { json: true, signal: ctrl.signal, temperature: 0.8, timeoutMs },
    );
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(t);
  }
}

// Legacy no-op exports kept so older imports keep compiling.
export function getGroqKey(): string { return BUILTIN_KEY; }
export function setGroqKey(_: string) {}
export function clearGroqKey() {}
