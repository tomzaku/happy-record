// Which field ids a checklist template's own field_groups actually reference. Originally
// `fields/repository/fields-repository.ts`'s own local helper (for resolving a shared template's
// fields — see `fields/index.ts`'s own `?templateId=` route); promoted here once `challenges` also
// needed it (for the dashboard's own attachments section — see
// `challenges/services/challenges-service.ts`'s `getAttachments`), same "genuinely shared across
// more than one resource's own services layer" threshold `shared/repeats.ts` crossed for the same
// reason (see CLAUDE.md).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** A field id out of a `field_groups.fields` jsonb array element — either the current
 * `{ fieldId, overrides? }` shape or a legacy plain id string (a row saved before that shape
 * existed — see useChecklistTemplates.tsx's own normalizeFieldGroupFields, the client-side
 * equivalent of this same tolerance). */
function fieldIdOf(entry: unknown): string | undefined {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object' && typeof (entry as { fieldId?: unknown }).fieldId === 'string') {
    return (entry as { fieldId: string }).fieldId;
  }
  return undefined;
}

/** Every field id one template's own field_groups reference — a plain fetch-and-shape, no
 * visibility decision (the caller is responsible for confirming the template is visible to it
 * before calling this — see `fields/services/fields-access-service.ts`'s own
 * `checkCanReadFieldsByTemplate`). */
export async function fetchFieldIdsReferencedByTemplate(db: SupabaseClient, templateId: string): Promise<string[]> {
  const { data: groups, error } = await db
    .from('field_groups')
    .select('fields')
    .eq('checklist_template_id', templateId);
  if (error) throw new Error(error.message);

  return [
    ...new Set(
      ((groups ?? []) as { fields: unknown }[]).flatMap(g =>
        (Array.isArray(g.fields) ? g.fields : []).map(fieldIdOf).filter((id): id is string => !!id),
      ),
    ),
  ];
}
