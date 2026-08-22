// Row mapping + validation for the `note-folders` resource. See
// packages/global/src/store/note-folder/useNoteFolder.tsx for the client
// shape (`NoteFolder`) this mirrors.

export function toNoteFolder(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) ?? undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function fromNoteFolder(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.title !== 'string' || !e.title) throw new Error('Missing title.');

  return {
    id: e.id,
    title: e.title,
    description: typeof e.description === 'string' ? e.description : null,
    created_at: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
