// Central query-key factory for the `tags` resource — mirrors checklistLogsKeys.ts's own shape.

export const tagsKeys = {
  all: ['tags'] as const,
  /** "All mine" is the only scope any consumer needs today (see useTags.tsx) — still keyed by
   * `userId` so two identities on the same device never share a cache entry. */
  list: (userId: string | undefined) => [...tagsKeys.all, userId] as const,
};
