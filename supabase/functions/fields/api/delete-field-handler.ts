// `DELETE /fields/:id` — always the caller's own row.

import type { Ctx } from './fields-context.ts';

export async function deleteFieldHandler({ db, userId, id }: Ctx) {
  const { error } = await db.from('fields').delete().eq('user_id', userId).eq('id', id!);
  if (error) throw new Error(error.message);
  return { ok: true };
}
