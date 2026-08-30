// `POST /fields { field }` — always the caller's own, nothing to compose a `checkPermission`
// around.

import { ApiError } from '../../../shared/cors.ts';
import { fromRecordField } from '../../../dto/fields/fields-dto.ts';
import { saveField } from '../services/fields-service.ts';
import { body, type Ctx } from './fields-context.ts';

export async function saveFieldHandler(ctx: Ctx) {
  const entry = (await body(ctx.req)).field;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing field.');

  let row: ReturnType<typeof fromRecordField>;
  try {
    row = fromRecordField(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid field.');
  }

  await saveField(ctx, row);
  return { ok: true };
}
