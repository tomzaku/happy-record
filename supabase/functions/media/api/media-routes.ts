// Route table for the `media` resource. `/:id` is matched by `shared/router.ts`'s `matchRoute`.
// The `/cron/cleanup` path is deliberately NOT in here — it's a different trust model
// (service-to-service, secret-header authorized) handled directly in index.ts, before requireUser
// even runs. See cron/media-cleanup-handler.ts.

import { requestUploadHandler } from './request-upload-handler.ts';
import { getMediaHandler } from './get-media-handler.ts';
import { deleteMediaHandler } from './delete-media-handler.ts';
import type { Ctx } from './media-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'POST /': requestUploadHandler,
  'GET /:id': getMediaHandler,
  'DELETE /:id': deleteMediaHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('media');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
