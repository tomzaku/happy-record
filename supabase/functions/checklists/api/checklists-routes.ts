// Route table for the `checklists` resource.

import { listChecklistsHandler } from './list-checklists-handler.ts';
import { saveChecklistHandler } from './save-checklist-handler.ts';
import { deleteChecklistHandler } from './delete-checklist-handler.ts';
import type { Ctx } from './checklists-context.ts';

export const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': listChecklistsHandler,
  'POST /': saveChecklistHandler,
  'DELETE /': deleteChecklistHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('checklists');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
