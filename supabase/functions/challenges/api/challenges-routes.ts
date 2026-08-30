// Route table for the `challenges` resource. `/:id` is matched by `shared/router.ts`'s
// `matchRoute`.

import { listChallengesHandler } from './list-challenges-handler.ts';
import { getChallengeDashboardHandler } from './get-challenge-dashboard-handler.ts';
import { saveChallengeHandler } from './save-challenge-handler.ts';
import type { Ctx } from './challenges-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'GET /': listChallengesHandler,
  'GET /:id': getChallengeDashboardHandler,
  'POST /': saveChallengeHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('challenges');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
