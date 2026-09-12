// `POST /field-group-completions { fieldGroupCompletion }` — always the caller's own (hardcoded
// `user_id` in the repository), nothing to compose a `checkPermission` around. Upserts on
// (checklist_id, field_group_id, user_id) — marking the same group done twice for the same day
// just refreshes `completed_at`, doesn't create a second row.

import { ApiError } from '../../../shared/cors.ts';
import { fromFieldGroupCompletion } from '../../../dto/field-group-completions/field-group-completions-dto.ts';
import { saveFieldGroupCompletion } from '../services/field-group-completions-service.ts';
import { body, type Ctx } from './field-group-completions-context.ts';

export async function saveFieldGroupCompletionHandler(ctx: Ctx) {
  const entry = (await body(ctx.req)).fieldGroupCompletion;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing fieldGroupCompletion.');

  let row: ReturnType<typeof fromFieldGroupCompletion>;
  try {
    row = fromFieldGroupCompletion(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid fieldGroupCompletion.');
  }

  await saveFieldGroupCompletion(ctx, row);
  return { ok: true };
}
