// Row mapping + validation for the `notes` resource. See
// packages/global/src/store/note/useNote.tsx for the client shape (`Note`) this mirrors.
// `owner_type`/`owner_id` (which field or field group owns this note) are set once at creation
// and immutable after — see 20260829020000_notes_title_search_owner.sql.

export const OWNER_TYPES = ['field', 'field_group'] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];
const isOwnerType = (v: unknown): v is OwnerType => (OWNER_TYPES as readonly string[]).includes(v as string);

export function toNote(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    value: r.value as string,
    title: (r.title as string) ?? '',
    searchText: (r.search_text as string) ?? '',
    ownerType: r.owner_type as OwnerType,
    ownerId: r.owner_id as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    ...(r.folder_id ? { folderId: r.folder_id as string } : {}),
    ...(r.checklist_template_id ? { checklistTemplateId: r.checklist_template_id as string } : {}),
  };
}

export function fromNote(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.value !== 'string') throw new Error('Missing value.');
  if (!isOwnerType(e.ownerType)) throw new Error('Invalid ownerType.');
  if (typeof e.ownerId !== 'string' || !e.ownerId) throw new Error('Missing ownerId.');
  const checklistTemplateId = typeof e.checklistTemplateId === 'string' ? e.checklistTemplateId : null;
  if (e.ownerType === 'field_group' && !checklistTemplateId) {
    throw new Error('A field_group-owned note needs checklistTemplateId.');
  }

  return {
    id: e.id,
    value: e.value,
    title: typeof e.title === 'string' ? e.title : '',
    search_text: typeof e.searchText === 'string' ? e.searchText : '',
    owner_type: e.ownerType,
    owner_id: e.ownerId,
    checklist_template_id: checklistTemplateId,
    folder_id: typeof e.folderId === 'string' ? e.folderId : null,
    created_at: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
