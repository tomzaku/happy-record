// `GET /challenges` (no `id`/`checklistTemplateId`) — "every challenge I'm in," the My Challenges
// listing behind challenge-list-page-ui, not the per-challenge dashboard. One row per challenge:
// id, checklistTemplateId, the template's own title/avatar (joined in, not embedded in
// `challenges` itself), isOwner, shareRecords/commentsEnabled (shareRecords is always true now —
// every challenge shares everyone's check-ins, see the save handler — kept on the wire rather
// than dropped so an older client reading it doesn't need a shape change), participantCount,
// joinedAt (absent only for a legacy owner row saved before every owner was auto-enrolled), and
// this caller's own myCheckins/myStreak over the last DEFAULT_RANGE_DAYS days — "how much effort
// you've put in," the actual point of the page, computed cheaply here (one pair of queries scoped
// to the caller alone, across every listed challenge's template at once) rather than one full
// per-challenge dashboard fetch per row. No *other* participant's numbers here, and no rank — the
// full peer breakdown is still the per-challenge dashboard, which this listing links out to.

import { toChallenge } from '../model/challenges-model.ts';
import type { Ctx } from './challenges-context.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const MAX_ROWS = 5000;
const DEFAULT_RANGE_DAYS = 30;
const MAX_MY_CHALLENGES = 200;

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
 * DEFAULT_RANGE_DAYS days — the numbers this handler actually exists to show. Templates rather
 * than challenge ids drive the query (a checklist/submission only ever carries
 * `checklist_template_id`), then mapped back to whichever challenge(s) share that template — in
 * practice always exactly one, since `challenges.checklist_template_id` is unique, but this stays
 * a map-of-arrays rather than assuming that so a future many-challenges-per-template case
 * wouldn't silently drop one.
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
  // not the submission's own created_at — same reasoning as the dashboard handler's own
  // addCompletion.
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
 * Two separate queries for the challenge rows themselves rather than one join because "owns" and
 * "has joined" are genuinely different relationships (owner_id on `challenges` vs. a row in
 * `challenge_participants`) — every owner is auto-enrolled as a participant on save now, but a
 * legacy challenge saved before that was unconditional can still have an owner with no
 * participant row, so relying on `challenge_participants` alone would miss it.
 */
export async function listMyChallengesHandler({ db, userId }: Ctx) {
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
