// Route table for the `fields` resource. `/:id` is matched by `shared/router.ts`'s `matchRoute`.

import { listFieldsHandler } from './list-fields-handler.ts';
import { saveFieldHandler } from './save-field-handler.ts';
import { deleteFieldHandler } from './delete-field-handler.ts';
import type { Ctx } from './fields-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'GET /': listFieldsHandler,
  'POST /': saveFieldHandler,
  'DELETE /:id': deleteFieldHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('fields');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
