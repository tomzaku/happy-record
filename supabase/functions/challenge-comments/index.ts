// The `challenge-comments` resource — the flat discussion thread on a
// challenge. See CLAUDE.md.
//
//   GET    /challenge-comments  ?challengeId=&limit=  → { comments }   only if the caller is a
//     participant of this challenge or its owner — see checkCanReadComments below, the app-layer
//     equivalent of what used to be "Participants and the owner can read a challenge's comments"
//     (20260824000000_challenges.sql)
//   POST   /challenge-comments  { comment }            → { comment }   participant/owner only,
//     and only while comments_enabled — see checkCanPostComment
//   DELETE /challenge-comments  ?id=                   → { ok: true }  author-only (already
//     self-scoped by the `.eq('user_id', userId)` below), no moderation yet
//
// Moved off RLS onto the app-layer `compose(checkPermission, core)` pattern — see
// `shared/authorize.ts` and `notes/index.ts` for the full rationale.
//
// Deploy: `supabase functions deploy challenge-comments`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin, compose, ForbiddenError } from '../../shared/authorize.ts';
import { fromChallengeComment, toChallengeComment } from '../../shared/challengeComments.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

/** Same "participant or owner" rule as challenge-participants' own checkCanReadRoster — see that
 * function's comment for why the old RLS policy's two clauses collapse into one query here. */
async function checkCanReadComments({ db, userId, url }: Ctx): Promise<string> {
  const challengeId = url.searchParams.get('challengeId');
  if (!challengeId) throw new ApiError(400, 'Missing challengeId.');

  const [{ data: participant, error: participantError }, { data: ownedChallenge, error: ownedError }] = await Promise.all([
    db.from('challenge_participants').select('id').eq('challenge_id', challengeId).eq('user_id', userId).maybeSingle(),
    db.from('challenges').select('id').eq('id', challengeId).eq('owner_id', userId).maybeSingle(),
  ]);
  if (participantError) throw new Error(participantError.message);
  if (ownedError) throw new Error(ownedError.message);
  if (!participant && !ownedChallenge) throw new ForbiddenError();
  return challengeId;
}

const list = compose(checkCanReadComments, async ({ db, url }: Ctx, challengeId: string) => {
  const limit = Math.min(Number(url.searchParams.get('limit')) || DEFAULT_LIMIT, MAX_LIMIT);
  const { data, error } = await db
    .from('challenge_comments')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('created_at')
    .limit(limit);
  if (error) throw new Error(error.message);
  return { comments: ((data ?? []) as Record<string, unknown>[]).map(toChallengeComment) };
});

type PostAuthorization = { row: ReturnType<typeof fromChallengeComment> };

/** comments_enabled and membership are the real preconditions — this used to be "RLS's own
 * insert check only asserts authorship, these two are checked once here instead of as two more
 * correlated `exists` subqueries repeated on every insert"; same shape now, just the only check
 * left, since there's no RLS insert policy backing this up anymore either. */
async function checkCanPostComment({ req, db, userId }: Ctx): Promise<PostAuthorization> {
  const entry = (await body(req)).comment;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing comment.');

  let row: ReturnType<typeof fromChallengeComment>;
  try {
    row = fromChallengeComment(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid comment.');
  }

  const { data: challenge, error: challengeError } = await db
    .from('challenges')
    .select('id, owner_id, comments_enabled')
    .eq('id', row.challenge_id)
    .maybeSingle();
  if (challengeError) throw new Error(challengeError.message);
  if (!challenge) throw new ApiError(400, 'Unknown challenge.');
  if (!challenge.comments_enabled) throw new ApiError(400, 'Comments are off for this challenge.');

  if (challenge.owner_id !== userId) {
    const { data: participant, error: participantError } = await db
      .from('challenge_participants')
      .select('id')
      .eq('challenge_id', row.challenge_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (participantError) throw new Error(participantError.message);
    if (!participant) throw new ApiError(400, 'Join this challenge before commenting.');
  }

  return { row };
}

const post = compose(checkCanPostComment, async ({ db, userId }: Ctx, { row }: PostAuthorization) => {
  const { data, error } = await db
    .from('challenge_comments')
    .insert({ user_id: userId, ...row })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return { comment: toChallengeComment(data as Record<string, unknown>) };
});

async function remove({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (!id) throw new ApiError(400, 'Missing id.');
  const { error } = await db.from('challenge_comments').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': list,
  'POST /': post,
  'DELETE /': remove,
};

function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('challenge-comments');
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
    console.error('[challenge-comments]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
