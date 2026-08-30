// `DELETE /challenge-participants ?challengeId=` — leave. Idempotent (leaving a challenge you're
// not in is not an error). Always the caller's own row.

import { ApiError } from '../../../shared/cors.ts';
import type { Ctx } from './challenge-participants-context.ts';

export async function leaveChallengeHandler({ url, db, userId }: Ctx) {
  const challengeId = url.searchParams.get('challengeId');
  if (!challengeId) throw new ApiError(400, 'Missing challengeId.');
  const { error } = await db
    .from('challenge_participants')
    .delete()
    .eq('user_id', userId)
    .eq('challenge_id', challengeId);
  if (error) throw new Error(error.message);
  return { ok: true };
}
