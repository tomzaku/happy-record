// Query-key factory for the `checklist-templates` resource.
//
// Same shape as notesKeys.ts/fieldGroupsKeys.ts: ensureAllTemplatesFetched ("all mine") and
// getChecklistTemplate (a single id — including a shared/joined template a challenge participant
// doesn't own) are genuinely different fetches that all merge into the *same* shared cache entry
// per identity, since a template resolved one way needs to be visible to every other read path
// too (see useChecklistTemplates.tsx's own `mergeTemplates`).

export const checklistTemplatesKeys = {
  all: ['checklist-templates'] as const,
  map: (userId: string | undefined) => [...checklistTemplatesKeys.all, userId] as const,
};
