// Row mapping + validation for the `field-group-completions` resource. See
// packages/global/src/store/checklists/useFieldGroupCompletions.tsx for the client shape
// (`FieldGroupCompletion`) this mirrors.

export function toFieldGroupCompletion(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    checklistId: r.checklist_id as string,
    fieldGroupId: r.field_group_id as string,
    completedAt: r.completed_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function fromFieldGroupCompletion(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.checklistId !== 'string' || !e.checklistId) throw new Error('Missing checklistId.');
  if (typeof e.fieldGroupId !== 'string' || !e.fieldGroupId) throw new Error('Missing fieldGroupId.');

  return {
    id: e.id,
    checklist_id: e.checklistId,
    field_group_id: e.fieldGroupId,
    completed_at: typeof e.completedAt === 'string' ? e.completedAt : new Date().toISOString(),
    // Postgres only fills the default on insert, not update — an upsert has to set this
    // explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
