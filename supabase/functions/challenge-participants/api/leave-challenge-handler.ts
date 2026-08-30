// `DELETE /challenge-participants ?challengeId=` — leave. Idempotent (leaving a challenge you're
// not in is not an error). Always the caller's own row.

import { ApiError } from '../../../shared/cors.ts';
import { leaveChallenge } from '../services/challenge-participants-service.ts';
import type { Ctx } from './challenge-participants-context.ts';

export async function leaveChallengeHandler(ctx: Ctx) {
  const challengeId = ctx.url.searchParams.get('challengeId');
  if (!challengeId) throw new ApiError(400, 'Missing challengeId.');
  await leaveChallenge(ctx, challengeId);
  return { ok: true };
}
