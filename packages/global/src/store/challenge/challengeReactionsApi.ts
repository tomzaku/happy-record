// Client for the `challenge-reactions` resource. See CLAUDE.md.

import { request } from '../../lib/api';

export type ChallengeReactionType = 'like' | 'dislike';
export type ChallengeReactionSummary = { likes: number; dislikes: number; myReaction: ChallengeReactionType | null };

/** Batch — one request for a whole browse grid rather than one per card. Silently drops any id
 * not visible to the caller (see the edge function's own listReactionSummaries). */
export function fetchReactionSummaries(challengeIds: string[]): Promise<{ reactions: Record<string, ChallengeReactionSummary> } | null> {
  if (!challengeIds.length) return Promise.resolve({ reactions: {} });
  return request.get('/challenge-reactions', { quiet: true, params: { challengeIds: challengeIds.join(',') } });
}

/** Not quiet — a like/dislike click is one the user should see fail, not one that silently no-ops. */
export function setChallengeReactionApi(challengeId: string, reaction: ChallengeReactionType): Promise<{ ok: true }> {
  return request.post('/challenge-reactions', { challengeId, reaction });
}

export function clearChallengeReactionApi(challengeId: string): Promise<{ ok: true } | null> {
  return request.delete('/challenge-reactions', { quiet: true, params: { challengeId } });
}
