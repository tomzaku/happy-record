// `DELETE /checklists/:id` — idempotent, always the caller's own row.

import { deleteChecklist } from '../services/checklists-service.ts';
import type { Ctx } from './checklists-context.ts';

export async function deleteChecklistHandler(ctx: Ctx) {
  await deleteChecklist(ctx, ctx.id!);
  return { ok: true };
}
