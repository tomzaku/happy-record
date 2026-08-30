// The `challenges` resource — the record that turns a shared checklist
// template into something joinable. See CLAUDE.md.
//
//   GET  /challenges                                  → { challenges }      every challenge the
//     caller owns or has joined — the light listing behind challenge-list-page-ui's "My
//     Challenges" page, not the per-challenge dashboard. One row per challenge: id,
//     checklistTemplateId, the template's own title/avatar (joined in, not embedded in
//     `challenges` itself), isOwner, shareRecords/commentsEnabled (shareRecords is always true
//     now — every challenge shares everyone's check-ins, see save() — kept on the wire rather
//     than dropped so an older client reading it doesn't need a shape change), participantCount,
//     joinedAt (absent only for a legacy owner row saved before every owner was auto-enrolled —
//     see save()'s own comment), and this caller's own myCheckins/myStreak over the last DEFAULT_RANGE_DAYS days
//     — "how much effort you've put in," the actual point of the page, computed cheaply here
//     (one pair of queries scoped to the caller alone, across every listed challenge's template
//     at once) rather than one full per-challenge dashboard fetch per row. No *other*
//     participant's numbers here, and no rank — the full peer breakdown is still the
//     per-challenge dashboard (getChallengeDashboard), which this listing links out to.
//   GET  /challenges  ?checklistTemplateId=          → { challenge }        owner's or a public template's, null if none yet.
//     `challenge.ownerDisplayName`/`ownerAvatarUrl` ride along when the owner
//     has them saved (see 20260828010000_challenge_owner_name_public.sql) —
//     the shared page's greeting uses them in place of a generic fallback.
//   GET  /challenges  ?id=&from=&to=                 → { challenge, participants, completions, ranking, targets }
//     the dashboard read — from/to default to the last 30 days (targets are
//     all-time, not scoped to this range — see getTargets). `completions`
//     is sparse (completed days only); the client fills the grid. `ranking`
//     is participants sorted by completions-in-range descending. `targets`
//     is one entry per field the owner set a goal for (`challenge.fieldTargets`),
//     each with every participant's real contributed total. Two visibility tiers, replicated
//     from what used to be two separate RLS checks (see checkCanReadDashboard below): the
//     challenge row itself needs owner-or-public-template, but the roster/completions/targets
//     need actual participation — a public template nobody's joined yet returns the challenge
//     metadata with an empty roster, not the full dashboard.
//   POST /challenges  { challenge }                  → { challenge }        owner-only upsert,
//     always enrolls the owner as a participant too — `challenge.ownerDisplayName`/
//     `ownerAvatarUrl`, if given, become that participant row's name/photo (neither is a
//     `challenges` column; omit either on a re-save that isn't touching it and the stored one is
//     left alone). `challenge.fieldTargets` is `{ [fieldId]: target }`, keyed by the owner's own
//     field ids. `challenge.theme` is one of CHALLENGE_THEMES (shared/challenges.ts), falls back
//     to 'classic' if omitted/invalid. `challenge.backgroundImageUrl` is a plain http(s) URL (an
//     already-hosted photo, not an upload) shown behind the shared page instead of/over the
//     theme's own background; anything that isn't a plausible http(s) URL clears it to null
//     rather than failing the save.
//
// Moved off RLS onto the app-layer `compose(checkPermission, core)` pattern — see
// `shared/authorize.ts` and `notes/index.ts` for the full rationale. This was the resource with
// the most RLS surface to replicate: two visibility tiers on the dashboard read (see
// checkCanReadDashboard), a `share_records` peer-data gate that used to live in four different
// table policies (checklists/submissions/fields/checklist_records — see getDashboard/getTargets),
// and a write-side check (checkCanWriteChallenge) that didn't exist as its own function before —
// RLS's `using` clause on the "manage own challenges" policy silently blocked an upsert from
// overwriting a challenge it didn't already own; that has to be a real check now that admin()
// bypasses RLS entirely.
//
// Deploy: `supabase functions deploy challenges`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin, compose, ForbiddenError } from '../../shared/authorize.ts';
import { fromChallenge, toChallenge } from '../../shared/challenges.ts';
import { toChallengeParticipant } from '../../shared/challengeParticipants.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const MAX_PARTICIPANTS = 500;
const MAX_ROWS = 5000;
const DEFAULT_RANGE_DAYS = 30;
const MAX_MY_CHALLENGES = 200;

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

