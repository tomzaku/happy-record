// `checkPermission` for the `fields` resource's `?templateId=` branch. See CLAUDE.md's
// "Authorization: app layer, not RLS" and `shared/authorize.ts`'s own header for why this moved.

import { fetchFieldIdsReferencedByTemplate, fetchPublicTemplateId } from '../repository/fields-repository.ts';
import type { Ctx } from '../api/fields-context.ts';

/** Every field id one checklist template's own field_groups reference, or `null` if this caller
 * may not see that template at all (nonexistent, or private and not public — the same "empty,
 * never an error" contract `checklist-templates`' own `GET /:id` route and `field-groups`' own
 * scoped read both use). Own-templates-only was never the rule here — reachable at all only if
 * the template is genuinely `visibility: 'public'`, same as before this moved off RLS. */
export async function checkCanReadFieldsByTemplate({ db, url }: Ctx): Promise<string[] | null> {
  const templateId = url.searchParams.get('templateId')!;
  const publicTemplateId = await fetchPublicTemplateId(db, templateId);
  if (!publicTemplateId) return null;
  return fetchFieldIdsReferencedByTemplate(db, templateId);
}
