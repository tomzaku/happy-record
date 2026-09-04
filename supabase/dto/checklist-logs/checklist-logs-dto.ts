// Row mapping for the `checklist_logs` resource — pure, no I/O (the write itself lives in
// `supabase/shared/checklistLogs.ts`, since it's called from several other resources' own
// services, not just this one). Rows are immutable once written: no `updated_at`, and the id is
// generated server-side (`crypto.randomUUID()`, same idiom as `media-service.ts`) rather than
// client-supplied, since every write here originates from server code, not a client payload.

export type ChecklistLogEntry = {
  checklistTemplateId: string;
  checklistId?: string;
  action: 'create' | 'update' | 'delete';
  detail?: 'submitted' | 'completed' | 'uncompleted' | 'note_updated';
  metadata?: Record<string, unknown>;
};

export function toChecklistLog(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    checklistTemplateId: r.checklist_template_id as string,
    ...(r.checklist_id ? { checklistId: r.checklist_id as string } : {}),
    action: r.action as ChecklistLogEntry['action'],
    ...(r.detail ? { detail: r.detail as ChecklistLogEntry['detail'] } : {}),
    ...(r.metadata ? { metadata: r.metadata as Record<string, unknown> } : {}),
    createdAt: r.created_at as string,
  };
}

export function fromChecklistLogEntry(e: ChecklistLogEntry, userId: string): Record<string, unknown> {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    checklist_template_id: e.checklistTemplateId,
    checklist_id: e.checklistId ?? null,
    action: e.action,
    detail: e.detail ?? null,
    metadata: e.metadata ?? null,
  };
}
