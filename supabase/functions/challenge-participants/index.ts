// The `challenge-participants` resource — who joined a challenge. See
// CLAUDE.md.
//
//   GET    /challenge-participants  ?challengeId=   → { participants }   RLS-scoped to your own challenges' rosters
//   POST   /challenge-participants  { participant }  → { participant }   join (upsert on challengeId+caller)
//   DELETE /challenge-participants  ?challengeId=    → { ok: true }      leave
//
// Deploy: `supabase functions deploy challenge-participants`

import { ApiError, corsHeaders, json } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { fromChallengeParticipant, toChallengeParticipant } from '../_shared/challengeParticipants.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const MAX_LIMIT = 500;

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

async function list({ url, db }: Ctx) {
  const challengeId = url.searchParams.get('challengeId');
  if (!challengeId) throw new ApiError(400, 'Missing challengeId.');

  const { data, error } = await db
    .from('challenge_participants')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('joined_at')
    .limit(MAX_LIMIT);
  if (error) throw new Error(error.message);
  return { participants: ((data ?? []) as Record<string, unknown>[]).map(toChallengeParticipant) };
}

async function join({ req, db, userId }: Ctx) {
  const entry = (await body(req)).participant;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing participant.');

  let row: ReturnType<typeof fromChallengeParticipant>;
  try {
    row = fromChallengeParticipant(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid participant.');
  }

  // Reachable at all only if the caller can already read this challenge
  // (owner or public template) — enforced by `challenges`' own select
  // policy, which this insert doesn't re-check; a challenge_id that isn't
  // visible just never resolves for the recipient's own reads afterward.
  const { data, error } = await db
    .from('challenge_participants')
    .upsert({ user_id: userId, ...row }, { onConflict: 'challenge_id,user_id' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return { participant: toChallengeParticipant(data as Record<string, unknown>) };
}

/** Idempotent — leaving a challenge you're not in is not an error. */
async function leave({ url, db, userId }: Ctx) {
  const challengeId = url.searchParams.get('challengeId');
  if (!challengeId) throw new ApiError(400, 'Missing challengeId.');
  const { error } = await db
    .from('challenge_participants')
    .delete()
    .eq('user_id', userId)
    .eq('challenge_id', challengeId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': list,
  'POST /': join,
  'DELETE /': leave,
};

function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('challenge-participants');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const route = ROUTES[`${req.method} ${subPath(url)}`];
  if (!route) return json(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return json(401, { error: 'Not signed in.' });

  try {
    return json(200, await route({ url, req, db: auth.supabase, userId: auth.user.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[challenge-participants]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
