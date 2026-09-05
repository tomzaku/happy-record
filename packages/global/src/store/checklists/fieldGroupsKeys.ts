// Query-key factory for the `field-groups` resource — normalized per-scope keys (not one shared
// cache entry): `all` is the bulk "every group across every one of my templates" fetch,
// `byTemplate` is one template's own groups (used both for a single-template read and as the
// bypass that resolves a joined challenge's owner-authored groups, which `all` never covers —
// see useFieldGroups.tsx's own `getFieldGroups`/`useFieldGroupsForTemplate`).

export const fieldGroupsKeys = {
  all: (userId: string | undefined) => ['field-groups', userId, 'all'] as const,
  byTemplate: (checklistTemplateId: string | undefined, userId: string | undefined) =>
    ['field-groups', userId, 'template', checklistTemplateId] as const,
};
