// `checkPermission` for the `fields` resource's `?templateId=` branch. See CLAUDE.md's
// "Authorization: app layer, not RLS" and `shared/authorize.ts`'s own header for why this moved.

import type { Ctx } from '../api/fields-context.ts';

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

/** Every field id one checklist template's own field_groups reference, or `null` if this caller
 * may not see that template at all (nonexistent, or private and not public — the same "empty,
 * never an error" contract `checklist-templates`' own `?id=` branch and `field-groups`' own
 * scoped read both use). Own-templates-only was never the rule here — reachable at all only if
 * the template is genuinely `visibility: 'public'`, same as before this moved off RLS. */
export async function checkCanReadFieldsByTemplate({ db, url }: Ctx): Promise<string[] | null> {
  const templateId = url.searchParams.get('templateId')!;
  const { data: template, error: templateError } = await db
    .from('checklist_templates')
    .select('id')
    .eq('id', templateId)
    .eq('visibility', 'public')
    .maybeSingle();
  if (templateError) throw new Error(templateError.message);
  if (!template) return null;

  const { data: groups, error: groupsError } = await db
    .from('field_groups')
    .select('fields')
    .eq('checklist_template_id', templateId);
  if (groupsError) throw new Error(groupsError.message);

  return [
    ...new Set(
      ((groups ?? []) as { fields: unknown }[]).flatMap(g =>
        (Array.isArray(g.fields) ? g.fields : []).map(fieldIdOf).filter((id): id is string => !!id),
      ),
    ),
  ];
}
