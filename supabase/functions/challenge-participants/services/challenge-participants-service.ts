// Business logic for `challenge-participants` that isn't a permission decision — see
// `challenge-participants-access-service.ts` for those. Thin pass-through to
// `repository/challenge-participants-repository.ts`; `api/` never reaches in there directly.

import { fetchRepeatRow, saveRepeat, toRepeat } from '../../../shared/repeats.ts';
import {
  fetchRoster,
  fetchTemplateOwnerId,
  removeParticipant,
  upsertParticipant,
} from '../repository/challenge-participants-repository.ts';
import type { Ctx } from '../api/challenge-participants-context.ts';

const MAX_LIMIT = 500;

export function listRoster({ db }: Ctx, challengeId: string): Promise<Record<string, unknown>[]> {
  return fetchRoster(db, challengeId, MAX_LIMIT);
}

/** Seeds a first-time joiner's own reminder schedule from the template owner's current one — a
 * real, independent `repeats` row of their own (not just falling back to reading the owner's live
 * one forever, the way `pickRepeat` resolves it when a participant has no row at all) so it stays
 * put at whatever it was when they joined even if the owner changes theirs later, exactly like any
 * other "notify me at a different time" edit (`updateMyReminder`/PATCH `/checklist-templates/:id`)
 * already does going forward. Never overwrites an existing row — a participant re-joining after
 * leaving keeps whatever they'd already set, seeded or since customized, rather than being reset
 * back to the owner's current schedule. No-op for the owner themselves (their own row already *is*
 * the template's schedule) or a template with no schedule set at all yet.
 */
async function seedReminderFromOwner(
  { db, userId }: Ctx,
  checklistTemplateId: string,
): Promise<void> {
  const ownerId = await fetchTemplateOwnerId(db, checklistTemplateId);
  if (!ownerId || ownerId === userId) return;

  const existing = await fetchRepeatRow(db, { checklistTemplateId, userId });
  if (existing) return;

  const ownerRow = await fetchRepeatRow(db, { checklistTemplateId, userId: ownerId });
  const ownerRepeat = toRepeat(ownerRow ?? undefined);
  if (!ownerRepeat) return;

  await saveRepeat(db, ownerRepeat, { checklistTemplateId, userId });
}

export async function joinChallenge(ctx: Ctx, row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const participant = await upsertParticipant(ctx.db, ctx.userId, row);
  await seedReminderFromOwner(ctx, row.checklist_template_id as string);
  return participant;
}

export function leaveChallenge({ db, userId }: Ctx, challengeId: string): Promise<void> {
  return removeParticipant(db, userId, challengeId);
}
