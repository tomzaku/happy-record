// `POST /checklist-templates { template }` — full-row upsert, always the caller's own (hardcoded
// `user_id` below).

import { ApiError } from '../../../shared/cors.ts';
import { saveRepeat } from '../../../shared/repeats.ts';
import { fromChecklistTemplate } from '../../../dto/checklist-templates/checklist-templates-dto.ts';
import { body, type Ctx } from './checklist-templates-context.ts';

export async function saveChecklistTemplateHandler({ req, db, userId }: Ctx) {
  const entry = (await body(req)).template;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing template.');

  let row: ReturnType<typeof fromChecklistTemplate>;
  try {
    row = fromChecklistTemplate(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid template.');
  }

  const { error } = await db.from('checklist_templates').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
  // After the template row exists — repeats.checklist_template_id is a real FK, so the parent has
  // to be there first.
  await saveRepeat(db, (entry as Record<string, unknown>).repeat, { userId, checklistTemplateId: row.id });
  return { ok: true };
}
