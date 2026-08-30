// `DELETE /tags/:id` — idempotent (removing a missing tag is not an error). Always the caller's
// own row.

import { deleteTag } from '../services/tags-service.ts';
import type { Ctx } from './tags-context.ts';

export async function deleteTagHandler(ctx: Ctx) {
  await deleteTag(ctx, ctx.id!);
  return { ok: true };
}
