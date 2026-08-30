// `GET /challenges/:id ?from=&to=` — the dashboard read. from/to default to the last 30 days
// (targets are all-time, not scoped to this range — see getTargets). `completions` is sparse
// (completed days only); the client fills the grid. `ranking` is participants sorted by
// completions-in-range descending. `targets` is one entry per field the owner set a goal for
// (`challenge.fieldTargets`), each with every participant's real contributed total.
//
// `compose(checkCanReadDashboard, core)` — two visibility tiers, replicated from what used to be
// two separate RLS checks on two different tables (see
// services/challenges-access-service.ts's own doc comment): the challenge row itself needs
// owner-or-public-template, but the roster/completions/targets need actual participation — a
// public template nobody's joined yet returns the challenge metadata with an empty roster, not
// the full dashboard.

import { compose } from '../../../shared/authorize.ts';
import { toChallenge } from '../../../dto/challenges/challenges-dto.ts';
import { toChallengeParticipant } from '../../../dto/challenge-participants/challenge-participants-dto.ts';
import { checkCanReadDashboard, type DashboardAuthorization } from '../services/challenges-access-service.ts';
import type { Ctx } from './challenges-context.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const MAX_PARTICIPANTS = 500;
const MAX_ROWS = 5000;
const DEFAULT_RANGE_DAYS = 30;

const EMPTY_DASHBOARD = { challenge: null, participants: [], completions: [], ranking: [], targets: [] };

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
 * A shared goal per number field, with a per-person breakdown — all-time, not scoped to the
 * dashboard's date range (a collective goal accumulates over the challenge's whole life, not
 * just the visible window). Only fields with a target ever get their real values read here, via
 * what used to be the peer-read policies the 20260825000000_challenge_targets.sql migration
 * added — an untargeted field (a personal note, a number field with no goal set) is never
 * touched.
 *
 * Joining a challenge no longer forks the template or its fields (see useJoinChallenge.tsx) —
 * every participant, owner included, records against the exact same field id a target is keyed
 * by, so attribution is just "whoever's `user_id` is actually on the row." The one wrinkle:
 * `resolveFieldId` still resolves a *pre-existing* fork's id back to the target it counts toward,
 * so a participant who joined before that change shipped doesn't lose their already-recorded
 * contributions — nothing new ever creates a fork to resolve here.
 *
 * `visibleUserIds` is the dashboard handler's own share_records-gated id list, already narrowed
 * to just the caller when sharing is off — reused here rather than the full roster for the
 * fork-resolution and contribution-totals queries below, replicating the old "Challenge
 * participants can resolve peers' targeted field forks"/"...see peers' targeted contributions"
 * policies' own `share_records = true` gate.
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

export const getChallengeDashboardHandler = compose(
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
