// Route table for the `challenge-comments` resource. `/:id` is matched by `shared/router.ts`'s
// `matchRoute`.

import { listChallengeCommentsHandler } from './list-challenge-comments-handler.ts';
import { postChallengeCommentHandler } from './post-challenge-comment-handler.ts';
import { deleteChallengeCommentHandler } from './delete-challenge-comment-handler.ts';
import type { Ctx } from './challenge-comments-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'GET /': listChallengeCommentsHandler,
  'POST /': postChallengeCommentHandler,
  'DELETE /:id': deleteChallengeCommentHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('challenge-comments');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
