// `DELETE /checklists ?id=` — idempotent, always the caller's own row.

import { ApiError } from '../../../shared/cors.ts';
import type { Ctx } from './checklists-context.ts';

export async function deleteChecklistHandler({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (!id) throw new ApiError(400, 'Missing id.');
  const { error } = await db.from('checklists').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
