// Business logic for `challenge-participants` that isn't a permission decision — see
// `challenge-participants-access-service.ts` for those. Thin pass-through to
// `repository/challenge-participants-repository.ts`; `api/` never reaches in there directly.

import { fetchRepeatRow, saveRepeat, toRepeat } from '../../../shared/repeats.ts';
import {
  fetchFieldGroupIds,
  fetchRoster,
  fetchTemplateOwnerId,
  removeParticipant,
  upsertParticipant,
} from '../repository/challenge-participants-repository.ts';
import type { Ctx } from '../api/challenge-participants-context.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const MAX_LIMIT = 500;

export function listRoster({ db }: Ctx, challengeId: string): Promise<Record<string, unknown>[]> {
  return fetchRoster(db, challengeId, MAX_LIMIT);
}

/** Copies one schedule from the owner to a first-time joiner — never overwrites a row the
 * participant already has (a re-join after leaving keeps whatever they'd already set, seeded or
 * since customized) and no-ops wherever the owner has no schedule set at all yet. Shared by the
 * template's own top-level schedule and every one of its field groups' own — see
 * `seedReminderFromOwner`'s own comment for why both matter. */
async function seedOneRepeat(
  db: SupabaseClient,
  owner: { checklistTemplateId?: string; fieldGroupId?: string },
  participantUserId: string,
  ownerUserId: string,
): Promise<void> {
  const existing = await fetchRepeatRow(db, { ...owner, userId: participantUserId });
  if (existing) return;

  const ownerRow = await fetchRepeatRow(db, { ...owner, userId: ownerUserId });
  const ownerRepeat = toRepeat(ownerRow ?? undefined);
  if (!ownerRepeat) return;

  await saveRepeat(db, ownerRepeat, { ...owner, userId: participantUserId });
}

/** Seeds a first-time joiner's own reminder schedule(s) from the template owner's current
 * ones — real, independent `repeats` rows of their own (not just falling back to reading the
 * owner's live one forever, the way `pickRepeat` resolves it when a participant has no row at
 * all) so they stay put at whatever they were when the participant joined even if the owner
 * changes theirs later, exactly like any other "notify me at a different time" edit
 * (`updateMyReminder`/PATCH `/checklist-templates/:id`) already does going forward.
 *
 * Both the template's own top-level schedule *and* every one of its field groups' own get this —
 * a template with real field groups derives its effective schedule from the union of each
 * group's own `repeat` (see CLAUDE.md's own `getEffectiveDayOfWeek`/`ChecklistFieldGroupHeader`
 * comment on why the template-level one is edited via the groups, not directly), so for exactly
 * that shape of template the top-level row is typically never set at all — copying only it would
 * silently seed nothing for the one schedule a participant on a field-group template actually
 * sees and cares about. No-op for the owner themselves, or wherever the owner has no schedule set
 * at either level yet.
 */
async function seedReminderFromOwner(
  { db, userId }: Ctx,
  checklistTemplateId: string,
): Promise<void> {
  const ownerId = await fetchTemplateOwnerId(db, checklistTemplateId);
  if (!ownerId || ownerId === userId) return;

  await seedOneRepeat(db, { checklistTemplateId }, userId, ownerId);

  const fieldGroupIds = await fetchFieldGroupIds(db, checklistTemplateId);
  for (const fieldGroupId of fieldGroupIds) {
    await seedOneRepeat(db, { fieldGroupId }, userId, ownerId);
  }
}

export async function joinChallenge(ctx: Ctx, row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const participant = await upsertParticipant(ctx.db, ctx.userId, row);
  await seedReminderFromOwner(ctx, row.checklist_template_id as string);
  return participant;
}

export function leaveChallenge({ db, userId }: Ctx, challengeId: string): Promise<void> {
  return removeParticipant(db, userId, challengeId);
}
