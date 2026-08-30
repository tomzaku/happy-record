// `PATCH /checklist-templates/:id { ...changes }` — edits only the fields the caller actually
// changed — a schedule/tag/flag edit sends a diff, not the whole template, so an in-flight edit
// to a field nobody touched here can't get clobbered by a stale client copy the way the save
// handler's full-row upsert would.
//
// `repeat` is deliberately not gated by the same ownership check as the rest of `patch` — see
// services/checklist-templates-service.ts's own `updateTemplate` comment: a challenge participant
// PATCHing `/checklist-templates/:id` (the owner's template) with `{ repeat: {...} }` sets their
// own personal reminder time without touching the owner's schedule or needing to own the template
// at all; sending anything else in the same call (title, tags, ...) still silently no-ops for
// them, since that part of the update only ever matches the owner's own row.

import { ApiError } from '../../../shared/cors.ts';
import { patchChecklistTemplate } from '../../../dto/checklist-templates/checklist-templates-dto.ts';
import { updateTemplate } from '../services/checklist-templates-service.ts';
import { body, type Ctx } from './checklist-templates-context.ts';

export async function updateChecklistTemplateHandler(ctx: Ctx) {
  if (!ctx.id) throw new ApiError(400, 'Missing id.');
  const params = await body(ctx.req);

  let patch: Record<string, unknown>;
  try {
    patch = patchChecklistTemplate(params);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid template.');
  }

  await updateTemplate(ctx, ctx.id, patch, { present: 'repeat' in params, value: params.repeat });
  return { ok: true };
}
