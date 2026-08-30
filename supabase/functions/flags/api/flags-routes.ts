// Route table for the `flags` resource. `/:id` is matched by `shared/router.ts`'s `matchRoute`.

import { listFlagsHandler } from './list-flags-handler.ts';
import { saveFlagHandler } from './save-flag-handler.ts';
import { deleteFlagHandler } from './delete-flag-handler.ts';
import type { Ctx } from './flags-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'GET /': listFlagsHandler,
  'POST /': saveFlagHandler,
  'DELETE /:id': deleteFlagHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('flags');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
