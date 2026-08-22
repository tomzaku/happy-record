// Row mapping + validation for the `flags` resource. See
// packages/global/src/store/flag/useFlag.tsx for the client shape (`Flag`)
// this mirrors.

export function toFlag(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function fromFlag(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.name !== 'string' || !e.name) throw new Error('Missing name.');

  return {
    id: e.id,
    name: e.name,
    description: typeof e.description === 'string' ? e.description : null,
    created_at: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
