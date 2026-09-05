// Query-key factory for the `challenge-reactions` resource — one shared cache entry per identity,
// same shape as challengesKeys.ts.

export const challengeReactionsKeys = {
  all: ['challenge-reactions'] as const,
  map: (userId: string | undefined) => [...challengeReactionsKeys.all, userId] as const,
};
