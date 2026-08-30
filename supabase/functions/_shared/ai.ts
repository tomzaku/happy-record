// Shared infrastructure for the AI-backed edge functions (`ai-checklist-template` today, any
// future `ai-*` function tomorrow): provider config + calls, auth, Pro gating, per-user rate
// limit, and input validation. Prompts and per-function logic live in each function's own
// index.ts. Ported from the sibling project's own `ai.ts` (voca) rather than re-derived — same
// shape, trimmed to what this app actually needs (no anonymous-reachable route, no chat history).

import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export type Provider = 'anthropic' | 'openai' | 'perplexity' | 'google';

export interface ChatMessage {
  role: string;
  content: string;
}

/** What each `ai-*` function's builder produces — everything `callProvider` needs. */
export interface BuiltRequest {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
}

// Allows the read verbs as well as POST: a browser preflights every call here (the Authorization
// header sees to that). Functions still reject the methods they don't route.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
};

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const PROVIDER = (Deno.env.get('AI_PROVIDER') ?? 'anthropic') as Provider;

const KEY_ENV: Record<Provider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  google: 'GOOGLE_API_KEY',
};

const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o',
  perplexity: 'sonar',
  google: 'gemini-2.5-flash',
};

// ─── Auth / clients ─────────────────────────────────────────────────

/** Verify the caller is a signed-in user (anonymous sessions count). Null if not. */
export async function requireUser(req: Request): Promise<{ supabase: SupabaseClient; user: User } | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user ? null : { supabase, user };
}

/**
 * Gate an action on an active Pro grant. Returns the Response to send back, or null when the
 * caller is Pro. The query is explicitly `.eq('user_id', userId)` — not relying on RLS to scope
 * it — so a returned row is proof this user has Pro regardless of which client (`supabase`) it's
 * called with. A NULL `expires_at` is a lifetime grant; otherwise Pro lasts until that moment —
 * see supabase/functions/_shared/proUsers.ts's `getProStatus`, which this mirrors but as a
 * ready-to-return 403 instead of a status object.
 */
export async function proGateError(supabase: SupabaseClient, userId: string): Promise<Response | null> {
  const { data: proRow, error } = await supabase
    .from('pro_users')
    .select('expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return jsonResponse(500, { error: 'Could not verify Pro status.' });
  if (!proRow) return jsonResponse(403, { error: 'This feature requires a Pro account.' });
  if (proRow.expires_at && new Date(proRow.expires_at as string) <= new Date()) {
    return jsonResponse(403, { error: 'Your Pro access has expired.' });
  }
  return null;
}

/** Per-user fixed-window rate limit. True if allowed (fails open on infra error). `userId` is
 * passed explicitly now (20260830020000_ai_rate_limit_explicit_user.sql) rather than the RPC
 * reading `auth.uid()` itself — that only resolved under the caller's own RLS-scoped connection,
 * which every `ai-*` function is moving off of (see `_shared/authorize.ts`); `supabase` here is
 * expected to be the service-role client now. */
export async function underRateLimit(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const limit = Number(Deno.env.get('AI_RATE_LIMIT')) || 20;
  const win = Number(Deno.env.get('AI_RATE_WINDOW_SECONDS')) || 60;
  const { data: allowed, error } = await supabase.rpc('check_ai_rate_limit', {
    p_limit: limit,
    p_window_seconds: win,
    p_user_id: userId,
  });
  return !(allowed === false && !error);
}

// ─── Provider call ──────────────────────────────────────────────────

/** Call the configured AI provider. Throws on missing key or provider error. */
export async function callProvider(system: string, messages: ChatMessage[], maxTokens: number): Promise<string> {
  const apiKey = Deno.env.get(KEY_ENV[PROVIDER]) ?? '';
  if (!apiKey) throw new Error(`Server is missing the ${PROVIDER} API key.`);
  const model = Deno.env.get('AI_MODEL') || DEFAULT_MODEL[PROVIDER];
  const max = Math.min(maxTokens, 4000);
  console.log(`[ai] provider=${PROVIDER} model=${model} maxTokens=${max}`);
  const text = PROVIDER === 'anthropic'
    ? await callAnthropic(apiKey, model, system, messages, max)
    : await callOpenAICompatible(PROVIDER, apiKey, model, system, messages, max);
  return PROVIDER === 'perplexity' ? text.replace(/\[\d+\]/g, '') : text;
}

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || `API error: ${res.status}`);
  }
  const data = await res.json();
  const text = (data.content as { type: string; text?: string }[] | undefined)
    ?.find((b) => b.type === 'text')?.text;
  return text || 'No response received.';
}

function endpointFor(provider: Provider): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'perplexity':
      return 'https://api.perplexity.ai/chat/completions';
    case 'google':
      return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function callOpenAICompatible(
  provider: Provider,
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const res = await fetch(endpointFor(provider), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...messages],
      // Gemini 2.5 models "think" by default and the thinking tokens count against
      // max_tokens — small budgets then truncate the actual output. Our prompts are
      // simple; disable thinking.
      ...(provider === 'google' ? { reasoning_effort: 'none' } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let msg = '';
    try {
      const err = JSON.parse(body);
      msg = err?.error?.message || err?.message || '';
    } catch { /* not JSON */ }
    throw new Error(`API error ${res.status} (model=${model})${msg ? `: ${msg}` : body ? `: ${body.slice(0, 300)}` : ''}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response received.';
}

// ─── Input validation ───────────────────────────────────────────────
// Thrown BadRequests become 400s. Caps keep any single request small.

export class BadRequest extends Error {}

export function reqStr(params: Record<string, unknown>, key: string, maxLen: number): string {
  const v = params[key];
  if (typeof v !== 'string') throw new BadRequest(`Missing or invalid "${key}".`);
  const trimmed = v.trim();
  if (!trimmed) throw new BadRequest(`"${key}" must not be empty.`);
  return trimmed.slice(0, maxLen);
}

/** Same as `reqStr`, but a missing/empty value is legitimate (returns `''`) rather than a 400 —
 * for a field that's genuinely optional, not just one the caller forgot to send. Not currently
 * used by any `ai-*` function (ai-note's own optional id/position params — see that function's
 * resolveContext — read `params` directly instead, since a missing one there means "no position,
 * skip context resolution," not "empty string is a valid value") — kept for whichever next one
 * needs a plain optional string. */
export function optStr(params: Record<string, unknown>, key: string, maxLen: number): string {
  const v = params[key];
  return typeof v === 'string' ? v.trim().slice(0, maxLen) : '';
}

/** Strip ```json fences the model sometimes wraps JSON in. */
export function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}
