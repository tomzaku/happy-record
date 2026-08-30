// Route table for the `challenge-participants` resource.

import { listChallengeParticipantsHandler } from './list-challenge-participants-handler.ts';
import { joinChallengeHandler } from './join-challenge-handler.ts';
import { leaveChallengeHandler } from './leave-challenge-handler.ts';
import type { Ctx } from './challenge-participants-context.ts';

export const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': listChallengeParticipantsHandler,
  'POST /': joinChallengeHandler,
  'DELETE /': leaveChallengeHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('challenge-participants');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