/** Consecutive days ending at `datesDesc[0]` — most-recent-first, no gaps. Same convention as
 * packages/global's challengeRanking.ts (not imported directly — edge functions only pull from
 * `shared/`, and this is small enough that duplicating it here beats reaching across packages). */
const runLength = (datesDesc: string[]) => {
  let streak = 0;
  let cursor: string | null = null;
  for (const date of datesDesc) {
    if (cursor !== null && daysBetween(date, cursor) !== 1) break;
    streak += 1;
    cursor = date;
  }
  return streak;
};

/**
 * This caller's own check-in count and current streak, per challenge, over the last
 * DEFAULT_RANGE_DAYS days — the numbers listMine actually exists to show. Templates rather than
 * challenge ids drive the query (a checklist/submission only ever carries `checklist_template_id`),
 * then mapped back to whichever challenge(s) share that template — in practice always exactly one,
 * since `challenges.checklist_template_id` is unique, but this stays a map-of-arrays rather than
 * assuming that so a future many-challenges-per-template case wouldn't silently drop one.
 *
 * Always the caller's own rows (`.eq('user_id', userId)` on both queries) — no visibility
 * decision to make here regardless of which client runs it.
 */
async function myContributionByChallenge(
  db: SupabaseClient,
  userId: string,
  challengesByTemplateId: Map<string, string[]>,
): Promise<Map<string, { checkins: number; streak: number }>> {
  const templateIds = [...challengesByTemplateId.keys()];
  const result = new Map<string, { checkins: number; streak: number }>();
  if (!templateIds.length) return result;

  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: checklistRows, error: checklistError }, { data: submissionRows, error: submissionError }] =
    await Promise.all([
      db
        .from('checklists')
        .select('id, checklist_template_id, started_at, completed_at')
        .eq('user_id', userId)
        .in('checklist_template_id', templateIds)
        .gte('started_at', from)
        .lte('started_at', to)
        .limit(MAX_ROWS),
      db
        .from('submissions')
        .select('checklist_id, checklist_template_id, created_at')
        .eq('user_id', userId)
        .in('checklist_template_id', templateIds)
        .gte('created_at', from)
        .lte('created_at', to)
        .limit(MAX_ROWS),
    ]);
  if (checklistError) throw new Error(checklistError.message);
  if (submissionError) throw new Error(submissionError.message);

  // Submissions are dated by their checklist's own started_at (the day it actually represents),
  // not the submission's own created_at — same reasoning as getDashboard's own addCompletion.
  const checklistDateById = new Map<string, string>();
  const templateIdByChecklistId = new Map<string, string>();
  for (const row of (checklistRows ?? []) as Record<string, unknown>[]) {
    checklistDateById.set(row.id as string, (row.started_at as string).slice(0, 10));
    templateIdByChecklistId.set(row.id as string, row.checklist_template_id as string);
  }

  const datesByTemplateId = new Map<string, Set<string>>();
  const addDate = (templateId: string, date: string) => {
    if (!datesByTemplateId.has(templateId)) datesByTemplateId.set(templateId, new Set());
    datesByTemplateId.get(templateId)!.add(date);
  };
  for (const row of (checklistRows ?? []) as Record<string, unknown>[]) {
    if (row.completed_at) addDate(row.checklist_template_id as string, (row.started_at as string).slice(0, 10));
  }
  for (const row of (submissionRows ?? []) as Record<string, unknown>[]) {
    const checklistId = row.checklist_id as string;
    const templateId = templateIdByChecklistId.get(checklistId) ?? (row.checklist_template_id as string);
    const date = checklistDateById.get(checklistId) ?? (row.created_at as string).slice(0, 10);
    addDate(templateId, date);
  }

  const today = now.toISOString().slice(0, 10);
  for (const [templateId, dates] of datesByTemplateId) {
    const desc = [...dates].sort().reverse();
    const streak = daysBetween(desc[0], today) <= 1 ? runLength(desc) : 0;
    for (const challengeId of challengesByTemplateId.get(templateId) ?? []) {
      result.set(challengeId, { checkins: dates.size, streak });
    }
  }
  return result;
}

