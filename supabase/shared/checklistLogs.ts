// The write path for `checklist_logs` — genuinely shared across multiple resources' own
// `services/` layers (checklist-templates, checklists, checklist-records, notes), doing real I/O
// (an insert), so this belongs in `shared/` rather than one resource's own service, same category
// as `repeats.ts`. `checklist-logs`'s own `services/checklist-logs-service.ts` only ever reads
// (its `GET /` route) — it never calls this.
//
// Never throws: a logging failure must not break the primary user action it's attached to (the
// template/checklist/record/note write has already committed by the time this runs, so there's
// nothing to roll back anyway) — same "degrade, don't break" rule as every other best-effort spot
// in this app.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { fromChecklistLogEntry, type ChecklistLogEntry } from '../dto/checklist-logs/checklist-logs-dto.ts';

export async function recordChecklistLog(db: SupabaseClient, userId: string, entry: ChecklistLogEntry): Promise<void> {
  try {
    const { error } = await db.from('checklist_logs').insert(fromChecklistLogEntry(entry, userId));
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('[checklistLogs]', err);
  }
}
