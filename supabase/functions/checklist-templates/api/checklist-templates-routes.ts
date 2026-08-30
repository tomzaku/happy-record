// Route table for the `checklist-templates` resource.

import { listChecklistTemplatesHandler } from './list-checklist-templates-handler.ts';
import { saveChecklistTemplateHandler } from './save-checklist-template-handler.ts';
import { updateChecklistTemplateHandler } from './update-checklist-template-handler.ts';
import { deleteChecklistTemplateHandler } from './delete-checklist-template-handler.ts';
import type { Ctx } from './checklist-templates-context.ts';

export const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': listChecklistTemplatesHandler,
  'POST /': saveChecklistTemplateHandler,
  'PATCH /': updateChecklistTemplateHandler,
  'DELETE /': deleteChecklistTemplateHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('checklist-templates');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
