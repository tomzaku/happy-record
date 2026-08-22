// Row mapping + validation for the `notes` resource. See
// packages/global/src/store/note/useNote.tsx for the client shape (`Note`)
// this mirrors.

export const MAX_LIMIT = 2000;

export function limitOf(v: string | null, fallback: number, max = MAX_LIMIT): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), max) : fallback;
}

export function toNote(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    fieldId: r.field_id as string,
    value: r.value as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    ...(r.folder_id ? { folderId: r.folder_id as string } : {}),
  };
}

export function fromNote(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.fieldId !== 'string' || !e.fieldId) throw new Error('Missing fieldId.');
  if (typeof e.value !== 'string') throw new Error('Missing value.');

  return {
    id: e.id,
    field_id: e.fieldId,
    value: e.value,
    folder_id: typeof e.folderId === 'string' ? e.folderId : null,
    created_at: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
