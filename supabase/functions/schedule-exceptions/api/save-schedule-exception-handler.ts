// `POST /schedule-exceptions { checklistTemplateId, date, type }` — always the caller's own row
// (see services/schedule-exceptions-service.ts's own comment on why), nothing to compose a
// `checkPermission` around.

import { ApiError } from '../../../shared/cors.ts';
import { saveScheduleException } from '../services/schedule-exceptions-service.ts';
import { body, type Ctx } from './schedule-exceptions-context.ts';

export async function saveScheduleExceptionHandler(ctx: Ctx) {
  const { checklistTemplateId, date, type } = await body(ctx.req);
  if (typeof checklistTemplateId !== 'string' || !checklistTemplateId) {
    throw new ApiError(400, 'Missing checklistTemplateId.');
  }
  if (typeof date !== 'string' || !date) throw new ApiError(400, 'Missing date.');
  if (type !== 'DELETED' && type !== 'MODIFIED') throw new ApiError(400, 'Invalid type.');

  await saveScheduleException(ctx, { checklistTemplateId, date, type });
  return { ok: true };
}
