// `DELETE /challenge-comments ?id=` — author-only (already self-scoped by `.eq('user_id',
// userId)` below), no moderation yet.

import { ApiError } from '../../../shared/cors.ts';
import type { Ctx } from './challenge-comments-context.ts';

export async function deleteChallengeCommentHandler({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (!id) throw new ApiError(400, 'Missing id.');
  const { error } = await db.from('challenge_comments').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
