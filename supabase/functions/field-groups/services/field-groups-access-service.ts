// `checkPermission` + the repeats-attaching helper for the `field-groups` resource. See
// CLAUDE.md's "Authorization: app layer, not RLS" and `shared/authorize.ts`'s own header for why
// this moved.

import { fetchRepeats, pickRepeat, type RepeatOwner } from '../../../shared/repeats.ts';
import { toFieldGroup } from '../../../dto/field-groups/field-groups-dto.ts';
import type { Ctx } from '../api/field-groups-context.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

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

export type TemplateGroupsAuthorization = { checklistTemplateId: string; visible: boolean; isPublic: boolean };

/** Whether the caller may see *this* template's field groups at all — own template, or a
 * `visibility: 'public'` one. A `false` result isn't a 403: the old RLS policy just silently
 * filtered every row out for a template that doesn't exist or isn't visible, the same "empty,
 * never an error" contract `checklist-templates`' own `?id=` branch documents — so the core
 * handler returns `{ fieldGroups: [] }` rather than throwing. `isPublic` is kept separate from
 * `visible` (which is also true for a private template that's simply mine) — it's what
 * `withRepeats` needs to decide whether a row other than the caller's own may be surfaced. */
export async function checkCanReadFieldGroupsByTemplate({ db, userId, url }: Ctx): Promise<TemplateGroupsAuthorization> {
  const checklistTemplateId = url.searchParams.get('checklistTemplateId')!;
  const { data: template, error } = await db
    .from('checklist_templates')
    .select('user_id, visibility')
    .eq('id', checklistTemplateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const isPublic = template?.visibility === 'public';
  const visible = !!template && (template.user_id === userId || isPublic);
  return { checklistTemplateId, visible, isPublic };
}
