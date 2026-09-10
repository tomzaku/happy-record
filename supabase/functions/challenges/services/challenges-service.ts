// Business logic for `challenges` that isn't a permission decision — see
// `challenges-access-service.ts` for those. This is where the multi-query composition (the "my
// challenges" listing's own contribution/streak math, the dashboard's completions/ranking/targets
// build-up, the owner-auto-enroll a save does) lives, between `api/` and
// `repository/challenges-repository.ts`.

import { create, all } from 'npm:mathjs@13';
import { toChallenge } from '../../../dto/challenges/challenges-dto.ts';
import { toChallengeParticipant } from '../../../dto/challenge-participants/challenge-participants-dto.ts';
import { fetchFieldIdsReferencedByTemplate } from '../../../shared/fieldGroupFields.ts';
import {
  fetchChallengeByTemplateId,
  fetchChallengesByIds,
  fetchChecklistRecordRows,
  fetchChecklistsForUsersInRange,
  fetchFieldsMetaForUser,
  fetchFieldTypesByIds,
  fetchForkedFields,
  fetchMediaChecklistRecordsForUsersInRange,
  fetchMyParticipantRows,
  fetchOwnedChallenges,
  fetchParticipantChallengeIds,
  fetchParticipantDisplay,
  fetchParticipantsForChallenge,
  fetchPublicChallenges,
  fetchSubmissionsForUsersInRange,
  fetchTemplateVisibilities,
  fetchTemplatesMeta,
  upsertChallenge,
  upsertOwnerParticipant,
} from '../repository/challenges-repository.ts';
import type { Ctx } from '../api/challenges-context.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Same restricted instance the DTO's own sanitizeTarget validates against — `import`/`createUnit`
// disabled per mathjs's hardening guide, since `formula` is an owner-typed string evaluated here
// against real submitted data.
const math = create(all, {});
math.import(
  {
    import: () => {
      throw new Error('Function import is disabled');
    },
    createUnit: () => {
      throw new Error('Function createUnit is disabled');
    },
  },
  { override: true },
);

