// `DELETE /challenge-comments/:id` — author-only (already self-scoped), no moderation yet.

import { deleteComment } from '../services/challenge-comments-service.ts';
import type { Ctx } from './challenge-comments-context.ts';

export async function deleteChallengeCommentHandler(ctx: Ctx) {
  await deleteComment(ctx, ctx.id!);
  return { ok: true };
}
