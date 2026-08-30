// Route table for the `me` resource — a single read-only route, no self-serve upgrade so no
// other method exists here.

import { getMeHandler } from './get-me-handler.ts';
import type { Ctx } from './me-context.ts';

export const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': getMeHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('me');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
