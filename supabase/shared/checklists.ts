// Row mapping + validation for the `checklists` resource — one day's
// instance of a template. See
// packages/global/src/store/checklists/useChecklists.tsx for the client
// shape (`Checklist`) this mirrors.
//
// `clientOnly` never appears here: it marks a checklist the client
// synthesized for display (a scheduled day with no row yet) and is dropped
// before the real `addChecklist` call that reaches this resource.

export function toChecklist(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    title: r.title as string,
    checklistTemplateId: r.checklist_template_id as string,
    startedAt: r.started_at as string,
    endedAt: r.ended_at as string,
    ...(r.completed_at ? { completedAt: r.completed_at as string } : {}),
    updatedAt: r.updated_at as string,
  };
}

export function fromChecklist(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.checklistTemplateId !== 'string' || !e.checklistTemplateId) {
    throw new Error('Missing checklistTemplateId.');
  }
  if (typeof e.title !== 'string' || !e.title) throw new Error('Missing title.');
  if (typeof e.startedAt !== 'string' || !e.startedAt) throw new Error('Missing startedAt.');
  if (typeof e.endedAt !== 'string' || !e.endedAt) throw new Error('Missing endedAt.');

  return {
    id: e.id,
    checklist_template_id: e.checklistTemplateId,
    title: e.title,
    started_at: e.startedAt,
    ended_at: e.endedAt,
    completed_at: typeof e.completedAt === 'string' ? e.completedAt : null,
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
