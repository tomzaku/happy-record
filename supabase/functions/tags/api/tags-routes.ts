// Route table for the `tags` resource.

import { listTagsHandler } from './list-tags-handler.ts';
import { saveTagHandler } from './save-tag-handler.ts';
import { deleteTagHandler } from './delete-tag-handler.ts';
import type { Ctx } from './tags-context.ts';

export const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': listTagsHandler,
  'POST /': saveTagHandler,
  'DELETE /': deleteTagHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('tags');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
