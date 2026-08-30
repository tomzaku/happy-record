// `GET /field-groups` — one route, two shapes depending on the query string.

import { compose } from '../../../shared/authorize.ts';
import { checkCanReadFieldGroupsByTemplate, type TemplateGroupsAuthorization } from '../services/field-groups-access-service.ts';
import { listFieldGroupsByTemplate, listMyFieldGroups } from '../services/field-groups-service.ts';
import type { Ctx } from './field-groups-context.ts';

/** `?checklistTemplateId=` — one template's own groups, the caller's own or anyone's if that
 * exact template is `visibility: 'public'` (the shared-template page is what actually relies on
 * this). */
const getGroupsByTemplate = compose(
  checkCanReadFieldGroupsByTemplate,
  async (ctx: Ctx, { checklistTemplateId, visible, isPublic }: TemplateGroupsAuthorization) => {
    if (!visible) return { fieldGroups: [] };
    return { fieldGroups: await listFieldGroupsByTemplate(ctx, checklistTemplateId, isPublic) };
  },
);

/** No query — every group across all of the caller's templates, the home page's own
 * schedule-matching. Always the caller's own only, a plain explicit filter with nothing to
 * compose a `checkPermission` around. */
async function listMine(ctx: Ctx) {
  return { fieldGroups: await listMyFieldGroups(ctx) };
}

export async function listFieldGroupsHandler(ctx: Ctx) {
  return ctx.url.searchParams.get('checklistTemplateId') ? getGroupsByTemplate(ctx) : listMine(ctx);
}
