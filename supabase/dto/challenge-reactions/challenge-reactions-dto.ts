// Row mapping + validation for the `challenge-reactions` resource. See
// packages/global/src/store/challenge/useChallengeReactions.tsx for the client shape this
// mirrors.

export const REACTION_TYPES = ['like', 'dislike'] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export function toChallengeReaction(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    challengeId: r.challenge_id as string,
    userId: r.user_id as string,
    reaction: r.reaction as ReactionType,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

/** Only the wire value needs validating — `id`/`challenge_id`/`user_id` are computed server-side
 * from the caller's own session (see repository/challenge-reactions-repository.ts's own `rowId`),
 * never client-supplied, since a reaction's identity is entirely `(challengeId, userId)`. */
export function toReactionType(value: unknown): ReactionType {
  if (value !== 'like' && value !== 'dislike') throw new Error('Invalid reaction — must be "like" or "dislike".');
  return value;
}
