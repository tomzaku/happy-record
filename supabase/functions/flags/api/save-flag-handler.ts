// `POST /flags { flag }` — always the caller's own (hardcoded `user_id` in the repository),
// nothing to compose a `checkPermission` around.

import { ApiError } from '../../../shared/cors.ts';
import { fromFlag } from '../../../dto/flags/flags-dto.ts';
import { saveFlag } from '../services/flags-service.ts';
import { body, type Ctx } from './flags-context.ts';

export async function saveFlagHandler(ctx: Ctx) {
  const entry = (await body(ctx.req)).flag;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing flag.');

  let row: ReturnType<typeof fromFlag>;
  try {
    row = fromFlag(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid flag.');
  }

  await saveFlag(ctx, row);
  return { ok: true };
}
