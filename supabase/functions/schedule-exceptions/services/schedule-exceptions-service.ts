// Business logic for `schedule-exceptions` — no real cross-user visibility decision (see
// index.ts's own comment on why there's no checkPermission), but `api/` still never queries the
// DB or `shared/scheduleExceptions.ts` directly: it always goes through this layer, same
// "services/ exists even for a thin pass-through" shape `tags-service.ts` already uses.
//
// The one thing this layer actually does: derive the real `schedules` row id from `ctx.userId` —
// never accept one from the client (see index.ts's own comment on why).

import { rowId } from '../../../shared/schedules.ts';
import { saveException, deleteException, type ExceptionType } from '../../../shared/scheduleExceptions.ts';
import type { Ctx } from '../api/schedule-exceptions-context.ts';

export function saveScheduleException(
  { db, userId }: Ctx,
  args: { checklistTemplateId: string; date: string; type: ExceptionType },
): Promise<void> {
  const scheduleId = rowId({ userId, checklistTemplateId: args.checklistTemplateId });
  return saveException(db, scheduleId, userId, { date: args.date, type: args.type });
}

export function deleteScheduleException(
  { db, userId }: Ctx,
  args: { checklistTemplateId: string; date: string },
): Promise<void> {
  const scheduleId = rowId({ userId, checklistTemplateId: args.checklistTemplateId });
  return deleteException(db, scheduleId, args.date);
}
