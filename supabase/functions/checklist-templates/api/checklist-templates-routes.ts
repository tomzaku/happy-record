// Route table for the `checklist-templates` resource. `/:id` is matched by `shared/router.ts`'s
// `matchRoute`.

import { listChecklistTemplatesHandler } from './list-checklist-templates-handler.ts';
import { getChecklistTemplateHandler } from './get-checklist-template-handler.ts';
import { saveChecklistTemplateHandler } from './save-checklist-template-handler.ts';
import { updateChecklistTemplateHandler } from './update-checklist-template-handler.ts';
import { deleteChecklistTemplateHandler } from './delete-checklist-template-handler.ts';
import type { Ctx } from './checklist-templates-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'GET /': listChecklistTemplatesHandler,
  'GET /:id': getChecklistTemplateHandler,
  'POST /': saveChecklistTemplateHandler,
  'PATCH /:id': updateChecklistTemplateHandler,
  'DELETE /:id': deleteChecklistTemplateHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('checklist-templates');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
