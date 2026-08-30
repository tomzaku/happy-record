// Plain data access for `field-groups` — no authorization decisions here, just reads
// `field-groups-access-service.ts` builds on. See `notes/services/notes-repository.ts` for the
// reference shape.

import { fetchRepeats, pickRepeat, type RepeatOwner } from '../../../shared/repeats.ts';
import { toFieldGroup } from '../../../dto/field-groups/field-groups-dto.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

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
  // No participant-override concept for a group's own schedule today — only its owner ever
  // writes one (see save handler) — but resolving through pickRepeat rather than assuming "the
  // only row" keeps this consistent with checklist-templates' own resolution, and correct without
  // changes if that ever stops being true.
  return rows.map(r => toFieldGroup(r, pickRepeat(repeats[r.id as string], userId, r.user_id as string)));
}