/**
 * Every challenge the caller owns or has joined, each with the caller's own effort on it — see
 * the module doc comment. Two separate queries for the challenge rows themselves rather than one
 * join because "owns" and "has joined" are genuinely different relationships (owner_id on
 * `challenges` vs. a row in `challenge_participants`) — every owner is auto-enrolled as a
 * participant on save() now, but a legacy challenge saved before that was unconditional can
 * still have an owner with no participant row, so relying on `challenge_participants` alone
 * would miss it.
 */
async function listMine(db: SupabaseClient, userId: string) {
  const [{ data: ownedRows, error: ownedError }, { data: participantRows, error: participantError }] =
    await Promise.all([
      db.from('challenges').select('*').eq('owner_id', userId).limit(MAX_MY_CHALLENGES),
      db
        .from('challenge_participants')
        .select('challenge_id, joined_at')
        .eq('user_id', userId)
        .limit(MAX_MY_CHALLENGES),
    ]);
  if (ownedError) throw new Error(ownedError.message);
  if (participantError) throw new Error(participantError.message);

  const joinedAtByChallengeId = new Map<string, string>(
    ((participantRows ?? []) as Record<string, unknown>[]).map(r => [r.challenge_id as string, r.joined_at as string]),
  );
  const ownedRowsArr = (ownedRows ?? []) as Record<string, unknown>[];
  const ownedIds = new Set(ownedRowsArr.map(r => r.id as string));
  // Only fetch challenges seen in `challenge_participants` but not already covered by the owned
  // query above — an owner (always auto-enrolled now) would otherwise show up twice.
  const joinedOnlyIds = [...joinedAtByChallengeId.keys()].filter(id => !ownedIds.has(id));

  const { data: joinedRowsRaw, error: joinedError } = joinedOnlyIds.length
    ? await db.from('challenges').select('*').in('id', joinedOnlyIds).limit(MAX_MY_CHALLENGES)
    : { data: [] as Record<string, unknown>[], error: null };
  if (joinedError) throw new Error(joinedError.message);

  // Explicit now, replacing what used to be RLS's own "challenges are readable when their
  // template is" filter on this query: a joined challenge whose template got unshared since this
  // caller joined it must stop appearing here, the same graceful degrade RLS gave for free
  // before — a joined-only id is never the caller's own template, so "owner" never applies here.
  const joinedRowsAll = (joinedRowsRaw ?? []) as Record<string, unknown>[];
  const joinedTemplateIds = [...new Set(joinedRowsAll.map(r => r.checklist_template_id as string))];
  const { data: joinedTemplates, error: joinedTemplatesError } = joinedTemplateIds.length
    ? await db.from('checklist_templates').select('id, visibility').in('id', joinedTemplateIds)
    : { data: [] as Record<string, unknown>[], error: null };
  if (joinedTemplatesError) throw new Error(joinedTemplatesError.message);
  const publicTemplateIds = new Set(
    ((joinedTemplates ?? []) as Record<string, unknown>[]).filter(t => t.visibility === 'public').map(t => t.id as string),
  );
  const joinedRows = joinedRowsAll.filter(r => publicTemplateIds.has(r.checklist_template_id as string));

  const allRows = [...ownedRowsArr, ...joinedRows];
  if (!allRows.length) return { challenges: [] };

  const templateIds = [...new Set(allRows.map(r => r.checklist_template_id as string))];
  const [{ data: templateRows, error: templateError }, { data: rosterRows, error: rosterError }] = await Promise.all([
    // Safe with no further check: every id in `templateIds` is either the caller's own or was
    // just confirmed public above.
    db.from('checklist_templates').select('id, title, avatar').in('id', templateIds),
    // Every participant row across every one of these challenges, just to count them — every id
    // in `allRows` is a challenge the caller legitimately owns or has joined (participant-count
    // visibility was never gated tighter than that anyway — see checkCanReadDashboard's own
    // comment on roster vs. peer-data visibility), so this needs no further check either.
    db
      .from('challenge_participants')
      .select('challenge_id')
      .in('challenge_id', allRows.map(r => r.id as string))
      .limit(MAX_ROWS),
  ]);
  if (templateError) throw new Error(templateError.message);
  if (rosterError) throw new Error(rosterError.message);

  const templateById = new Map(((templateRows ?? []) as Record<string, unknown>[]).map(r => [r.id as string, r]));
  const participantCountByChallenge = new Map<string, number>();
  for (const row of (rosterRows ?? []) as Record<string, unknown>[]) {
    const cid = row.challenge_id as string;
    participantCountByChallenge.set(cid, (participantCountByChallenge.get(cid) ?? 0) + 1);
  }

  const challengeIdsByTemplateId = new Map<string, string[]>();
  for (const row of allRows) {
    const templateId = row.checklist_template_id as string;
    const id = row.id as string;
    if (!challengeIdsByTemplateId.has(templateId)) challengeIdsByTemplateId.set(templateId, []);
    challengeIdsByTemplateId.get(templateId)!.push(id);
  }
  const myContribution = await myContributionByChallenge(db, userId, challengeIdsByTemplateId);

  const challenges = allRows.map(row => {
    const challenge = toChallenge(row);
    const template = templateById.get(challenge.checklistTemplateId) as Record<string, unknown> | undefined;
    const contribution = myContribution.get(challenge.id);
    return {
      id: challenge.id,
      checklistTemplateId: challenge.checklistTemplateId,
      title: (template?.title as string) ?? '',
      avatar: (template?.avatar as Record<string, unknown>) ?? {},
      isOwner: challenge.ownerId === userId,
      shareRecords: challenge.shareRecords,
      commentsEnabled: challenge.commentsEnabled,
      participantCount: participantCountByChallenge.get(challenge.id) ?? 0,
      // Over the last DEFAULT_RANGE_DAYS days — 0/0 rather than absent for a challenge this
      // caller genuinely hasn't touched yet, so the client never has to distinguish "no effort"
      // from "still loading."
      myCheckins: contribution?.checkins ?? 0,
      myStreak: contribution?.streak ?? 0,
      createdAt: challenge.createdAt,
      ...(joinedAtByChallengeId.has(challenge.id) ? { joinedAt: joinedAtByChallengeId.get(challenge.id) } : {}),
    };
  });

  // Most recently created/shared first — a fresh challenge should surface at the top rather than
  // wherever the two queries' own row order happened to put it.
  challenges.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { challenges };
}

