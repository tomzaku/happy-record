import React from 'react';
import { useSession } from '../../hook/useSession';
import { getChecklistLogs, type ChecklistLog, type GetChecklistLogsOptions } from './checklistLogsApi';

/**
 * The caller's own recent `checklist_logs` for the given filter — see checklistLogsApi.ts.
 * Read-only end to end (there's no client-writable path to this resource at all), so unlike every
 * other domain hook here this doesn't back onto a shared `useSessionStore` slot: nothing else in
 * the app reads the same scope today, and RecentHistory's own two mounted instances (different
 * `limit`s) already get distinct scope keys, so a plain per-instance `useState` is correct without
 * needing cross-instance dedup or a reactive cache. No live push, same as every other resource
 * here — a scope already fetched this mount stays as-is until a remount re-triggers it.
 */
export function useChecklistLogs(opts: GetChecklistLogsOptions): ChecklistLog[] {
  const { userId, ready } = useSession();
  const [logs, setLogs] = React.useState<ChecklistLog[]>([]);
  const key = JSON.stringify([userId, opts.checklistTemplateId, opts.create, opts.update, opts.delete, opts.limit]);

  React.useEffect(() => {
    if (!ready || !userId) return;
    let cancelled = false;
    getChecklistLogs(opts).then(result => {
      if (!cancelled && result) setLogs(result.checklistLogs);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  return logs;
}
