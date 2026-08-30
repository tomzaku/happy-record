// `POST /flags { flag }` — always the caller's own (hardcoded `user_id` below), nothing to
// compose a `checkPermission` around.

import { ApiError } from '../../../shared/cors.ts';
import { fromFlag } from '../model/flags-model.ts';
import { body, type Ctx } from './flags-context.ts';

export async function saveFlagHandler({ req, db, userId }: Ctx) {
  const entry = (await body(req)).flag;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing flag.');

  let row: ReturnType<typeof fromFlag>;
  try {
    row = fromFlag(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid flag.');
  }

  const { error } = await db.from('flags').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
  return { ok: true };
}
