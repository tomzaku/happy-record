// `POST /tags { tag }` — always the caller's own, nothing to compose a `checkPermission` around.

import { ApiError } from '../../../shared/cors.ts';
import { fromTag } from '../../../dto/tags/tags-dto.ts';
import { saveTag } from '../services/tags-service.ts';
import { body, type Ctx } from './tags-context.ts';

export async function saveTagHandler(ctx: Ctx) {
  const entry = (await body(ctx.req)).tag;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing tag.');

  let row: ReturnType<typeof fromTag>;
  try {
    row = fromTag(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid tag.');
  }

  await saveTag(ctx, row);
  return { ok: true };
}
