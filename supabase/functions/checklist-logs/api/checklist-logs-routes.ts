// Route table for the `checklist-logs` resource. Read-only — a single `GET /` route, no
// `/:id` wildcard needed (there's no single-resource-by-id lookup, only the filtered list).

import { listChecklistLogsHandler } from './list-checklist-logs-handler.ts';
import type { Ctx } from './checklist-logs-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'GET /': listChecklistLogsHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('checklist-logs');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
