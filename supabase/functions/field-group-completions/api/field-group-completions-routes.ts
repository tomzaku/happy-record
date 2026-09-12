// Route table for the `field-group-completions` resource. `/:id` is matched by
// `shared/router.ts`'s `matchRoute`.

import { listFieldGroupCompletionsHandler } from './list-field-group-completions-handler.ts';
import { saveFieldGroupCompletionHandler } from './save-field-group-completion-handler.ts';
import { deleteFieldGroupCompletionHandler } from './delete-field-group-completion-handler.ts';
import type { Ctx } from './field-group-completions-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'GET /': listFieldGroupCompletionsHandler,
  'POST /': saveFieldGroupCompletionHandler,
  'DELETE /:id': deleteFieldGroupCompletionHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('field-group-completions');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
