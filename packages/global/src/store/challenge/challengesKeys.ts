// Query-key factory for the `challenges` resource — keyed by templateId (not "all mine": every
// consumer only ever needs the one challenge for a template it already knows), all merged into
// one shared cache entry per identity, same shape as tagsKeys.ts and friends.

export const challengesKeys = {
  all: ['challenges'] as const,
  map: (userId: string | undefined) => [...challengesKeys.all, userId] as const,
};
