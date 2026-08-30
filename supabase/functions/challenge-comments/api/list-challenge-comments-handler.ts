// `GET /challenge-comments ?challengeId=&limit=` — `compose(checkCanReadComments, core)`.

import { compose } from '../../../shared/authorize.ts';
import { toChallengeComment } from '../../../dto/challenge-comments/challenge-comments-dto.ts';
import { checkCanReadComments } from '../services/challenge-comments-access-service.ts';
import { listComments } from '../services/challenge-comments-service.ts';
import type { Ctx } from './challenge-comments-context.ts';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export const listChallengeCommentsHandler = compose(checkCanReadComments, async (ctx: Ctx, challengeId: string) => {
  const limit = Math.min(Number(ctx.url.searchParams.get('limit')) || DEFAULT_LIMIT, MAX_LIMIT);
  const rows = await listComments(ctx, challengeId, limit);
  return { comments: rows.map(toChallengeComment) };
});
