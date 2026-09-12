// `GET /field-group-completions?checklistId=` — always the caller's own, a plain explicit filter
// with nothing to compose a `checkPermission` around (see CLAUDE.md's "Authorization: app layer,
// not RLS"). Scoped to one day's checklist, same shape `checklists`' own `GET /:id` route exists
// for — a caller here already knows the exact checklist it's asking about.

import { ApiError } from '../../../shared/cors.ts';
import { toFieldGroupCompletion } from '../../../dto/field-group-completions/field-group-completions-dto.ts';
import { listFieldGroupCompletions } from '../services/field-group-completions-service.ts';
import type { Ctx } from './field-group-completions-context.ts';

export async function listFieldGroupCompletionsHandler(ctx: Ctx) {
  const checklistId = ctx.url.searchParams.get('checklistId');
  if (!checklistId) throw new ApiError(400, 'Missing checklistId.');

  const rows = await listFieldGroupCompletions(ctx, checklistId);
  return { fieldGroupCompletions: rows.map(toFieldGroupCompletion) };
}
