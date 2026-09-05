import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { getChecklistLogs, type ChecklistLog, type GetChecklistLogsOptions } from './checklistLogsApi';
import { checklistLogsKeys } from './checklistLogsKeys';

export type UseChecklistLogsResult = {
  logs: ChecklistLog[];
  /** True while a page for the current `opts` (e.g. after `limit` grows for
   * scroll-triggered pagination) is in flight — `logs` still holds the
   * previous page's data during that window (see `placeholderData` below),
   * so a caller doing its own pagination can tell "still the old page" from
   * "this is the new page, safe to check its length" apart. */
  isFetching: boolean;
};

/**
 * The caller's own recent `checklist_logs` for the given filter — see checklistLogsApi.ts.
 * Read-only end to end (there's no client-writable path to this resource at all). Backed by React
 * Query rather than this app's usual `useSessionStore`/scoped-fetch pattern specifically because
 * this needs real cross-component invalidation: a write anywhere else on the page (creating a
 * task, checking/unchecking one, submitting a record, editing a field-group note) has to tell an
 * already-mounted reader like RecentHistory to refetch — see `checklistLogsKeys.ts` for the key
 * every one of those write paths invalidates against.
 */
export function useChecklistLogs(opts: GetChecklistLogsOptions): UseChecklistLogsResult {
  const { userId, ready } = useSession();

  const { data, isFetching } = useQuery({
    queryKey: checklistLogsKeys.list(opts, userId),
    queryFn: async () => (await getChecklistLogs(opts))?.checklistLogs ?? [],
    enabled: ready && !!userId,
    // A growing `limit` (RecentHistory's own infinite-scroll window) is a
    // new query key each time — without this, `data` would blink to
    // `undefined` for that new key while it's in flight, and the list would
    // visibly shrink before growing back once it resolves.
    placeholderData: keepPreviousData,
  });

  return { logs: data ?? [], isFetching };
}
