// `DELETE /checklist-templates/:id` — always the caller's own row.

import { deleteTemplate } from '../services/checklist-templates-service.ts';
import type { Ctx } from './checklist-templates-context.ts';

export async function deleteChecklistTemplateHandler(ctx: Ctx) {
  await deleteTemplate(ctx, ctx.id!);
  return { ok: true };
}
