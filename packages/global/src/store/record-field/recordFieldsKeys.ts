// Central query-key factory for the `fields` resource.
//
// Same shape as notesKeys.ts/checklistRecordsKeys.ts: there's no single "fetch everything" call
// — getAllRecordFields ("all mine + public"), getRecordFieldsByTemplateId (a shared/joined
// template's own fields), and getRecordFieldsByIds (an exact id set) are all genuinely different
// fetches that merge into the *same* shared cache entry, since a field resolved one way needs to
// be visible to every other read path too (see useRecordField.tsx's own `mergeRecordFields`). One
// cache entry per identity, not one per scope.

export const recordFieldsKeys = {
  all: ['fields'] as const,
  map: (userId: string | undefined) => [...recordFieldsKeys.all, userId] as const,
};