/** For `GET ?checklistTemplateId=` — the challenge is visible to its owner unconditionally, or to
 * anyone at all once the template is public (same rule `checklist-templates`' own `?id=` branch
 * uses) — `null` for neither, not a thrown error, matching this route's established "no challenge
 * yet" contract. */
async function getByTemplateId({ db, userId }: Ctx, templateId: string) {
  const { data, error } = await db
    .from('challenges')
    .select('*')
    .eq('checklist_template_id', templateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { challenge: null };
  const row = data as Record<string, unknown>;
  const isOwner = row.owner_id === userId;

  if (!isOwner) {
    const { data: template, error: templateError } = await db
      .from('checklist_templates')
      .select('visibility')
      .eq('id', templateId)
      .maybeSingle();
    if (templateError) throw new Error(templateError.message);
    if (template?.visibility !== 'public') return { challenge: null };
  }

  const challenge = toChallenge(row);

  // The shared page's own greeting ("X just challenged you!") wants the real creator's
  // name/photo instead of a generic fallback — the owner's own `challenge_participants` row,
  // straight off their Google identity (see CardShare and useSession.ts's
  // `displayName`/`avatarUrl`). Always safe to read here: either the caller *is* the owner (their
  // own row), or we've just confirmed the template is public — exactly the two conditions the old
  // "Anyone can read the owner's name on a publicly shared challenge" RLS policy checked for,
  // combined with the base "read your own row" grant every participant already had.
  const { data: ownerRow } = await db
    .from('challenge_participants')
    .select('display_name, avatar_url')
    .eq('challenge_id', challenge.id)
    .eq('user_id', challenge.ownerId)
    .maybeSingle();
  const ownerDisplayName = (ownerRow?.display_name as string | undefined)?.trim();
  const ownerAvatarUrl = (ownerRow?.avatar_url as string | undefined) || undefined;

  return {
    challenge: {
      ...challenge,
      ...(ownerDisplayName ? { ownerDisplayName } : {}),
      ...(ownerAvatarUrl ? { ownerAvatarUrl } : {}),
    },
  };
}

type DashboardAuthorization = { challengeRow: Record<string, unknown> | null; canSeeRoster: boolean };

/**
 * For `GET ?id=` — two visibility tiers, replicated from what used to be two separate RLS checks
 * on two different tables:
 *
 *  1. The `challenges` row itself: owner, or a `visibility: 'public'` template (same rule
 *     `getByTemplateId` above uses) — this used to be `challenges`' own select policy. `null`
 *     challengeRow means "no such id, or not visible at all," same "empty, never an error"
 *     contract every other by-id lookup in this app uses.
 *  2. The roster (and everything downstream of it — completions, ranking, targets): owner, or an
 *     *actual participant* — strictly narrower than "the template happens to be public." This
 *     used to be "Participants can see their challenge's roster." A visitor who can see a public
 *     template's challenge metadata but hasn't joined yet gets the challenge back with an empty
 *     roster, not a 403 — same as when RLS silently returned zero roster rows before.
 */
async function checkCanReadDashboard({ db, userId, url }: Ctx): Promise<DashboardAuthorization> {
  const id = url.searchParams.get('id')!;
  const { data: challengeRow, error } = await db.from('challenges').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!challengeRow) return { challengeRow: null, canSeeRoster: false };
  const row = challengeRow as Record<string, unknown>;

  const isOwner = row.owner_id === userId;
  if (isOwner) return { challengeRow: row, canSeeRoster: true };

  const { data: template, error: templateError } = await db
    .from('checklist_templates')
    .select('visibility')
    .eq('id', row.checklist_template_id as string)
    .maybeSingle();
  if (templateError) throw new Error(templateError.message);
  if (template?.visibility !== 'public') return { challengeRow: null, canSeeRoster: false };

  const { data: participantRow, error: participantError } = await db
    .from('challenge_participants')
    .select('id')
    .eq('challenge_id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (participantError) throw new Error(participantError.message);

  return { challengeRow: row, canSeeRoster: !!participantRow };
}

const EMPTY_DASHBOARD = { challenge: null, participants: [], completions: [], ranking: [], targets: [] };

const getDashboard = compose(
  checkCanReadDashboard,
  async ({ url, db, userId }: Ctx, { challengeRow, canSeeRoster }: DashboardAuthorization) => {
    if (!challengeRow) return EMPTY_DASHBOARD;
    const challenge = toChallenge(challengeRow);
    if (!canSeeRoster) return { ...EMPTY_DASHBOARD, challenge };

    const { data: participantRows, error: participantError } = await db
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challenge.id)
      .order('joined_at')
      .limit(MAX_PARTICIPANTS);
    if (participantError) throw new Error(participantError.message);
    const participants = ((participantRows ?? []) as Record<string, unknown>[]).map(toChallengeParticipant);
    if (!participants.length) return { ...EMPTY_DASHBOARD, challenge };

    const now = new Date();
    const to = url.searchParams.get('to') || now.toISOString();
    const from =
      url.searchParams.get('from') ||
      new Date(now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const userIds = [...new Set(participants.map(p => p.userId))];
    // The peer-data gate — used to be `share_records = true` inside four separate RLS policies
    // (checklists/submissions here, fields/checklist_records in getTargets). The caller's own
    // rows are always visible regardless (base own-row RLS never depended on share_records, so
    // this never drops `userId` even when it isn't already on the roster — see getTargets' own
    // comment on the legacy-owner-with-no-participant-row case).
    const visibleUserIds = challenge.shareRecords ? userIds : [userId];

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
          .in('user_id', visibleUserIds)
          .gte('started_at', from)
          .lte('started_at', to)
          .limit(MAX_ROWS),
        db
          .from('submissions')
          .select('user_id, checklist_id, created_at')
          .in('checklist_template_id', templateIds)
          .in('user_id', visibleUserIds)
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

    const targets = await getTargets(db, userId, challenge, participants, visibleUserIds);

    return { challenge, participants, completions, ranking, targets };
  },
);

type Target = {
  fieldId: string;
  title: string;
  unit: string;
  /** The field's own Iconify icon (see useRecordField.tsx) — the targets card renders it next to the title. */
  icon: string;
  target: number;
  contributions: { userId: string; total: number }[];
};

/**
 * A shared goal per number field, with a per-person breakdown — all-time,
 * not scoped to the dashboard's date range (a collective goal accumulates
 * over the challenge's whole life, not just the visible window). Only
 * fields with a target ever get their real values read here, via what used
 * to be the peer-read policies the 20260825000000_challenge_targets.sql migration
 * added — an untargeted field (a personal note, a number field with no goal set)
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
 *
 * `visibleUserIds` is getDashboard's own share_records-gated id list, already narrowed to just
 * the caller when sharing is off — reused here rather than the full roster for the fork-
 * resolution and contribution-totals queries below, replicating the old
 * "Challenge participants can resolve peers' targeted field forks"/"...see peers' targeted
 * contributions" policies' own `share_records = true` gate.
 */
async function getTargets(
  db: SupabaseClient,
  userId: string,
  challenge: ReturnType<typeof toChallenge>,
  participants: ReturnType<typeof toChallengeParticipant>[],
  visibleUserIds: string[],
): Promise<Target[]> {
  const targetFieldIds = Object.keys(challenge.fieldTargets);
  if (!targetFieldIds.length) return [];

  const [{ data: fieldRows, error: fieldError }, { data: forkedFieldRows, error: forkedError }] = await Promise.all([
    // fieldMeta (title/unit/icon) — the plain "own row or public" visibility `fields`' own
    // unscoped GET uses, same as before this moved off RLS: there was never a challenge-specific
    // grant for *this* query, only for the forked copy and the checklist_records contribution
    // rows below. A participant targeting a field they don't own and that isn't public sees blank
    // title/unit/icon here — a pre-existing gap this migration preserves rather than changes.
    db
      .from('fields')
      .select('id, title, unit, icon')
      .in('id', targetFieldIds)
      .or(`user_id.eq.${userId},visibility.eq.public`),
    db
      .from('fields')
      .select('id, copied_from_id')
      .in('user_id', visibleUserIds)
      .in('copied_from_id', targetFieldIds),
  ]);
  if (fieldError) throw new Error(fieldError.message);
  if (forkedError) throw new Error(forkedError.message);

  const fieldMeta = new Map<string, { title: string; unit: string; icon: string }>();
  for (const row of (fieldRows ?? []) as Record<string, unknown>[]) {
    fieldMeta.set(row.id as string, {
      title: row.title as string,
      unit: (row.unit as string) ?? '',
      icon: (row.icon as string) ?? '',
    });
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
    .in('user_id', visibleUserIds)
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
    icon: fieldMeta.get(fieldId)?.icon ?? '',
    target: challenge.fieldTargets[fieldId],
    contributions: participants
      .map(p => ({ userId: p.userId, total: totals.get(`${fieldId}:${p.userId}`) ?? 0 }))
      .sort((a, b) => b.total - a.total),
  }));
}

