// `POST /tags { tag }` — always the caller's own (hardcoded `user_id` below).

import { ApiError } from '../../../shared/cors.ts';
import { fromTag } from '../../../dto/tags/tags-dto.ts';
import { saveTag } from '../repository/tags-repository.ts';
import { body, type Ctx } from './tags-context.ts';

export async function saveTagHandler({ req, db, userId }: Ctx) {
  const entry = (await body(req)).tag;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing tag.');

  let row: ReturnType<typeof fromTag>;
  try {
    row = fromTag(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid tag.');
  }

  await saveTag(db, userId, row);
  return { ok: true };
}
