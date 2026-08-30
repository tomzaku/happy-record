// The `challenge-comments` resource — the flat discussion thread on a
// challenge. See CLAUDE.md.
//
//   GET    /challenge-comments  ?challengeId=&limit=  → { comments }
//   POST   /challenge-comments  { comment }            → { comment }   participant/owner only, and only while comments_enabled
//   DELETE /challenge-comments  ?id=                   → { ok: true }  author-only, no moderation yet
//
// Deploy: `supabase functions deploy challenge-comments`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
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

async function list({ url, db }: Ctx) {
  const challengeId = url.searchParams.get('challengeId');
  if (!challengeId) throw new ApiError(400, 'Missing challengeId.');
  const limit = Math.min(Number(url.searchParams.get('limit')) || DEFAULT_LIMIT, MAX_LIMIT);

  const { data, error } = await db
    .from('challenge_comments')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('created_at')
    .limit(limit);
  if (error) throw new Error(error.message);
  return { comments: ((data ?? []) as Record<string, unknown>[]).map(toChallengeComment) };
}

async function post({ req, db, userId }: Ctx) {
  const entry = (await body(req)).comment;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing comment.');

  let row: ReturnType<typeof fromChallengeComment>;
  try {
    row = fromChallengeComment(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid comment.');
  }

  // RLS's own insert check only asserts authorship — comments_enabled and
  // membership are real preconditions, checked once here instead of as two
  // more correlated `exists` subqueries repeated on every insert.
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

  const { data, error } = await db
    .from('challenge_comments')
    .insert({ user_id: userId, ...row })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return { comment: toChallengeComment(data as Record<string, unknown>) };
}

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
    return json(200, await route({ url, req, db: auth.supabase, userId: auth.user.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[challenge-comments]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
