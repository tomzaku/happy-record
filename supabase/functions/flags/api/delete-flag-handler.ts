// `DELETE /flags/:id` — idempotent (removing a missing flag is not an error). Templates in it
// just lose their flag (on delete set null). Always the caller's own row.

import type { Ctx } from './flags-context.ts';

export async function deleteFlagHandler({ db, userId, id }: Ctx) {
  const { error } = await db.from('flags').delete().eq('user_id', userId).eq('id', id!);
  if (error) throw new Error(error.message);
  return { ok: true };
}