const MAX_ROWS = 5000;
const MAX_PARTICIPANTS = 500;
const MAX_MY_CHALLENGES = 200;
const DEFAULT_RANGE_DAYS = 30;

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
 * DEFAULT_RANGE_DAYS days — the numbers `listMyChallenges` actually exists to show. Templates
 * rather than challenge ids drive the query (a checklist/submission only ever carries
 * `checklist_template_id`), then mapped back to whichever challenge(s) share that template — in
 * practice always exactly one, since `challenges.checklist_template_id` is unique, but this stays
 * a map-of-arrays rather than assuming that so a future many-challenges-per-template case
 * wouldn't silently drop one.
 *
 * Always the caller's own rows — no visibility decision to make here regardless of which client
 * runs it.
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

  const [checklistRows, submissionRows] = await Promise.all([
    fetchChecklistsForUsersInRange(db, [userId], templateIds, from, to, MAX_ROWS),
    fetchSubmissionsForUsersInRange(db, [userId], templateIds, from, to, MAX_ROWS),
  ]);

  // Submissions are dated by their checklist's own started_at (the day it actually represents),
  // not the submission's own created_at — same reasoning as the dashboard's own addCompletion.
  const checklistDateById = new Map<string, string>();
  const templateIdByChecklistId = new Map<string, string>();
  for (const row of checklistRows) {
    checklistDateById.set(row.id, row.started_at.slice(0, 10));
    templateIdByChecklistId.set(row.id, row.checklist_template_id);
  }

  const datesByTemplateId = new Map<string, Set<string>>();
  const addDate = (templateId: string, date: string) => {
    if (!datesByTemplateId.has(templateId)) datesByTemplateId.set(templateId, new Set());
    datesByTemplateId.get(templateId)!.add(date);
  };
  for (const row of checklistRows) {
    if (row.completed_at) addDate(row.checklist_template_id, row.started_at.slice(0, 10));
  }
  for (const row of submissionRows) {
    const templateId = templateIdByChecklistId.get(row.checklist_id) ?? row.checklist_template_id;
    const date = checklistDateById.get(row.checklist_id) ?? row.created_at.slice(0, 10);
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
export async function listMyChallenges({ db, userId }: Ctx) {
  const [ownedRowsArr, participantRows] = await Promise.all([
    fetchOwnedChallenges(db, userId, MAX_MY_CHALLENGES),
    fetchMyParticipantRows(db, userId, MAX_MY_CHALLENGES),
  ]);

  const joinedAtByChallengeId = new Map<string, string>(participantRows.map(r => [r.challenge_id, r.joined_at]));
  const ownedIds = new Set(ownedRowsArr.map(r => r.id as string));
  // Only fetch challenges seen in `challenge_participants` but not already covered by the owned
  // query above — an owner (always auto-enrolled now) would otherwise show up twice.
  const joinedOnlyIds = [...joinedAtByChallengeId.keys()].filter(id => !ownedIds.has(id));

  const joinedRowsAll = await fetchChallengesByIds(db, joinedOnlyIds, MAX_MY_CHALLENGES);

  // Explicit now, replacing what used to be RLS's own "challenges are readable when their
  // template is" filter on this query: a joined challenge whose template got unshared since this
  // caller joined it must stop appearing here, the same graceful degrade RLS gave for free
  // before — a joined-only id is never the caller's own template, so "owner" never applies here.
  const joinedTemplateIds = [...new Set(joinedRowsAll.map(r => r.checklist_template_id as string))];
  const joinedTemplates = await fetchTemplateVisibilities(db, joinedTemplateIds);
  const publicTemplateIds = new Set(joinedTemplates.filter(t => t.visibility === 'public').map(t => t.id));
  const joinedRows = joinedRowsAll.filter(r => publicTemplateIds.has(r.checklist_template_id as string));

  const allRowsWithTemplate = [...ownedRowsArr, ...joinedRows];
  if (!allRowsWithTemplate.length) return [];

  const templateIdsWithTemplate = [...new Set(allRowsWithTemplate.map(r => r.checklist_template_id as string))];
  // Safe with no further check: every id in `templateIdsWithTemplate` is either the caller's own
  // or was just confirmed public above. Every participant row across every one of these
  // challenges, just to count them — every id in `allRowsWithTemplate` is a challenge the caller
  // legitimately owns or has joined (participant-count visibility was never gated tighter than
  // that anyway — see checkCanReadDashboard's own comment on roster vs. peer-data visibility), so
  // this needs no further check either.
  const [templateRowsWithDeleted, rosterRows] = await Promise.all([
    fetchTemplatesMeta(db, templateIdsWithTemplate),
    fetchParticipantChallengeIds(db, allRowsWithTemplate.map(r => r.id as string), MAX_ROWS),
  ]);

  // A soft-deleted template (deleteTemplate's own `deleted_at` — the row itself stays, so the
  // queries above would otherwise keep resolving a title/avatar for it forever) must stop
  // surfacing its challenge here, for the owner and every participant alike — same "the thing
  // this challenge is about is gone" reasoning the detail page's own template-deleted banner
  // already applies, just enforced here instead of relying on the client to notice `deleted_at`.
  const deletedTemplateIds = new Set(
    templateRowsWithDeleted.filter(r => r.deleted_at).map(r => r.id as string),
  );
  const allRows = allRowsWithTemplate.filter(r => !deletedTemplateIds.has(r.checklist_template_id as string));
  if (!allRows.length) return [];

  const templateById = new Map(templateRowsWithDeleted.map(r => [r.id as string, r]));
  const participantCountByChallenge = new Map<string, number>();
  for (const row of rosterRows) {
    participantCountByChallenge.set(row.challenge_id, (participantCountByChallenge.get(row.challenge_id) ?? 0) + 1);
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

  return challenges;
}

const MAX_PUBLIC_CHALLENGES = 100;

/**
 * Admin-curated challenges (`is_public_listing` — see 20260905010000_challenges_public_listing.sql,
 * only ever flipped by hand) the caller hasn't already owned/joined, for the "Discover" section of
 * challenge-list-page-ui — a lighter shape than `listMyChallenges`' own rows: no per-user
 * checkins/streak (meaningless before joining), just enough to render a browse card and let the
 * caller decide whether to join.
 */
export async function listPublicChallenges({ db, userId }: Ctx) {
  const [ownedRows, participantRows] = await Promise.all([
    fetchOwnedChallenges(db, userId, MAX_MY_CHALLENGES),
    fetchMyParticipantRows(db, userId, MAX_MY_CHALLENGES),
  ]);
  const excludeIds = [...new Set([...ownedRows.map(r => r.id as string), ...participantRows.map(r => r.challenge_id)])];

  const rows = await fetchPublicChallenges(db, excludeIds, MAX_PUBLIC_CHALLENGES);
  if (!rows.length) return [];

  const templateIds = [...new Set(rows.map(r => r.checklist_template_id as string))];
  const [templateRows, rosterRows] = await Promise.all([
    fetchTemplatesMeta(db, templateIds),
    fetchParticipantChallengeIds(db, rows.map(r => r.id as string), MAX_ROWS),
  ]);

  const templateById = new Map(templateRows.map(r => [r.id as string, r]));
  const participantCountByChallenge = new Map<string, number>();
  for (const row of rosterRows) {
    participantCountByChallenge.set(row.challenge_id, (participantCountByChallenge.get(row.challenge_id) ?? 0) + 1);
  }

  return rows.map(row => {
    const challenge = toChallenge(row);
    const template = templateById.get(challenge.checklistTemplateId) as Record<string, unknown> | undefined;
    return {
      id: challenge.id,
      checklistTemplateId: challenge.checklistTemplateId,
      title: (template?.title as string) ?? '',
      avatar: (template?.avatar as Record<string, unknown>) ?? {},
      participantCount: participantCountByChallenge.get(challenge.id) ?? 0,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      createdAt: challenge.createdAt,
    };
  });
}

/** The challenge is visible to its owner unconditionally, or to anyone at all once the template
 * is public (same rule the dashboard's checkCanReadDashboard uses for its own challenge-row
 * tier) — `null` for neither, not a thrown error, matching this route's established "no challenge
 * yet" contract. */
export async function getChallengeByTemplate({ db, userId }: Ctx, templateId: string) {
  const row = await fetchChallengeByTemplateId(db, templateId);
  if (!row) return null;
  const isOwner = row.owner_id === userId;

  if (!isOwner) {
    const [template] = await fetchTemplateVisibilities(db, [templateId]);
    if (template?.visibility !== 'public') return null;
  }

  const challenge = toChallenge(row);

  // The shared page's own greeting ("X just challenged you!") wants the real creator's
  // name/photo instead of a generic fallback — the owner's own `challenge_participants` row,
  // straight off their Google identity (see CardShare and useSession.ts's
  // `displayName`/`avatarUrl`). Always safe to read here: either the caller *is* the owner (their
  // own row), or we've just confirmed the template is public — exactly the two conditions the old
  // "Anyone can read the owner's name on a publicly shared challenge" RLS policy checked for,
  // combined with the base "read your own row" grant every participant already had.
  const ownerRow = await fetchParticipantDisplay(db, challenge.id, challenge.ownerId);
  const ownerDisplayName = ownerRow?.display_name?.trim();
  const ownerAvatarUrl = ownerRow?.avatar_url || undefined;

  return {
    ...challenge,
    ...(ownerDisplayName ? { ownerDisplayName } : {}),
    ...(ownerAvatarUrl ? { ownerAvatarUrl } : {}),
  };
}

type Target = {
  id: string;
  title: string;
  unit: string;
  /** The field's own Iconify icon (see useRecordField.tsx) — the targets card renders it next to the title. */
  icon: string;
  goal: number;
  contributions: { userId: string; total: number }[];
};

/**
 * A shared goal per owner-defined formula, with a per-person breakdown — since the challenge's
 * own `startDate`, not scoped to the dashboard's from/to range (a collective goal accumulates over
 * the challenge's whole life, not just the visible window). Contributions recorded before
 * `startDate` never count, even if they're on a field the challenge now targets — a participant
 * who was already tracking that field solo shouldn't get a head start. Re-anchors automatically if
 * the owner edits `startDate` later (see `ChallengeConfigForm.tsx`): every dashboard read
 * recomputes this from the row's current value, nothing is cached or denormalized per-participant
 * that a start-date change would leave stale.
 *
 * `target.variables` maps a mathjs identifier to a field id — `target.formula` is evaluated once
 * per *submission* (every field a Submit click wrote shares one `checklist_records.submission_id`
 * — see CLAUDE.md), so `sets * reps` only multiplies values that were actually recorded together.
 * A submission missing one of the formula's declared fields (the owner filled in one field group
 * but not another that same click) is skipped entirely rather than treating the missing value as
 * 0 — an incomplete submission shouldn't silently zero out the whole term. `title`/`unit`/`icon`
 * live directly on the stored target now (no field metadata lookup needed — see
 * `sanitizeTarget`'s own comment), since a formula spanning several fields has no single field to
 * borrow them from.
 *
 * Joining a challenge no longer forks the template or its fields (see useJoinChallenge.tsx) —
 * every participant, owner included, records against the exact same field id a target's own
 * `variables` map references, so attribution is just "whoever's `user_id` is actually on the row."
 * The one wrinkle: `resolveFieldId` still resolves a *pre-existing* fork's id back to the field it
 * counts toward, so a participant who joined before that change shipped doesn't lose their
 * already-recorded contributions — nothing new ever creates a fork to resolve here.
 *
 * `visibleUserIds` is the dashboard's own share_records-gated id list, already narrowed to just
 * the caller when sharing is off — reused here rather than the full roster for the
 * fork-resolution and contribution-totals queries below.
 */
async function getTargets(
  db: SupabaseClient,
  challenge: ReturnType<typeof toChallenge>,
  participants: ReturnType<typeof toChallengeParticipant>[],
  visibleUserIds: string[],
): Promise<Target[]> {
  const targets = challenge.targets;
  if (!targets.length) return [];

  const targetFieldIds = [...new Set(targets.flatMap(t => Object.values(t.variables)))];
  if (!targetFieldIds.length) return [];

  const forkedFieldRows = await fetchForkedFields(db, visibleUserIds, targetFieldIds);
  // A legacy fork's id -> the field id it counts toward.
  const resolveFieldId = new Map<string, string>();
  for (const row of forkedFieldRows) {
    resolveFieldId.set(row.id, row.copied_from_id);
  }

  const resolvedFieldIds = [...new Set([...targetFieldIds, ...resolveFieldId.keys()])];
  const recordRows = await fetchChecklistRecordRows(db, resolvedFieldIds, visibleUserIds, challenge.startDate, MAX_ROWS);

  // One entry per real submission: who submitted it, and each targeted field's own numeric value
  // recorded in it — the scope a target's formula gets evaluated against.
  const submissions = new Map<string, { userId: string; values: Map<string, number> }>();
  for (const row of recordRows) {
    if (typeof row.value_number !== 'number' || !row.submission_id) continue;
    const fieldId = resolveFieldId.get(row.field_id) ?? row.field_id;
    if (!submissions.has(row.submission_id)) {
      submissions.set(row.submission_id, { userId: row.user_id, values: new Map() });
    }
    submissions.get(row.submission_id)!.values.set(fieldId, row.value_number);
  }

  return targets.map(target => {
    const compiled = math.compile(target.formula);
    const totals = new Map<string, number>(); // userId -> sum

    for (const { userId, values } of submissions.values()) {
      const scope: Record<string, number> = {};
      let complete = true;
      for (const [name, fieldId] of Object.entries(target.variables)) {
        const value = values.get(fieldId);
        if (value === undefined) {
          complete = false;
          break;
        }
        scope[name] = value;
      }
      if (!complete) continue;

      let result: unknown;
      try {
        result = compiled.evaluate(scope);
      } catch {
        continue;
      }
      // Guards a divide-by-zero (Infinity/NaN) from corrupting the running total.
      if (typeof result === 'number' && Number.isFinite(result)) {
        totals.set(userId, (totals.get(userId) ?? 0) + result);
      }
    }

    return {
      id: target.id,
      title: target.title,
      unit: target.unit,
      icon: target.icon,
      goal: target.goal,
      contributions: participants
        .map(p => ({ userId: p.userId, total: totals.get(p.userId) ?? 0 }))
        .sort((a, b) => b.total - a.total),
    };
  });
}

type Attachment = {
  userId: string;
  fieldId: string;
  title: string;
  icon: string;
  kind: 'photo' | 'video';
  mediaId: string;
  createdAt: string;
};

/**
 * Which photo/video field(s) each visible participant actually submitted, within the dashboard's
 * own date window — this is the "peer read of completion, not content" line's one deliberate
 * exception (see CLAUDE.md's own note on `media`'s `checkCanReadMedia`): a media *blob* already got
 * its own explicit peer-visibility carve-out at the storage layer, gated the same way
 * (`share_records`) this reuses via `visibleUserIds` — this just tells the client which ids to ask
 * `GET /media/:id` for, never a record's raw text/number value the way `getTargets` still only
 * ever hands back a pre-aggregated sum. `mediaId` is a `media` row's own id, not a URL — the client
 * resolves it via `useMediaUrl`, subject to that route's own authorization check independently of
 * this one.
 */
async function getAttachments(
  db: SupabaseClient,
  ownerId: string,
  templateIds: string[],
  visibleUserIds: string[],
  from: string,
  to: string,
): Promise<Attachment[]> {
  const referencedFieldIdsPerTemplate = await Promise.all(
    templateIds.map(templateId => fetchFieldIdsReferencedByTemplate(db, templateId)),
  );
  const fieldIds = [...new Set(referencedFieldIdsPerTemplate.flat())];
  if (!fieldIds.length) return [];

  const fieldTypeRows = await fetchFieldTypesByIds(db, fieldIds);
  const kindByFieldId = new Map<string, 'photo' | 'video'>(
    fieldTypeRows
      .filter((row): row is { id: string; type: 'photo' | 'video' } => row.type === 'photo' || row.type === 'video')
      .map(row => [row.id, row.type]),
  );
  if (!kindByFieldId.size) return [];

  const mediaFieldIds = [...kindByFieldId.keys()];
  // title/icon scoped to the *owner's* own-or-public visibility, not each individual submitter's —
  // same reasoning (and same call) `getTargets` already uses: every participant records against
  // the exact same canonical field id (joining never forks), so this resolves correctly regardless
  // of who actually submitted a given attachment.
  const [fieldMetaRows, recordRows] = await Promise.all([
    fetchFieldsMetaForUser(db, mediaFieldIds, ownerId),
    fetchMediaChecklistRecordsForUsersInRange(db, mediaFieldIds, visibleUserIds, from, to, MAX_ROWS),
  ]);
  const fieldMeta = new Map(fieldMetaRows.map(row => [row.id, { title: row.title, icon: row.icon ?? '' }]));

  return recordRows
    .filter((row): row is typeof row & { value_text: string } => !!row.value_text)
    .map(row => ({
      userId: row.user_id,
      fieldId: row.field_id,
      title: fieldMeta.get(row.field_id)?.title ?? '',
      icon: fieldMeta.get(row.field_id)?.icon ?? '',
      kind: kindByFieldId.get(row.field_id)!,
      mediaId: row.value_text,
      createdAt: row.created_at,
    }));
}

export type Dashboard = {
  challenge: ReturnType<typeof toChallenge> | null;
  participants: ReturnType<typeof toChallengeParticipant>[];
  completions: { userId: string; date: string }[];
  ranking: { userId: string; count: number }[];
  targets: Target[];
  attachments: Attachment[];
};

export const EMPTY_DASHBOARD: Dashboard = {
  challenge: null,
  participants: [],
  completions: [],
  ranking: [],
  targets: [],
  attachments: [],
};

export async function buildDashboard({ url, db, userId }: Ctx, challengeRow: Record<string, unknown>): Promise<Dashboard> {
  const challenge = toChallenge(challengeRow);

  const participantRows = await fetchParticipantsForChallenge(db, challenge.id, MAX_PARTICIPANTS);
  const participants = participantRows.map(toChallengeParticipant);
  if (!participants.length) return { ...EMPTY_DASHBOARD, challenge };

  const now = new Date();
  const to = url.searchParams.get('to') || now.toISOString();
  const requestedFrom =
    url.searchParams.get('from') || new Date(now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  // Never rank/streak on activity from before the challenge existed — a participant who was
  // already tracking this template solo shouldn't get credit predating the challenge, and this
  // stays correct if the owner pushes startDate later (ChallengeConfigForm.tsx): every read
  // re-clamps against the row's current value rather than something decided at creation time.
  const from =
    new Date(requestedFrom).getTime() > new Date(challenge.startDate).getTime() ? requestedFrom : challenge.startDate;

  const userIds = [...new Set(participants.map(p => p.userId))];
  // The peer-data gate — used to be `share_records = true` inside four separate RLS policies
  // (checklists/submissions here, fields/checklist_records in getTargets). The caller's own rows
  // are always visible regardless (base own-row RLS never depended on share_records, so this
  // never drops `userId` even when it isn't already on the roster — see getTargets' own comment
  // on the legacy-owner-with-no-participant-row case).
  const visibleUserIds = challenge.shareRecords ? userIds : [userId];

  // Every participant records against the challenge's own template id directly (joining never
  // forks — see useJoinChallenge.tsx), so this is just `[challenge.checklistTemplateId]` in
  // practice. Still widened to every `checklist_template_id` on the roster, not hardcoded to the
  // one value, so a participant who joined back when this *did* fork (a pre-existing
  // `challenge_participants` row pointing at their own old fork) still shows up correctly instead
  // of silently dropping out.
  const templateIds = [...new Set([challenge.checklistTemplateId, ...participants.map(p => p.checklistTemplateId)])];

  const [checklistRows, submissionRows] = await Promise.all([
    fetchChecklistsForUsersInRange(db, visibleUserIds, templateIds, from, to, MAX_ROWS),
    fetchSubmissionsForUsersInRange(db, visibleUserIds, templateIds, from, to, MAX_ROWS),
  ]);

  // A day counts as completed if its checklist was checked off directly (completed_at) or had at
  // least one submission — covers both the plain check/uncheck templates and the ones with real
  // fields. Submissions are dated by their checklist's own started_at (the day it actually
  // represents), not the submission's own created_at, which can roll into the next calendar day
  // for a late-night submit.
  const checklistById = new Map<string, { userId: string; date: string }>();
  for (const row of checklistRows) {
    checklistById.set(row.id, { userId: row.user_id, date: row.started_at.slice(0, 10) });
  }

  const seen = new Set<string>();
  const completions: { userId: string; date: string }[] = [];
  const addCompletion = (userId: string, date: string) => {
    const key = `${userId}:${date}`;
    if (seen.has(key)) return;
    seen.add(key);
    completions.push({ userId, date });
  };

  for (const row of checklistRows) {
    if (row.completed_at) addCompletion(row.user_id, row.started_at.slice(0, 10));
  }
  for (const s of submissionRows) {
    const checklist = checklistById.get(s.checklist_id);
    const date = checklist ? checklist.date : s.created_at.slice(0, 10);
    addCompletion(s.user_id, date);
  }

  // Every participant appears even at 0, so a newcomer shows up on the board rather than looking
  // like the query silently skipped them.
  const countByUser = new Map<string, number>(participants.map(p => [p.userId, 0]));
  for (const c of completions) countByUser.set(c.userId, (countByUser.get(c.userId) ?? 0) + 1);
  const ranking = [...countByUser.entries()].map(([userId, count]) => ({ userId, count })).sort((a, b) => b.count - a.count);

  const [targets, attachments] = await Promise.all([
    getTargets(db, challenge, participants, visibleUserIds),
    getAttachments(db, challenge.ownerId, templateIds, visibleUserIds, from, to),
  ]);

  return { challenge, participants, completions, ranking, targets, attachments };
}

/** `challenge.ownerDisplayName`/`ownerAvatarUrl` are not `challenges` columns — they become the
 * owner's own `challenge_participants` row's name/photo. `entry` is the raw wire payload (only
 * `row`, the mapped `challenges` columns, comes from `fromChallenge`), needed here to reach
 * those two extra fields. */
export async function saveChallenge(
  { db, userId }: Ctx,
  row: Record<string, unknown>,
  entry: Record<string, unknown>,
): Promise<ReturnType<typeof toChallenge>> {
  // Not a `challenges` column — see `fromChallenge`, which only maps real ones — this is the
  // owner's own display name for the participant row enrolled below. Optional: an older client
  // (or a re-save that only touched the theme/targets) just omits it, which must not blank out an
  // already-good name (see the conditional spread in upsertOwnerParticipant).
  const ownerDisplayNameRaw = entry.ownerDisplayName;
  const ownerDisplayName =
    typeof ownerDisplayNameRaw === 'string' && ownerDisplayNameRaw.trim() ? ownerDisplayNameRaw.trim() : undefined;
  // Same idea, same "omit rather than blank out" handling — the owner's Google profile photo (see
  // useSession.ts's `avatarUrl`), absent for an owner who was never signed in with Google.
  const ownerAvatarUrlRaw = entry.ownerAvatarUrl;
  const ownerAvatarUrl = typeof ownerAvatarUrlRaw === 'string' && ownerAvatarUrlRaw ? ownerAvatarUrlRaw : undefined;

  // Ownership enforced by checkCanWriteChallenge, not RLS anymore; unique on checklist_template_id
  // so re-sharing the same template reuses this row.
  const data = await upsertChallenge(db, userId, row);
  const challenge = toChallenge(data);

  // The sharer always shows up on their own dashboard — every challenge shares everyone's
  // check-ins now, no private-roster mode left to gate this on. Their own template *is* the
  // challenge's canonical checklist_template_id (the owner never forks their own template the way
  // a joiner does — see useJoinChallenge.tsx — so their participant row just points at it
  // directly). No `ignoreDuplicates` (unlike this used to be): a re-save with a new
  // `ownerDisplayName` — someone fixing a blank name from before this field existed — has to
  // actually reach an existing row, not silently no-op against it. supabase-js's default upsert
  // resolution merges rather than clobbering the full row, so omitting `display_name` below (no
  // name given this time) leaves whatever was already stored untouched.
  await upsertOwnerParticipant(db, {
    id: `${challenge.id}:${userId}`,
    challengeId: challenge.id,
    userId,
    checklistTemplateId: challenge.checklistTemplateId,
    displayName: ownerDisplayName,
    avatarUrl: ownerAvatarUrl,
  });

  return challenge;
}
