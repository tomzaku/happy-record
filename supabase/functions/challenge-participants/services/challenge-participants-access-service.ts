// `checkPermission` functions for the `challenge-participants` resource. See CLAUDE.md's
// "Authorization: app layer, not RLS" and `shared/authorize.ts`'s own header for why this moved.

import { ApiError } from '../../../shared/cors.ts';
import { ForbiddenError } from '../../../shared/authorize.ts';
import { fetchOwnedChallenge, fetchParticipantRow } from '../repository/challenge-participants-repository.ts';
import type { Ctx } from '../api/challenge-participants-context.ts';

/** The old RLS policy's "self OR fellow participant" pair collapse into one check here — both
 * meant "is there already a challenge_participants row for (this challenge, this caller)," the
 * fellow-participant half just phrased as its own security-definer function purely to dodge
 * Postgres's self-referencing-RLS-policy recursion error, which doesn't apply to a plain query
 * run from here. */
export async function checkCanReadRoster({ db, userId, url }: Ctx): Promise<string> {
  const challengeId = url.searchParams.get('challengeId');
  if (!challengeId) throw new ApiError(400, 'Missing challengeId.');

  const [selfRow, ownedChallenge] = await Promise.all([
    fetchParticipantRow(db, challengeId, userId),
    fetchOwnedChallenge(db, challengeId, userId),
  ]);
  if (!selfRow && !ownedChallenge) throw new ForbiddenError();
  return challengeId;
}
