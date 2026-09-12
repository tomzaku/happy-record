// `DELETE /field-group-completions/:id` — idempotent (removing a missing completion is not an
// error), same as every other DELETE in this app. Always the caller's own row — unchecking a
// sub-task's plain checkbox.

import { deleteFieldGroupCompletion } from '../services/field-group-completions-service.ts';
import type { Ctx } from './field-group-completions-context.ts';

export async function deleteFieldGroupCompletionHandler(ctx: Ctx) {
  await deleteFieldGroupCompletion(ctx, ctx.id!);
  return { ok: true };
}
