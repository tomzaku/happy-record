// Route table for the `field-groups` resource.

import { listFieldGroupsHandler } from './list-field-groups-handler.ts';
import { saveFieldGroupHandler } from './save-field-group-handler.ts';
import type { Ctx } from './field-groups-context.ts';

export const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': listFieldGroupsHandler,
  'POST /': saveFieldGroupHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('field-groups');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
