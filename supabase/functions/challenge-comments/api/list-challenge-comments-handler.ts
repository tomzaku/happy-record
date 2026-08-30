// `GET /challenge-comments ?challengeId=&limit=` — `compose(checkCanReadComments, core)`.

import { compose } from '../../../shared/authorize.ts';
import { toChallengeComment } from '../../../dto/challenge-comments/challenge-comments-dto.ts';
import { checkCanReadComments } from '../services/challenge-comments-access-service.ts';
import type { Ctx } from './challenge-comments-context.ts';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export const listChallengeCommentsHandler = compose(checkCanReadComments, async ({ db, url }: Ctx, challengeId: string) => {
  const limit = Math.min(Number(url.searchParams.get('limit')) || DEFAULT_LIMIT, MAX_LIMIT);
  const { data, error } = await db
    .from('challenge_comments')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('created_at')
    .limit(limit);
  if (error) throw new Error(error.message);
  return { comments: ((data ?? []) as Record<string, unknown>[]).map(toChallengeComment) };
});
