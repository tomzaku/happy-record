// Row mapping + validation for the `field-groups` resource (table: `field_groups`). See
// packages/global/src/store/checklists/useFieldGroups.tsx for the client shape (`FieldGroup`)
// this mirrors, and 20260829010000_notes_note_id_ownership.sql for why this is its own table now
// instead of jsonb on `checklist_templates`.
//
// `fields` (the group's own field-ids-plus-overrides list) and `repeat`/`activeTabs` round-trip
// as given — config the server never filters on, not relational data (see the migration's own
// comment on why only identity/note/ordering are real columns).

export function toFieldGroup(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    checklistTemplateId: r.checklist_template_id as string,
    title: r.title as string,
    fields: (r.fields as unknown[]) ?? [],
    position: (r.position as number) ?? 0,
    ...(r.note_id ? { noteId: r.note_id as string } : {}),
    ...(r.default_tab !== null && r.default_tab !== undefined ? { defaultTab: r.default_tab as number } : {}),
    ...(r.active_tabs ? { activeTabs: r.active_tabs as number[] } : {}),
    ...(r.collapse_default !== null && r.collapse_default !== undefined
      ? { collapseDefault: r.collapse_default as boolean }
      : {}),
    ...(r.repeat ? { repeat: r.repeat as Record<string, unknown> } : {}),
    ...(r.archived_at ? { archivedAt: r.archived_at as string } : {}),
    updatedAt: r.updated_at as string,
  };
}

export function fromFieldGroup(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.checklistTemplateId !== 'string' || !e.checklistTemplateId) {
    throw new Error('Missing checklistTemplateId.');
  }
  if (typeof e.title !== 'string' || !e.title) throw new Error('Missing title.');

  return {
    id: e.id,
    checklist_template_id: e.checklistTemplateId,
    title: e.title,
    fields: Array.isArray(e.fields) ? e.fields : [],
    position: typeof e.position === 'number' ? e.position : 0,
    note_id: typeof e.noteId === 'string' ? e.noteId : null,
    default_tab: typeof e.defaultTab === 'number' ? e.defaultTab : null,
    active_tabs: Array.isArray(e.activeTabs) ? e.activeTabs : null,
    collapse_default: typeof e.collapseDefault === 'boolean' ? e.collapseDefault : null,
    repeat: e.repeat && typeof e.repeat === 'object' ? e.repeat : null,
    // `null` (not `undefined`) restores an archived group — see FieldGroup.archivedAt's own
    // comment client-side (useFieldGroups.tsx) for why that distinction matters.
    archived_at: typeof e.archivedAt === 'string' ? e.archivedAt : null,
    updated_at: new Date().toISOString(),
  };
}
