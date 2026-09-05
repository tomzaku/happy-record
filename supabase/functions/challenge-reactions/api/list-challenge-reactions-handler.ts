// `GET /challenge-reactions ?challengeIds=a,b,c` — batch counts + the caller's own reaction, one
// request for a whole browse grid rather than one per card. No `compose` — this is a list read
// that narrows silently (see services/challenge-reactions-service.ts's own listReactionSummaries),
// same no-permission-check shape `challenges`' own `listMyChallenges` uses.

import { listReactionSummaries } from '../services/challenge-reactions-service.ts';
import type { Ctx } from './challenge-reactions-context.ts';

const MAX_IDS = 200;

export async function listChallengeReactionsHandler(ctx: Ctx) {
  const raw = ctx.url.searchParams.get('challengeIds') ?? '';
  const challengeIds = [...new Set(raw.split(',').map(s => s.trim()).filter(Boolean))].slice(0, MAX_IDS);
  return { reactions: await listReactionSummaries(ctx, challengeIds) };
}
