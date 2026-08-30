// `checkPermission` functions for the `challenge-comments` resource. See CLAUDE.md's
// "Authorization: app layer, not RLS" and `shared/authorize.ts`'s own header for why this moved.

import { ApiError } from '../../../shared/cors.ts';
import { ForbiddenError } from '../../../shared/authorize.ts';
import { fromChallengeComment } from '../../../dto/challenge-comments/challenge-comments-dto.ts';
import { fetchChallengeForPosting, fetchOwnedChallenge, fetchParticipantRow } from './challenge-comments-repository.ts';
import { body, type Ctx } from '../api/challenge-comments-context.ts';

/** Same "participant or owner" rule as challenge-participants' own checkCanReadRoster — see that
 * function's comment for why the old RLS policy's two clauses collapse into one query here. */
export async function checkCanReadComments({ db, userId, url }: Ctx): Promise<string> {
  const challengeId = url.searchParams.get('challengeId');
  if (!challengeId) throw new ApiError(400, 'Missing challengeId.');

  const [participant, ownedChallenge] = await Promise.all([
    fetchParticipantRow(db, challengeId, userId),
    fetchOwnedChallenge(db, challengeId, userId),
  ]);
  if (!participant && !ownedChallenge) throw new ForbiddenError();
  return challengeId;
}

export type PostAuthorization = { row: ReturnType<typeof fromChallengeComment> };

/** comments_enabled and membership are the real preconditions — this used to be "RLS's own
 * insert check only asserts authorship, these two are checked once here instead of as two more
 * correlated `exists` subqueries repeated on every insert"; same shape now, just the only check
 * left, since there's no RLS insert policy backing this up anymore either. */
export async function checkCanPostComment({ req, db, userId }: Ctx): Promise<PostAuthorization> {
  const entry = (await body(req)).comment;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing comment.');

  let row: ReturnType<typeof fromChallengeComment>;
  try {
    row = fromChallengeComment(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid comment.');
  }

  const challenge = await fetchChallengeForPosting(db, row.challenge_id as string);
  if (!challenge) throw new ApiError(400, 'Unknown challenge.');
  if (!challenge.comments_enabled) throw new ApiError(400, 'Comments are off for this challenge.');

  if (challenge.owner_id !== userId) {
    const participant = await fetchParticipantRow(db, row.challenge_id as string, userId);
    if (!participant) throw new ApiError(400, 'Join this challenge before commenting.');
  }

  return { row };
}
