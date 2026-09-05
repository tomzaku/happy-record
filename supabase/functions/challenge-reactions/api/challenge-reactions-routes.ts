// Route table for the `challenge-reactions` resource. No `/:id` route — every route addresses a
// challenge via `challengeId`, not this resource's own row id.

import { listChallengeReactionsHandler } from './list-challenge-reactions-handler.ts';
import { setChallengeReactionHandler } from './set-challenge-reaction-handler.ts';
import { clearChallengeReactionHandler } from './clear-challenge-reaction-handler.ts';
import type { Ctx } from './challenge-reactions-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'GET /': listChallengeReactionsHandler,
  'POST /': setChallengeReactionHandler,
  'DELETE /': clearChallengeReactionHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('challenge-reactions');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
