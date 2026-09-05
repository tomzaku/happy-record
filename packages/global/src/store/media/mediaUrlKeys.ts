// Query-key factory for resolved media URLs — one entry per media id, not a shared list (unlike
// tagsKeys.ts and friends): each id's signed URL is its own independent, short-lived fetch, with
// nothing to merge across ids.

export const mediaUrlKeys = {
  all: ['media-url'] as const,
  byId: (id: string | undefined) => [...mediaUrlKeys.all, id] as const,
};
