// `POST /schedule-exceptions { checklistTemplateId, occurrenceStartedAt, type, timezone?,
// overrideStartedAt? }` — always the caller's own row (see services/schedule-exceptions-service.ts's
// own comment on why), nothing to compose a `checkPermission` around.

import { ApiError } from '../../../shared/cors.ts';
import { saveScheduleException } from '../services/schedule-exceptions-service.ts';
import { body, type Ctx } from './schedule-exceptions-context.ts';

export async function saveScheduleExceptionHandler(ctx: Ctx) {
  const { checklistTemplateId, occurrenceStartedAt, type, overrideStartedAt, timezone } = await body(ctx.req);
  if (typeof checklistTemplateId !== 'string' || !checklistTemplateId) {
    throw new ApiError(400, 'Missing checklistTemplateId.');
  }
  if (typeof occurrenceStartedAt !== 'string' || !occurrenceStartedAt) {
    throw new ApiError(400, 'Missing occurrenceStartedAt.');
  }
  if (type !== 'DELETED' && type !== 'MODIFIED') throw new ApiError(400, 'Invalid type.');
  // The table's own CHECK enforces this pairing too (see the migration), but rejecting it here
  // gives a real 400 with a real message instead of a raw constraint-violation 500 from Postgres.
  if (type === 'MODIFIED' && (typeof overrideStartedAt !== 'string' || !overrideStartedAt)) {
    throw new ApiError(400, 'Missing overrideStartedAt for a MODIFIED exception.');
  }

  await saveScheduleException(ctx, {
    checklistTemplateId,
    occurrenceStartedAt,
    type,
    ...(typeof timezone === 'string' && timezone ? { timezone } : {}),
    ...(type === 'MODIFIED' ? { overrideStartedAt: overrideStartedAt as string } : {}),
  });
  return { ok: true };
}
