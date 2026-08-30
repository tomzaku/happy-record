// Route table for the `fields` resource.

import { listFieldsHandler } from './list-fields-handler.ts';
import { saveFieldHandler } from './save-field-handler.ts';
import { deleteFieldHandler } from './delete-field-handler.ts';
import type { Ctx } from './fields-context.ts';

export const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': listFieldsHandler,
  'POST /': saveFieldHandler,
  'DELETE /': deleteFieldHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('fields');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
