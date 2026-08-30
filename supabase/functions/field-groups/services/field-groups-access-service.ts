// `checkPermission` for the `field-groups` resource. See CLAUDE.md's "Authorization: app layer,
// not RLS" and `shared/authorize.ts`'s own header for why this moved.

import { fetchTemplateVisibility } from '../repository/field-groups-repository.ts';
import type { Ctx } from '../api/field-groups-context.ts';

export type TemplateGroupsAuthorization = { checklistTemplateId: string; visible: boolean; isPublic: boolean };

/** Whether the caller may see *this* template's field groups at all — own template, or a
 * `visibility: 'public'` one. A `false` result isn't a 403: the old RLS policy just silently
 * filtered every row out for a template that doesn't exist or isn't visible, the same "empty,
 * never an error" contract `checklist-templates`' own `GET /:id` route documents — so the core
 * handler returns `{ fieldGroups: [] }` rather than throwing. `isPublic` is kept separate from
 * `visible` (which is also true for a private template that's simply mine) — it's what
 * `withRepeats` needs to decide whether a row other than the caller's own may be surfaced. */
export async function checkCanReadFieldGroupsByTemplate({ db, userId, url }: Ctx): Promise<TemplateGroupsAuthorization> {
  const checklistTemplateId = url.searchParams.get('checklistTemplateId')!;
  const template = await fetchTemplateVisibility(db, checklistTemplateId);
  const isPublic = template?.visibility === 'public';
  const visible = !!template && (template.user_id === userId || isPublic);
  return { checklistTemplateId, visible, isPublic };
}
