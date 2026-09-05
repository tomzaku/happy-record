// Central query-key factory for the `notes` resource.
//
// Unlike tagsKeys/flagsKeys/noteFoldersKeys, there's only ever one scope here: `notes` has no
// single "fetch everything" call — getNote/getNotesByIds/getOwnFieldGroupNote/getAllNotes/
// searchNotes are all genuinely different fetches (by id, by ids, by field-group ownership, "all
// mine", a search query) that all merge their results into the *same* shared map, since a note
// fetched one way needs to be visible to every other read path too (see useNote.tsx's own
// `mergeFetched`). So there's one cache entry, kept in sync by several different imperative
// fetches, not several independently-fetched queries.

export const notesKeys = {
  all: ['notes'] as const,
  map: (userId: string | undefined) => [...notesKeys.all, userId] as const,
};
