// Route table for the `tags` resource. `/:id` is matched by `shared/router.ts`'s `matchRoute`.

import { listTagsHandler } from './list-tags-handler.ts';
import { saveTagHandler } from './save-tag-handler.ts';
import { deleteTagHandler } from './delete-tag-handler.ts';
import type { Ctx } from './tags-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'GET /': listTagsHandler,
  'POST /': saveTagHandler,
  'DELETE /:id': deleteTagHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('tags');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