async function list(ctx: Ctx) {
  const { url, db, userId } = ctx;
  const id = url.searchParams.get('id');
  if (id) return getDashboard(ctx);

  const templateId = url.searchParams.get('checklistTemplateId');
  if (templateId) return getByTemplateId(ctx, templateId);

  // Neither param — "every challenge I'm in," the My Challenges listing (see the module doc
  // comment on `listMine`).
  return listMine(db, userId);
}

type SaveAuthorization = { row: ReturnType<typeof fromChallenge>; entry: Record<string, unknown> };

/**
 * `checklist_template_id` is unique on `challenges`, so this upsert either creates a brand new
 * row (nothing to authorize — it becomes this caller's own the moment it's created, same as
 * every other resource's create path) or updates an *existing* one. Only the second case needs a
 * real check now: RLS's own "manage own challenges" policy used to silently block an update
 * whose existing row belonged to someone else (`using (auth.uid() = owner_id)`, checked against
 * the row as it already was) — that has to be explicit here, or a caller could overwrite anyone
 * else's already-shared challenge (comments toggle, targets, theme, ...) just by re-POSTing with
 * that template's id.
 */
async function checkCanWriteChallenge({ req, db, userId }: Ctx): Promise<SaveAuthorization> {
  const entry = (await body(req)).challenge;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing challenge.');

  let row: ReturnType<typeof fromChallenge>;
  try {
    row = fromChallenge(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid challenge.');
  }

  const { data: existing, error } = await db
    .from('challenges')
    .select('owner_id')
    .eq('checklist_template_id', row.checklist_template_id as string)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (existing && existing.owner_id !== userId) throw new ForbiddenError();

  return { row, entry: entry as Record<string, unknown> };
}

async function saveCore({ db, userId }: Ctx, { row, entry }: SaveAuthorization) {
  // Not a `challenges` column — see `fromChallenge`, which only maps real
  // ones — this is the owner's own display name for the participant row
  // enrolled below. Optional: an older client (or a re-save that only
  // touched the theme/targets) just omits it, which must not blank out an
  // already-good name (see the conditional spread below).
  const ownerDisplayNameRaw = entry.ownerDisplayName;
  const ownerDisplayName =
    typeof ownerDisplayNameRaw === 'string' && ownerDisplayNameRaw.trim() ? ownerDisplayNameRaw.trim() : undefined;
  // Same idea, same "omit rather than blank out" handling — the owner's
  // Google profile photo (see useSession.ts's `avatarUrl`), absent for an
  // owner who was never signed in with Google.
  const ownerAvatarUrlRaw = entry.ownerAvatarUrl;
  const ownerAvatarUrl = typeof ownerAvatarUrlRaw === 'string' && ownerAvatarUrlRaw ? ownerAvatarUrlRaw : undefined;

  // Ownership enforced by checkCanWriteChallenge above, not RLS anymore; unique on
  // checklist_template_id so re-sharing the same template reuses this row.
  const { data, error } = await db
    .from('challenges')
    .upsert({ owner_id: userId, ...row }, { onConflict: 'checklist_template_id' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  const challenge = toChallenge(data as Record<string, unknown>);

  // The sharer always shows up on their own dashboard — every challenge
  // shares everyone's check-ins now, no private-roster mode left to gate
  // this on. Their own template *is* the challenge's canonical
  // checklist_template_id (the owner never forks their own template the way
  // a joiner does — see useJoinChallenge.tsx — so their participant row just
  // points at it directly). No `ignoreDuplicates` (unlike this used to be):
  // a re-save with a new `ownerDisplayName` — someone fixing a blank name
  // from before this field existed — has to actually reach an existing row,
  // not silently no-op against it. supabase-js's default upsert resolution
  // merges rather than clobbering the full row, so omitting `display_name`
  // below (no name given this time) leaves whatever was already stored
  // untouched.
  const { error: participantError } = await db.from('challenge_participants').upsert(
    {
      id: `${challenge.id}:${userId}`,
      challenge_id: challenge.id,
      user_id: userId,
      checklist_template_id: challenge.checklistTemplateId,
      ...(ownerDisplayName ? { display_name: ownerDisplayName } : {}),
      ...(ownerAvatarUrl ? { avatar_url: ownerAvatarUrl } : {}),
    },
    { onConflict: 'challenge_id,user_id' },
  );
  if (participantError) throw new Error(participantError.message);

  return { challenge };
}

const save = compose(checkCanWriteChallenge, saveCore);

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
    return json(200, await route({ url, req, db: admin(), userId: auth.user.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[challenges]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
