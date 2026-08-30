// `GET /fields` — one route, two shapes depending on the query string.

import { compose } from '../../../shared/authorize.ts';
import { toRecordField } from '../../../dto/fields/fields-dto.ts';
import { checkCanReadFieldsByTemplate } from '../services/fields-access-service.ts';
import { listFieldsByIds, listOwnOrPublicFields } from '../services/fields-service.ts';
import type { Ctx } from './fields-context.ts';

/**
 * `?templateId=` — every field one checklist template's own field_groups reference — the
 * shared-template page's own read, replacing the old "sharing flips every referenced field to
 * `visibility: 'public'`" design (see useCreateChecklistTemplateApi.tsx's own comment for why
 * that changed: a field becoming public makes it usable in *anyone's* checklist, not just
 * visible to whoever the share link went to). The fields themselves stay `visibility: 'private'`
 * in the table — reading them by this pre-validated, narrow id set (rather than the caller's own
 * owner-or-public visibility rule below) is a deliberate, narrowly-scoped bypass of that, not a
 * blanket "read any field" grant; this was the only place in this app that reached for the
 * service role before every resource started moving onto it (see `shared/authorize.ts`).
 */
const getFieldsByTemplate = compose(checkCanReadFieldsByTemplate, async (ctx: Ctx, fieldIds: string[] | null) => {
  if (!fieldIds || !fieldIds.length) return { fields: [] };
  const rows = await listFieldsByIds(ctx, fieldIds);
  return { fields: rows.map(toRecordField) };
});

/** No `templateId` (optionally `?ids=`) — own fields plus anyone's public ones — already an
 * explicit rule, not an implicit RLS filter, so it needs no `checkPermission` of its own. */
async function listMine(ctx: Ctx) {
  const ids = (ctx.url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
  const rows = await listOwnOrPublicFields(ctx, ids);
  return { fields: rows.map(toRecordField) };
}

export async function listFieldsHandler(ctx: Ctx) {
  return ctx.url.searchParams.get('templateId') ? getFieldsByTemplate(ctx) : listMine(ctx);
}
