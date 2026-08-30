// Route table for the `checklists` resource. `/:id` is matched by `shared/router.ts`'s
// `matchRoute`.

import { listChecklistsHandler } from './list-checklists-handler.ts';
import { getChecklistHandler } from './get-checklist-handler.ts';
import { saveChecklistHandler } from './save-checklist-handler.ts';
import { deleteChecklistHandler } from './delete-checklist-handler.ts';
import type { Ctx } from './checklists-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'GET /': listChecklistsHandler,
  'GET /:id': getChecklistHandler,
  'POST /': saveChecklistHandler,
  'DELETE /:id': deleteChecklistHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('checklists');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
