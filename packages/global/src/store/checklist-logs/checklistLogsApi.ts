// Client for the `checklist-logs` resource. See CLAUDE.md — nothing else should touch that table.
// Read-only: there's no save/remove here because the server never accepts a write to this
// resource from a client at all (every row is logged from trusted server code — see
// `supabase/shared/checklistLogs.ts`). Quiet, since there's nothing local to fall back to yet —
// no hook/store wraps this either, since there's no UI consumer to shape one around; add
// `useChecklistLogs.tsx` once a real screen needs one.

import { request } from '../../lib/api';

export type ChecklistLog = {
  id: string;
  checklistTemplateId: string;
  checklistId?: string;
  action: 'create' | 'update' | 'delete';
  detail?: 'submitted' | 'completed' | 'note_updated';
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type GetChecklistLogsOptions = {
  checklistTemplateId?: string;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  limit?: number;
};

export function getChecklistLogs(opts: GetChecklistLogsOptions = {}): Promise<{ checklistLogs: ChecklistLog[] } | null> {
  return request.get('/checklist-logs', { params: opts, quiet: true });
}
