// Batched field-groups read, shared by `checklist-templates` (to embed a template's own groups
// directly on the wire — see that resource's own `toChecklistTemplate`) and reusing the exact
// same row mapping `field-groups`' own `repository/field-groups-repository.ts` uses for its
// single-template route. Not exposed as its own resource — see `schedules.ts`'s own header for
// the same "genuinely shared by two different resources, so the query lives here instead of being
// copy-pasted into both" reasoning.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { fetchRepeats, pickRepeat, toRepeat, type RepeatOwner } from './schedules.ts';
import { toFieldGroup } from '../dto/field-groups/field-groups-dto.ts';

/** One template's own visibility, as this needs it to decide whether a non-owner viewer may see a
 * group's own schedule (same rule field-groups' own `withRepeats`/`isPublicTemplate` already
 * applies per-template — this is the batched version, across however many templates a
 * checklist-templates list/get call is resolving at once). */
export type TemplateVisibility = { id: string; ownerUserId: string; isPublic: boolean };

/** Every field group across a batch of templates at once, keyed by `checklistTemplateId` — one
 * extra query total (plus one for schedules), not one per template. Archived groups are included,
 * same as field-groups' own routes — callers filter via `getActiveFieldGroups` client-side. */
export async function fetchFieldGroupsByTemplates(
  db: SupabaseClient,
  userId: string,
  templates: TemplateVisibility[],
): Promise<Record<string, Record<string, unknown>[]>> {
  const byTemplate: Record<string, Record<string, unknown>[]> = {};
  if (!templates.length) return byTemplate;

  const { data, error } = await db
    .from('field_groups')
    .select('*')
    .in('checklist_template_id', templates.map(t => t.id))
    .order('position');
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  if (!rows.length) return byTemplate;

  const isPublicByTemplate = new Map(templates.map(t => [t.id, t.isPublic]));
  const owners: RepeatOwner[] = rows.map(r => ({
    id: r.id as string,
    ownerUserId: r.user_id as string,
    isPublic: isPublicByTemplate.get(r.checklist_template_id as string) ?? false,
  }));
  const repeats = await fetchRepeats(db, 'fieldGroupId', owners, userId);

  for (const r of rows) {
    const repeatRow = pickRepeat(repeats[r.id as string], userId, r.user_id as string);
    const templateId = r.checklist_template_id as string;
    (byTemplate[templateId] ??= []).push(toFieldGroup(r, toRepeat(repeatRow)));
  }
  return byTemplate;
}
