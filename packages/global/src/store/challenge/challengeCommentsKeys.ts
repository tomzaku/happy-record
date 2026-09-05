// Query-key factory for the `challenge-comments` resource — keyed by challengeId, one shared
// cache entry per identity, same shape as challengesKeys.ts.

export const challengeCommentsKeys = {
  all: ['challenge-comments'] as const,
  map: (userId: string | undefined) => [...challengeCommentsKeys.all, userId] as const,
};
