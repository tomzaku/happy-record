// `checkPermission` + shared resolution helpers for the `checklist-templates` resource. See
// CLAUDE.md's "Authorization: app layer, not RLS" and `shared/authorize.ts`'s own header for why
// this moved.

import { pickRepeat, type RepeatOwner } from '../../../shared/schedules.ts';
import type { ScheduleException } from '../../../shared/scheduleExceptions.ts';
import { toChecklistTemplate } from '../../../dto/checklist-templates/checklist-templates-dto.ts';
import { fetchTemplateRow } from '../repository/checklist-templates-repository.ts';
import type { Ctx } from '../api/checklist-templates-context.ts';

/** The `RepeatOwner` `fetchRepeats` needs to know it's safe to surface a *non-caller* row for
 * this template — its own default schedule, and only when this exact row is `visibility:
 * 'public'` (see `fetchRepeats`'s own comment on why that's narrower than "the caller may read
 * this template at all"). */
export function repeatOwnerOf(r: Record<string, unknown>): RepeatOwner {
  return { id: r.id as string, ownerUserId: r.user_id as string, isPublic: r.visibility === 'public' };
}

/** Resolves one row's effective schedule for `userId` and maps it to the wire shape — shared by
 * both list branches so "which row wins, and is it a personal override" is decided in exactly
 * one place. `exceptionsBySchedule` is keyed by the *resolved* schedule row's own id (not the
 * template id — a template can resolve to either the owner's row or the caller's own override,
 * each with its own, separate exceptions), so it's only looked up after `pickRepeat` decides
 * which row actually won. `fieldGroupsByTemplate` is the batched read from
 * `shared/fieldGroups.ts`, keyed by template id — embedded directly on the wire now (see
 * `toChecklistTemplate`) rather than left for the client to fetch as a separate resource. */
export function resolveTemplate(
  r: Record<string, unknown>,
  repeatsByTemplate: Record<string, Record<string, unknown>[]>,
  userId: string,
  exceptionsBySchedule: Record<string, ScheduleException[]> = {},
  fieldGroupsByTemplate: Record<string, Record<string, unknown>[]> = {},
) {
  const ownerId = r.user_id as string;
  const repeatRow = pickRepeat(repeatsByTemplate[r.id as string], userId, ownerId);
  const isPersonalOverride = !!repeatRow && repeatRow.user_id === userId && userId !== ownerId;
  const exceptions = repeatRow ? exceptionsBySchedule[repeatRow.id as string] : undefined;
  const fieldGroups = fieldGroupsByTemplate[r.id as string] ?? [];
  return toChecklistTemplate(r, repeatRow, isPersonalOverride, exceptions, ownerId === userId, fieldGroups);
}

/** For `GET /:id` — loads the row (there's nothing to authorize without it) and decides whether
 * this caller may see it: their own, or a `visibility: 'public'` one. `null` for "no," not a
 * thrown error — this used to be RLS silently filtering the row out, and every caller of this
 * route already expects "someone else's private template by id" and "no such id at all" to look
 * identical: an empty `templates` array. */
export async function checkCanReadTemplateById({ db, userId, id }: Ctx): Promise<Record<string, unknown> | null> {
  const row = await fetchTemplateRow(db, id!);
  if (!row) return null;
  return row.user_id === userId || row.visibility === 'public' ? row : null;
}
