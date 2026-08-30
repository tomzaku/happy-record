// `POST /challenge-comments { comment }` — `compose(checkCanPostComment, core)`.

import { compose } from '../../../shared/authorize.ts';
import { toChallengeComment } from '../../../dto/challenge-comments/challenge-comments-dto.ts';
import { checkCanPostComment, type PostAuthorization } from '../services/challenge-comments-access-service.ts';
import type { Ctx } from './challenge-comments-context.ts';

export const postChallengeCommentHandler = compose(checkCanPostComment, async ({ db, userId }: Ctx, { row }: PostAuthorization) => {
  const { data, error } = await db
    .from('challenge_comments')
    .insert({ user_id: userId, ...row })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return { comment: toChallengeComment(data as Record<string, unknown>) };
});
