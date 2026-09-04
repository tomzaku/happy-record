import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { getChecklistLogs, type ChecklistLog, type GetChecklistLogsOptions } from './checklistLogsApi';
import { checklistLogsKeys } from './checklistLogsKeys';

/**
 * The caller's own recent `checklist_logs` for the given filter — see checklistLogsApi.ts.
 * Read-only end to end (there's no client-writable path to this resource at all). Backed by React
 * Query rather than this app's usual `useSessionStore`/scoped-fetch pattern specifically because
 * this needs real cross-component invalidation: a write anywhere else on the page (creating a
 * task, checking/unchecking one, submitting a record, editing a field-group note) has to tell an
 * already-mounted reader like RecentHistory to refetch — see `checklistLogsKeys.ts` for the key
 * every one of those write paths invalidates against.
 */
export function useChecklistLogs(opts: GetChecklistLogsOptions): ChecklistLog[] {
  const { userId, ready } = useSession();

  const { data } = useQuery({
    queryKey: checklistLogsKeys.list(opts, userId),
    queryFn: async () => (await getChecklistLogs(opts))?.checklistLogs ?? [],
    enabled: ready && !!userId,
  });

  return data ?? [];
}
