// `DELETE /challenge-comments/:id` — author-only (already self-scoped by `.eq('user_id',
// userId)` below), no moderation yet.

import type { Ctx } from './challenge-comments-context.ts';

export async function deleteChallengeCommentHandler({ db, userId, id }: Ctx) {
  const { error } = await db.from('challenge_comments').delete().eq('user_id', userId).eq('id', id!);
  if (error) throw new Error(error.message);
  return { ok: true };
}
