// Route table for the `challenge-comments` resource.

import { listChallengeCommentsHandler } from './list-challenge-comments-handler.ts';
import { postChallengeCommentHandler } from './post-challenge-comment-handler.ts';
import { deleteChallengeCommentHandler } from './delete-challenge-comment-handler.ts';
import type { Ctx } from './challenge-comments-context.ts';

export const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': listChallengeCommentsHandler,
  'POST /': postChallengeCommentHandler,
  'DELETE /': deleteChallengeCommentHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('challenge-comments');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
