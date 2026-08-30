// `DELETE /tags/:id` — idempotent, always the caller's own row.

import type { Ctx } from './tags-context.ts';

export async function deleteTagHandler({ db, userId, id }: Ctx) {
  const { error } = await db.from('tags').delete().eq('user_id', userId).eq('id', id!);
  if (error) throw new Error(error.message);
  return { ok: true };
}
