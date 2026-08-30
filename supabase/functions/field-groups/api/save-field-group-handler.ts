// `POST /field-groups { fieldGroup }` — full-row upsert (create, edit, set/clear noteId, or set
// archivedAt for a soft delete — there's no hard-delete route). Always the caller's own.

import { ApiError } from '../../../shared/cors.ts';
import { fromFieldGroup } from '../../../dto/field-groups/field-groups-dto.ts';
import { saveFieldGroup } from '../services/field-groups-service.ts';
import { body, type Ctx } from './field-groups-context.ts';

export async function saveFieldGroupHandler(ctx: Ctx) {
  const entry = (await body(ctx.req)).fieldGroup;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing fieldGroup.');

  let row: ReturnType<typeof fromFieldGroup>;
  try {
    row = fromFieldGroup(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid fieldGroup.');
  }

  await saveFieldGroup(ctx, row, (entry as Record<string, unknown>).repeat);
  return { ok: true };
}
