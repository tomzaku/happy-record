// Central query-key factory for the `flags` resource — mirrors tagsKeys.ts's own shape.

export const flagsKeys = {
  all: ['flags'] as const,
  /** "All mine" is the only scope any consumer needs today (see useFlag.tsx) — still keyed by
   * `userId` so two identities on the same device never share a cache entry. */
  list: (userId: string | undefined) => [...flagsKeys.all, userId] as const,
};
