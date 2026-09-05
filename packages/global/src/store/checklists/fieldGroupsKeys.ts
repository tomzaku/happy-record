// Query-key factory for the `field-groups` resource.
//
// Same shape as notesKeys.ts/checklistRecordsKeys.ts: getFieldGroups/getFieldGroupsByTemplateId
// (one template's own groups) and ensureAllFieldGroupsFetched ("all mine") are genuinely
// different fetches that all merge into the *same* shared cache entry per identity, since a
// group resolved one way needs to be visible to every other read path too (see
// useFieldGroups.tsx's own `mergeFieldGroups`).

export const fieldGroupsKeys = {
  all: ['field-groups'] as const,
  map: (userId: string | undefined) => [...fieldGroupsKeys.all, userId] as const,
};
