// `checkPermission` + shared resolution helpers for the `checklist-templates` resource. See
// CLAUDE.md's "Authorization: app layer, not RLS" and `shared/authorize.ts`'s own header for why
// this moved.

import { pickRepeat, type RepeatOwner } from '../../../shared/repeats.ts';
import { toChecklistTemplate } from '../model/checklist-templates-model.ts';
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
 * one place. */
export function resolveTemplate(
  r: Record<string, unknown>,
  repeatsByTemplate: Record<string, Record<string, unknown>[]>,
  userId: string,
) {
  const ownerId = r.user_id as string;
  const repeatRow = pickRepeat(repeatsByTemplate[r.id as string], userId, ownerId);
  const isPersonalOverride = !!repeatRow && repeatRow.user_id === userId && userId !== ownerId;
  return toChecklistTemplate(r, repeatRow, isPersonalOverride);
}

/** For `GET ?id=` — loads the row (there's nothing to authorize without it) and decides whether
 * this caller may see it: their own, or a `visibility: 'public'` one. `null` for "no," not a
 * thrown error — this used to be RLS silently filtering the row out, and every caller of this
 * route already expects "someone else's private template by id" and "no such id at all" to look
 * identical: an empty `templates` array. */
export async function checkCanReadTemplateById({ db, userId, url }: Ctx): Promise<Record<string, unknown> | null> {
  const id = url.searchParams.get('id')!;
  const { data, error } = await db.from('checklist_templates').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return row.user_id === userId || row.visibility === 'public' ? row : null;
}
