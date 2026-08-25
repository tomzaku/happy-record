// The `challenges` resource — the record that turns a shared checklist
// template into something joinable. See CLAUDE.md.
//
//   GET  /challenges  ?checklistTemplateId=          → { challenge }        owner's or a public template's, null if none yet
//   GET  /challenges  ?id=&from=&to=                 → { challenge, participants, completions, ranking, targets }
//     the dashboard read — from/to default to the last 30 days (targets are
//     all-time, not scoped to this range — see getTargets). `completions`
//     is sparse (completed days only); the client fills the grid. `ranking`
//     is participants sorted by completions-in-range descending. `targets`
//     is one entry per field the owner set a goal for (`challenge.fieldTargets`),
//     each with every participant's real contributed total. Peers' data
//     comes back through the `checklists`/`submissions`/`fields`/
//     `checklist_records` peer-read RLS policies (see the migrations) — this
//     function's own `db` client is still the caller's RLS-scoped one,
//     nothing here is service-role.
//   POST /challenges  { challenge }                  → { challenge }        owner-only upsert (RLS), also enrolls the owner as a participant when shareRecords is on. `challenge.fieldTargets` is `{ [fieldId]: target }`, keyed by the owner's own field ids. `challenge.theme` is one of CHALLENGE_THEMES (_shared/challenges.ts), falls back to 'classic' if omitted/invalid.
//
// Deploy: `supabase functions deploy challenges`

import { ApiError, corsHeaders, json } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { fromChallenge, toChallenge } from '../_shared/challenges.ts';
import { toChallengeParticipant } from '../_shared/challengeParticipants.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const MAX_PARTICIPANTS = 500;
const MAX_ROWS = 5000;
const DEFAULT_RANGE_DAYS = 30;

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

