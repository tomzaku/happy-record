// `DELETE /checklists/:id` — idempotent, always the caller's own row.

import type { Ctx } from './checklists-context.ts';

export async function deleteChecklistHandler({ id, db, userId }: Ctx) {
  const { error } = await db.from('checklists').delete().eq('user_id', userId).eq('id', id!);
  if (error) throw new Error(error.message);
  return { ok: true };
}
