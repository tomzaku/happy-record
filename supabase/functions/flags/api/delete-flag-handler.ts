// `DELETE /flags/:id` — idempotent (removing a missing flag is not an error). Templates in it
// just lose their flag (on delete set null). Always the caller's own row.

import { deleteFlag } from '../repository/flags-repository.ts';
import type { Ctx } from './flags-context.ts';

export async function deleteFlagHandler({ db, userId, id }: Ctx) {
  await deleteFlag(db, userId, id!);
  return { ok: true };
}
