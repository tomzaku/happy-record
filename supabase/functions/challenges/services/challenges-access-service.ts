// `checkPermission` functions for the `challenges` resource — the most RLS surface of any
// resource here to replicate. See CLAUDE.md's "Authorization: app layer, not RLS" and
// `shared/authorize.ts`'s own header for why this moved.

import { ApiError } from '../../../shared/cors.ts';
import { ForbiddenError } from '../../../shared/authorize.ts';
import { fromChallenge } from '../../../dto/challenges/challenges-dto.ts';
import {
  fetchChallengeById,
  fetchChallengeOwnerByTemplateId,
  fetchParticipantRow,
  fetchTemplateVisibility,
} from './challenges-repository.ts';
import { body, type Ctx } from '../api/challenges-context.ts';

export type DashboardAuthorization = { challengeRow: Record<string, unknown> | null; canSeeRoster: boolean };

/**
 * For `GET /:id` — two visibility tiers, replicated from what used to be two separate RLS checks
 * on two different tables:
 *
 *  1. The `challenges` row itself: owner, or a `visibility: 'public'` template (same rule
 *     `getByTemplateId` uses) — this used to be `challenges`' own select policy. `null`
 *     challengeRow means "no such id, or not visible at all," same "empty, never an error"
 *     contract every other by-id lookup in this app uses.
 *  2. The roster (and everything downstream of it — completions, ranking, targets): owner, or an
 *     *actual participant* — strictly narrower than "the template happens to be public." This
 *     used to be "Participants can see their challenge's roster." A visitor who can see a public
 *     template's challenge metadata but hasn't joined yet gets the challenge back with an empty
 *     roster, not a 403 — same as when RLS silently returned zero roster rows before.
 */
export async function checkCanReadDashboard({ db, userId, id }: Ctx): Promise<DashboardAuthorization> {
  const row = await fetchChallengeById(db, id!);
  if (!row) return { challengeRow: null, canSeeRoster: false };

  const isOwner = row.owner_id === userId;
  if (isOwner) return { challengeRow: row, canSeeRoster: true };

  const template = await fetchTemplateVisibility(db, row.checklist_template_id as string);
  if (template?.visibility !== 'public') return { challengeRow: null, canSeeRoster: false };

  const participantRow = await fetchParticipantRow(db, id!, userId);
  return { challengeRow: row, canSeeRoster: !!participantRow };
}

export type SaveAuthorization = { row: ReturnType<typeof fromChallenge>; entry: Record<string, unknown> };

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
export async function checkCanWriteChallenge({ req, db, userId }: Ctx): Promise<SaveAuthorization> {
  const entry = (await body(req)).challenge;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing challenge.');

  let row: ReturnType<typeof fromChallenge>;
  try {
    row = fromChallenge(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid challenge.');
  }

  const existing = await fetchChallengeOwnerByTemplateId(db, row.checklist_template_id as string);
  if (existing && existing.owner_id !== userId) throw new ForbiddenError();

  return { row, entry: entry as Record<string, unknown> };
}
