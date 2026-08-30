// `POST /challenge-comments { comment }` — `compose(checkCanPostComment, core)`.

import { compose } from '../../../shared/authorize.ts';
import { toChallengeComment } from '../../../dto/challenge-comments/challenge-comments-dto.ts';
import { checkCanPostComment, type PostAuthorization } from '../services/challenge-comments-access-service.ts';
import { postComment } from '../services/challenge-comments-service.ts';
import type { Ctx } from './challenge-comments-context.ts';

export const postChallengeCommentHandler = compose(checkCanPostComment, async (ctx: Ctx, { row }: PostAuthorization) => {
  const data = await postComment(ctx, row);
  return { comment: toChallengeComment(data) };
});
