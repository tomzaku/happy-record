// `POST /checklist-templates { template }` — full-row upsert, always the caller's own.

import { ApiError } from '../../../shared/cors.ts';
import { fromChecklistTemplate } from '../../../dto/checklist-templates/checklist-templates-dto.ts';
import { saveTemplate } from '../services/checklist-templates-service.ts';
import { body, type Ctx } from './checklist-templates-context.ts';

export async function saveChecklistTemplateHandler(ctx: Ctx) {
  const entry = (await body(ctx.req)).template;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing template.');

  let row: ReturnType<typeof fromChecklistTemplate>;
  try {
    row = fromChecklistTemplate(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid template.');
  }

  await saveTemplate(ctx, row, (entry as Record<string, unknown>).repeat);
  return { ok: true };
}
