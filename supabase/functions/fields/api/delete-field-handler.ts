// `DELETE /fields/:id` — always the caller's own row.

import { deleteField } from '../services/fields-service.ts';
import type { Ctx } from './fields-context.ts';

export async function deleteFieldHandler(ctx: Ctx) {
  await deleteField(ctx, ctx.id!);
  return { ok: true };
}
