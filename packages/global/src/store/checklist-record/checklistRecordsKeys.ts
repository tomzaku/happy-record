// Central query-key factory for the `checklist-records` resource.
//
// Same shape as notesKeys.ts: there's no single "fetch everything" call — getChecklistRecords is
// called with many different (checklistTemplateId, rangeDate, fieldIds, limit) scopes, each its
// own background fetch (deduped by `syncedRanges` below, same as before), all merging into the
// *same* shared cache entry so a record fetched under one scope is visible to every other reader
// too. One cache entry per identity, not one per scope.

export const checklistRecordsKeys = {
  all: ['checklist-records'] as const,
  store: (userId: string | undefined) => [...checklistRecordsKeys.all, userId] as const,
};
