// `DELETE /flags/:id` — idempotent (removing a missing flag is not an error). Templates in it
// just lose their flag (on delete set null). Always the caller's own row.

import { deleteFlag } from '../services/flags-service.ts';
import type { Ctx } from './flags-context.ts';

export async function deleteFlagHandler(ctx: Ctx) {
  await deleteFlag(ctx, ctx.id!);
  return { ok: true };
}
