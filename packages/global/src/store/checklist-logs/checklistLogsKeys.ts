// Central query-key factory for the `checklist_logs` resource. Every reader (useChecklistLogs)
// and every write path that should invalidate it (useChecklistTemplates, useChecklists,
// useChecklistRecord, useFieldGroupNote) imports this instead of hand-rolling its own key array,
// so a key can never drift between what a reader subscribes to and what a writer invalidates.

import type { GetChecklistLogsOptions } from './checklistLogsApi';

export const checklistLogsKeys = {
  /** Matches every checklist_logs query, any scope/user — pass to `invalidateQueries` after a
   * write so every mounted reader (any filter, any signed-in user) refetches. */
  all: ['checklist-logs'] as const,
  /** One exact scope, further narrowed by `userId` since two identities on the same device must
   * never share a cache entry. */
  list: (opts: GetChecklistLogsOptions, userId: string | undefined) =>
    [...checklistLogsKeys.all, userId, opts] as const,
};
