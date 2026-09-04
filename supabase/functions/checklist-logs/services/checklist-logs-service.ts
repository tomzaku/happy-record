// Business logic for `checklist-logs` — no real cross-user visibility decision here (every row is
// already own-row-only), so this stays a thin pass-through, but `api/` still never queries the DB
// directly. This resource never writes — see `supabase/shared/checklistLogs.ts` for that, called
// directly from the other resources whose own actions get logged.

import { fetchChecklistLogs, type ChecklistLogsQuery } from '../repository/checklist-logs-repository.ts';
import type { Ctx } from '../api/checklist-logs-context.ts';

export function listChecklistLogs({ db, userId }: Ctx, query: ChecklistLogsQuery): Promise<Record<string, unknown>[]> {
  return fetchChecklistLogs(db, userId, query);
}
