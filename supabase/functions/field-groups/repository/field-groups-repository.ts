// Plain data access for `field-groups` — no authorization decisions here, just reads
// `field-groups-access-service.ts` builds on. See `notes/repository/notes-repository.ts` for the
// reference shape.

import { fetchRepeats, pickRepeat, toRepeat, type RepeatOwner } from '../../../shared/repeats.ts';
import { toFieldGroup } from '../../../dto/field-groups/field-groups-dto.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function fetchFieldGroupsByTemplate(db: SupabaseClient, templateId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await db
    .from('field_groups')
    .select('*')
    .eq('checklist_template_id', templateId)
    .order('position');
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function fetchFieldGroupsByUser(db: SupabaseClient, userId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await db.from('field_groups').select('*').eq('user_id', userId).order('position');
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function upsertFieldGroup(db: SupabaseClient, userId: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('field_groups').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
}

export async function fetchTemplateVisibility(
  db: SupabaseClient,
  templateId: string,
): Promise<{ user_id: string; visibility: string } | null> {
  const { data, error } = await db
    .from('checklist_templates')
    .select('user_id, visibility')
    .eq('id', templateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Attaches each row's own schedule the same way regardless of which branch of `list` produced
 * the rows — shared so that logic lives in exactly one place. `isPublicTemplate` only matters for
 * a row that isn't the caller's own (see `fetchRepeats`'s own comment); `listMine`'s rows are
 * always the caller's own regardless of what it passes here, since `ownerUserId === userId ===
 * callerUserId` already grants those through fetchRepeats' "caller's own row" branch. */
export async function withRepeats(
  db: SupabaseClient,
  userId: string,
  rows: Record<string, unknown>[],
  isPublicTemplate: boolean,
) {
  const owners: RepeatOwner[] = rows.map(r => ({
    id: r.id as string,
    ownerUserId: r.user_id as string,
    isPublic: isPublicTemplate,
  }));
  const repeats = await fetchRepeats(db, 'fieldGroupId', owners, userId);
  // `pickRepeat` returns the raw `repeats` row (snake_case columns) — `toFieldGroup` expects the
  // client-shape object `toRepeat` produces (`dayOfWeek`/`startedAt`/...), same as
  // checklist-templates' own `resolveTemplate` → `toChecklistTemplate` does for the template-level
  // schedule. Missing this call is exactly the bug that shipped here: `hour`/`minute` happen to be
  // spelled the same in both shapes, so those looked fine, but `dayOfWeek` was always `undefined`
  // on the raw row (really `day_of_week`) — GroupScheduleList's own `group.repeat?.dayOfWeek`
  // check then always fell through to "every day," regardless of what was actually saved.
  return rows.map(r => toFieldGroup(r, toRepeat(pickRepeat(repeats[r.id as string], userId, r.user_id as string))));
}
