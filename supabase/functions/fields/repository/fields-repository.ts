// Plain data access for `fields` — no authorization decisions here, just reads
// `fields-access-service.ts` builds on. See `notes/repository/notes-repository.ts` for the
// reference shape.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function fetchPublicTemplateId(db: SupabaseClient, templateId: string): Promise<string | null> {
  const { data, error } = await db
    .from('checklist_templates')
    .select('id')
    .eq('id', templateId)
    .eq('visibility', 'public')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

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
 * visibility decision (the caller already confirmed the template is public before calling this;
 * see checkCanReadFieldsByTemplate). */
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
