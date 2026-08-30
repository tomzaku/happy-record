// `checkPermission` functions for the `challenge-comments` resource. See CLAUDE.md's
// "Authorization: app layer, not RLS" and `shared/authorize.ts`'s own header for why this moved.

import { ApiError } from '../../../shared/cors.ts';
import { ForbiddenError } from '../../../shared/authorize.ts';
import { fromChallengeComment } from '../../../dto/challenge-comments/challenge-comments-dto.ts';
import { body, type Ctx } from '../api/challenge-comments-context.ts';

/** Same "participant or owner" rule as challenge-participants' own checkCanReadRoster — see that
 * function's comment for why the old RLS policy's two clauses collapse into one query here. */
export async function checkCanReadComments({ db, userId, url }: Ctx): Promise<string> {
  const challengeId = url.searchParams.get('challengeId');
  if (!challengeId) throw new ApiError(400, 'Missing challengeId.');

  const [{ data: participant, error: participantError }, { data: ownedChallenge, error: ownedError }] = await Promise.all([
    db.from('challenge_participants').select('id').eq('challenge_id', challengeId).eq('user_id', userId).maybeSingle(),
    db.from('challenges').select('id').eq('id', challengeId).eq('owner_id', userId).maybeSingle(),
  ]);
  if (participantError) throw new Error(participantError.message);
  if (ownedError) throw new Error(ownedError.message);
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

  const { data: challenge, error: challengeError } = await db
    .from('challenges')
    .select('id, owner_id, comments_enabled')
    .eq('id', row.challenge_id)
    .maybeSingle();
  if (challengeError) throw new Error(challengeError.message);
  if (!challenge) throw new ApiError(400, 'Unknown challenge.');
  if (!challenge.comments_enabled) throw new ApiError(400, 'Comments are off for this challenge.');

  if (challenge.owner_id !== userId) {
    const { data: participant, error: participantError } = await db
      .from('challenge_participants')
      .select('id')
      .eq('challenge_id', row.challenge_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (participantError) throw new Error(participantError.message);
    if (!participant) throw new ApiError(400, 'Join this challenge before commenting.');
  }

  return { row };
}
