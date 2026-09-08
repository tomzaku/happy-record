// `POST /checklist-templates { template, checklist? }` — full-row upsert, always the caller's
// own. `checklist` is optional — only a one-off task's own creation flow sends one (see
// createTaskUtil.ts), seeding that task's single Checklist instance in this same request instead
// of a separate `POST /checklists` racing this row's own FK afterward.

import { ApiError } from '../../../shared/cors.ts';
import { fromChecklistTemplate } from '../../../dto/checklist-templates/checklist-templates-dto.ts';
import { fromChecklist } from '../../../dto/checklists/checklists-dto.ts';
import { saveTemplate } from '../services/checklist-templates-service.ts';
import { body, type Ctx } from './checklist-templates-context.ts';

export async function saveChecklistTemplateHandler(ctx: Ctx) {
  const parsed = await body(ctx.req);
  const entry = parsed.template;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing template.');

  let row: ReturnType<typeof fromChecklistTemplate>;
  try {
    row = fromChecklistTemplate(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid template.');
  }

  let checklistRow: ReturnType<typeof fromChecklist> | undefined;
  if (parsed.checklist && typeof parsed.checklist === 'object') {
    try {
      checklistRow = fromChecklist(parsed.checklist as Record<string, unknown>);
    } catch (err) {
      throw new ApiError(400, err instanceof Error ? err.message : 'Invalid checklist.');
    }
    // The client always targets this same template (it generated both ids itself before this
    // request — see createTaskUtil.ts) — never trust a mismatched value from the body over the
    // template actually being written in this same call.
    checklistRow.checklist_template_id = row.id;
  }

  await saveTemplate(ctx, row, (entry as Record<string, unknown>).repeat, checklistRow);
  return { ok: true };
}
