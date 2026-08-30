// Route table for the `challenges` resource.

import { listChallengesHandler } from './list-challenges-handler.ts';
import { saveChallengeHandler } from './save-challenge-handler.ts';
import type { Ctx } from './challenges-context.ts';

export const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': listChallengesHandler,
  'POST /': saveChallengeHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('challenges');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