async function getByTemplateId(db: SupabaseClient, templateId: string) {
  const { data, error } = await db
    .from('challenges')
    .select('*')
    .eq('checklist_template_id', templateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { challenge: data ? toChallenge(data as Record<string, unknown>) : null };
}

async function getDashboard({ url, db }: Ctx, id: string) {
  const { data: challengeRow, error: challengeError } = await db
    .from('challenges')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (challengeError) throw new Error(challengeError.message);
  if (!challengeRow) return { challenge: null, participants: [], completions: [], ranking: [], targets: [] };
  const challenge = toChallenge(challengeRow as Record<string, unknown>);

  const { data: participantRows, error: participantError } = await db
    .from('challenge_participants')
    .select('*')
    .eq('challenge_id', id)
    .order('joined_at')
    .limit(MAX_PARTICIPANTS);
  if (participantError) throw new Error(participantError.message);
  const participants = ((participantRows ?? []) as Record<string, unknown>[]).map(toChallengeParticipant);
  if (!participants.length) return { challenge, participants: [], completions: [], ranking: [], targets: [] };

  const now = new Date();
  const to = url.searchParams.get('to') || now.toISOString();
  const from =
    url.searchParams.get('from') ||
    new Date(now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const userIds = [...new Set(participants.map(p => p.userId))];

  // Every participant records against the challenge's own template id
  // directly (joining never forks — see useJoinChallenge.tsx), so this is
  // just `[challenge.checklistTemplateId]` in practice. Still widened to
  // every `checklist_template_id` on the roster, not hardcoded to the one
  // value, so a participant who joined back when this *did* fork (a
  // pre-existing `challenge_participants` row pointing at their own old
  // fork) still shows up correctly instead of silently dropping out.
  const templateIds = [
    ...new Set([challenge.checklistTemplateId, ...participants.map(p => p.checklistTemplateId)]),
  ];

  const [{ data: checklistRows, error: checklistError }, { data: submissionRows, error: submissionError }] =
    await Promise.all([
      db
        .from('checklists')
        .select('id, user_id, started_at, completed_at')
        .in('checklist_template_id', templateIds)
        .in('user_id', userIds)
        .gte('started_at', from)
        .lte('started_at', to)
        .limit(MAX_ROWS),
      db
        .from('submissions')
        .select('user_id, checklist_id, created_at')
        .in('checklist_template_id', templateIds)
        .in('user_id', userIds)
        .gte('created_at', from)
        .lte('created_at', to)
        .limit(MAX_ROWS),
    ]);
  if (checklistError) throw new Error(checklistError.message);
  if (submissionError) throw new Error(submissionError.message);

  // A day counts as completed if its checklist was checked off directly
  // (completed_at) or had at least one submission — covers both the plain
  // check/uncheck templates and the ones with real fields. Submissions are
  // dated by their checklist's own started_at (the day it actually
  // represents), not the submission's own created_at, which can roll into
  // the next calendar day for a late-night submit.
  const checklistById = new Map<string, { userId: string; date: string }>();
  for (const row of (checklistRows ?? []) as Record<string, unknown>[]) {
    checklistById.set(row.id as string, {
      userId: row.user_id as string,
      date: (row.started_at as string).slice(0, 10),
    });
  }

  const seen = new Set<string>();
  const completions: { userId: string; date: string }[] = [];
  const addCompletion = (userId: string, date: string) => {
    const key = `${userId}:${date}`;
    if (seen.has(key)) return;
    seen.add(key);
    completions.push({ userId, date });
  };

  for (const row of (checklistRows ?? []) as Record<string, unknown>[]) {
    if (row.completed_at) addCompletion(row.user_id as string, (row.started_at as string).slice(0, 10));
  }
  for (const s of (submissionRows ?? []) as Record<string, unknown>[]) {
    const checklist = checklistById.get(s.checklist_id as string);
    const date = checklist ? checklist.date : (s.created_at as string).slice(0, 10);
    addCompletion(s.user_id as string, date);
  }

  // Every participant appears even at 0, so a newcomer shows up on the
  // board rather than looking like the query silently skipped them.
  const countByUser = new Map<string, number>(participants.map(p => [p.userId, 0]));
  for (const c of completions) countByUser.set(c.userId, (countByUser.get(c.userId) ?? 0) + 1);
  const ranking = [...countByUser.entries()]
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count);

  const targets = await getTargets(db, challenge, participants, userIds);

  return { challenge, participants, completions, ranking, targets };
}

type Target = {
  fieldId: string;
  title: string;
  unit: string;
  target: number;
  contributions: { userId: string; total: number }[];
};

/**
 * A shared goal per metric field, with a per-person breakdown — all-time,
 * not scoped to the dashboard's date range (a collective goal accumulates
 * over the challenge's whole life, not just the visible window). Only
 * fields with a target ever get their real values read here, via the
 * peer-read policies the 20260825000000_challenge_targets.sql migration
 * added — an untargeted field (a personal note, a metric with no goal set)
 * is never touched.
 *
 * Joining a challenge no longer forks the template or its fields (see
 * useJoinChallenge.tsx) — every participant, owner included, records
 * against the exact same field id a target is keyed by, so attribution is
 * just "whoever's `user_id` is actually on the row." The one wrinkle:
 * `resolveFieldId` still resolves a *pre-existing* fork's id back to the
 * target it counts toward, so a participant who joined before that change
 * shipped doesn't lose their already-recorded contributions — nothing new
 * ever creates a fork to resolve here.
 */
async function getTargets(
  db: SupabaseClient,
  challenge: ReturnType<typeof toChallenge>,
  participants: ReturnType<typeof toChallengeParticipant>[],
  userIds: string[],
): Promise<Target[]> {
  const targetFieldIds = Object.keys(challenge.fieldTargets);
  if (!targetFieldIds.length) return [];

  const [{ data: fieldRows, error: fieldError }, { data: forkedFieldRows, error: forkedError }] = await Promise.all([
    db.from('fields').select('id, title, unit').in('id', targetFieldIds),
    db
      .from('fields')
      .select('id, copied_from_id')
      .in('user_id', userIds)
      .in('copied_from_id', targetFieldIds),
  ]);
  if (fieldError) throw new Error(fieldError.message);
  if (forkedError) throw new Error(forkedError.message);

  const fieldMeta = new Map<string, { title: string; unit: string }>();
  for (const row of (fieldRows ?? []) as Record<string, unknown>[]) {
    fieldMeta.set(row.id as string, { title: row.title as string, unit: (row.unit as string) ?? '' });
  }
  // A legacy fork's id -> the target id it counts toward.
  const resolveFieldId = new Map<string, string>();
  for (const row of (forkedFieldRows ?? []) as Record<string, unknown>[]) {
    resolveFieldId.set(row.id as string, row.copied_from_id as string);
  }

  const resolvedFieldIds = [...new Set([...targetFieldIds, ...resolveFieldId.keys()])];
  const { data: recordRows, error: recordError } = await db
    .from('checklist_records')
    .select('field_id, user_id, value_number')
    .in('field_id', resolvedFieldIds)
    .in('user_id', userIds)
    .limit(MAX_ROWS);
  if (recordError) throw new Error(recordError.message);

  const totals = new Map<string, number>(); // `${targetFieldId}:${userId}` -> sum
  for (const row of (recordRows ?? []) as Record<string, unknown>[]) {
    if (typeof row.value_number !== 'number') continue;
    const targetFieldId = resolveFieldId.get(row.field_id as string) ?? (row.field_id as string);
    const key = `${targetFieldId}:${row.user_id}`;
    totals.set(key, (totals.get(key) ?? 0) + row.value_number);
  }

  return targetFieldIds.map(fieldId => ({
    fieldId,
    title: fieldMeta.get(fieldId)?.title ?? '',
    unit: fieldMeta.get(fieldId)?.unit ?? '',
    target: challenge.fieldTargets[fieldId],
    contributions: participants
      .map(p => ({ userId: p.userId, total: totals.get(`${fieldId}:${p.userId}`) ?? 0 }))
      .sort((a, b) => b.total - a.total),
  }));
}

async function list(ctx: Ctx) {
  const { url, db } = ctx;
  const id = url.searchParams.get('id');
  if (id) return getDashboard(ctx, id);

  const templateId = url.searchParams.get('checklistTemplateId');
  if (!templateId) throw new ApiError(400, 'Missing checklistTemplateId or id.');
  return getByTemplateId(db, templateId);
}

async function save({ req, db, userId }: Ctx) {
  const entry = (await body(req)).challenge;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing challenge.');

  let row: ReturnType<typeof fromChallenge>;
  try {
    row = fromChallenge(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid challenge.');
  }

  // Owner-only by RLS (`with check (owner_id = auth.uid())`); unique on
  // checklist_template_id so re-sharing the same template reuses this row.
  const { data, error } = await db
    .from('challenges')
    .upsert({ owner_id: userId, ...row }, { onConflict: 'checklist_template_id' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  const challenge = toChallenge(data as Record<string, unknown>);

  // The sharer shows up on their own dashboard once records-sharing is on —
  // their own template *is* the challenge's canonical checklist_template_id
  // (the owner never forks their own template the way a joiner does — see
  // useJoinChallenge.tsx — so their participant row just points at it directly).
  if (challenge.shareRecords) {
    const { error: participantError } = await db.from('challenge_participants').upsert(
      {
        id: `${challenge.id}:${userId}`,
        challenge_id: challenge.id,
        user_id: userId,
        checklist_template_id: challenge.checklistTemplateId,
      },
      { onConflict: 'challenge_id,user_id', ignoreDuplicates: true },
    );
    if (participantError) throw new Error(participantError.message);
  }

  return { challenge };
}

const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': list,
  'POST /': save,
};

function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('challenges');
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
    console.error('[challenges]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
