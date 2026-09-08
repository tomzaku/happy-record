// `DELETE /schedule-exceptions/:id` — idempotent (removing a missing exception is not an error,
// same convention every DELETE route in this app follows). `:id` is the composite
// `<checklistTemplateId>:<date>` shape, never the underlying row id directly — see index.ts's own
// comment on why.

import { deleteScheduleException } from '../services/schedule-exceptions-service.ts';
import { parseCompositeId, type Ctx } from './schedule-exceptions-context.ts';

export async function deleteScheduleExceptionHandler(ctx: Ctx) {
  const { checklistTemplateId, date } = parseCompositeId(ctx.id!);
  await deleteScheduleException(ctx, { checklistTemplateId, date });
  return { ok: true };
}
