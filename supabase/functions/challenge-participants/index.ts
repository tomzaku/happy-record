// The `challenge-participants` resource — who joined a challenge. See
// CLAUDE.md.
//
//   GET    /challenge-participants  ?challengeId=   → { participants }   only if the caller is
//     themselves a participant of this challenge or its owner — see checkCanReadRoster below,
//     the app-layer equivalent of what used to be "Participants can see their challenge's
//     roster" (20260824000000_challenges.sql, including its own is_challenge_participant()
//     helper — that existed only to dodge a self-referencing-RLS-policy recursion error, a
//     purely Postgres-shaped problem this resource no longer has now that the check runs here)
//   POST   /challenge-participants  { participant }  → { participant }   join (upsert on
//     challengeId+caller) — inherently self-scoped, `user_id` is always the caller's own
//     regardless of what's in the body, so there's nothing to compose a `checkPermission` around
//   DELETE /challenge-participants  ?challengeId=    → { ok: true }      leave — same, always
//     the caller's own row
//
// Moved off RLS onto the app-layer `compose(checkPermission, core)` pattern — see
// `shared/authorize.ts` and `notes/index.ts` for the full rationale.
//
// Deploy: `supabase functions deploy challenge-participants`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin, compose, ForbiddenError } from '../../shared/authorize.ts';
import { fromChallengeParticipant, toChallengeParticipant } from '../../shared/challengeParticipants.ts';
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

/** The old RLS policy's "self OR fellow participant" pair collapse into one check here — both
 * meant "is there already a challenge_participants row for (this challenge, this caller)," the
 * fellow-participant half just phrased as its own security-definer function purely to dodge
 * Postgres's self-referencing-RLS-policy recursion error, which doesn't apply to a plain query
 * run from here. */
async function checkCanReadRoster({ db, userId, url }: Ctx): Promise<string> {
  const challengeId = url.searchParams.get('challengeId');
  if (!challengeId) throw new ApiError(400, 'Missing challengeId.');

  const [{ data: selfRow, error: selfError }, { data: ownedChallenge, error: ownedError }] = await Promise.all([
    db.from('challenge_participants').select('id').eq('challenge_id', challengeId).eq('user_id', userId).maybeSingle(),
    db.from('challenges').select('id').eq('id', challengeId).eq('owner_id', userId).maybeSingle(),
  ]);
  if (selfError) throw new Error(selfError.message);
  if (ownedError) throw new Error(ownedError.message);
  if (!selfRow && !ownedChallenge) throw new ForbiddenError();
  return challengeId;
}

const list = compose(checkCanReadRoster, async ({ db }: Ctx, challengeId: string) => {
  const { data, error } = await db
    .from('challenge_participants')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('joined_at')
    .limit(MAX_LIMIT);
  if (error) throw new Error(error.message);
  return { participants: ((data ?? []) as Record<string, unknown>[]).map(toChallengeParticipant) };
});

async function join({ req, db, userId }: Ctx) {
  const entry = (await body(req)).participant;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing participant.');

  let row: ReturnType<typeof fromChallengeParticipant>;
  try {
    row = fromChallengeParticipant(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid participant.');
  }

  // No `checkPermission` here on purpose, same as before this moved off RLS: `user_id` is always
  // the caller's own (set below, ignoring anything the body sent), so joining a `challengeId`
  // this caller can't otherwise read isn't a privilege escalation — it just never resolves again
  // on any of their own later reads (`challenges`'s own visibility rule, `checklist-templates`'s).
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
    return json(200, await route({ url, req, db: admin(), userId: auth.user.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[challenge-participants]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
