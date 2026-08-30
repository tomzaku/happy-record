// `POST /fields { field }` — always the caller's own (hardcoded `user_id` below).

import { ApiError } from '../../../shared/cors.ts';
import { fromRecordField } from '../../../dto/fields/fields-dto.ts';
import { body, type Ctx } from './fields-context.ts';

export async function saveFieldHandler({ req, db, userId }: Ctx) {
  const entry = (await body(req)).field;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing field.');

  let row: ReturnType<typeof fromRecordField>;
  try {
    row = fromRecordField(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid field.');
  }

  const { error } = await db.from('fields').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
  return { ok: true };
}
