// Query-key factory for the `checklist-templates` resource — normalized per-scope keys (not one
// shared cache entry): `all` is the bulk "every template I own or have joined a challenge for"
// fetch (checklist-templates-service.ts's `listOwnedAndJoinedTemplates`), `byId` is one template
// by its own id (own, or anyone's if `visibility: 'public'`) — used when `all` hasn't been fetched
// yet, or for a template `all` genuinely can't see (unshared after this caller joined it). See
// useChecklistTemplates.tsx's own `getChecklistTemplate`/`useChecklistTemplateDetail` for how a
// consumer picks between them, and fieldGroupsKeys.ts for the same shape one resource over.

export const checklistTemplatesKeys = {
  all: (userId: string | undefined) => ['checklist-templates', userId, 'all'] as const,
  byId: (id: string | undefined, userId: string | undefined) =>
    ['checklist-templates', userId, 'id', id] as const,
};
