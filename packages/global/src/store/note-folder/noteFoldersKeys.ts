// Central query-key factory for the `note-folders` resource — mirrors tagsKeys.ts's own shape.

export const noteFoldersKeys = {
  all: ['note-folders'] as const,
  /** "All mine" is the only scope any consumer needs today (see useNoteFolder.tsx) — still keyed
   * by `userId` so two identities on the same device never share a cache entry. */
  list: (userId: string | undefined) => [...noteFoldersKeys.all, userId] as const,
};
