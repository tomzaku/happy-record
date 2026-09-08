// Route table for the `schedule-exceptions` resource. `/:id` is matched by `shared/router.ts`'s
// `matchRoute`.

import { saveScheduleExceptionHandler } from './save-schedule-exception-handler.ts';
import { deleteScheduleExceptionHandler } from './delete-schedule-exception-handler.ts';
import type { Ctx } from './schedule-exceptions-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'POST /': saveScheduleExceptionHandler,
  'DELETE /:id': deleteScheduleExceptionHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('schedule-exceptions');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
