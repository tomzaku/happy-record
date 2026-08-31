// Route table for the `field-groups` resource. `/:id` is matched by `shared/router.ts`'s
// `matchRoute`.

import { listFieldGroupsHandler } from './list-field-groups-handler.ts';
import { saveFieldGroupHandler } from './save-field-group-handler.ts';
import { updateFieldGroupRepeatHandler } from './update-field-group-repeat-handler.ts';
import type { Ctx } from './field-groups-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'GET /': listFieldGroupsHandler,
  'POST /': saveFieldGroupHandler,
  'PATCH /:id': updateFieldGroupRepeatHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('field-groups');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
