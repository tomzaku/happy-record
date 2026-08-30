// Business logic for `challenge-comments` that isn't a permission decision — see
// `challenge-comments-access-service.ts` for those. Thin pass-through to
// `repository/challenge-comments-repository.ts`; `api/` never reaches in there directly.

import { fetchComments, insertComment, removeComment } from '../repository/challenge-comments-repository.ts';
import type { Ctx } from '../api/challenge-comments-context.ts';

export function listComments({ db }: Ctx, challengeId: string, limit: number): Promise<Record<string, unknown>[]> {
  return fetchComments(db, challengeId, limit);
}

export function postComment({ db, userId }: Ctx, row: Record<string, unknown>): Promise<Record<string, unknown>> {
  return insertComment(db, userId, row);
}

export function deleteComment({ db, userId }: Ctx, id: string): Promise<void> {
  return removeComment(db, userId, id);
}
