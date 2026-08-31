// `PATCH /field-groups/:id { repeat }` — a challenge participant's own override of one group's
// schedule, distinct from the owner's (see save-field-group-handler.ts's full-row upsert, which
// is owner-only in practice — the client never lets a non-owner reach it). Deliberately narrow:
// this route only ever touches `repeat`, never the rest of the group's own row.

import { ApiError } from '../../../shared/cors.ts';
import { updateMyFieldGroupRepeat } from '../services/field-groups-service.ts';
import { body, type Ctx } from './field-groups-context.ts';

export async function updateFieldGroupRepeatHandler(ctx: Ctx) {
  if (!ctx.id) throw new ApiError(400, 'Missing id.');
  const params = await body(ctx.req);
  await updateMyFieldGroupRepeat(ctx, ctx.id, params.repeat);
  return { ok: true };
}
