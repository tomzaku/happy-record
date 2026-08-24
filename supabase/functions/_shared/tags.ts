// Row mapping + validation for the `tags` resource. See
// packages/global/src/store/tags/useTags.tsx for the client shape (`Tag`)
// this mirrors.

export function toTag(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    name: r.name as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function fromTag(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.name !== 'string' || !e.name.trim()) throw new Error('Missing name.');

  return {
    id: e.id,
    name: e.name.trim(),
    created_at: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
