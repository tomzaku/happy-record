import { useMemo } from 'react';

/**
 * `useMemo(() => selector(...args), [selector, ...args])`, spelled so the
 * selector itself can't be left out of the deps array by hand — the actual
 * root cause every time a component has gone stale after a background sync
 * landed new data (see CLAUDE.md's `ChecklistToday.desktop.tsx` example, and
 * the same bug class found again across detail-task-page/note-manager-page-ui).
 *
 * Use for a value read from a store's own function — `getChecklistByGivingDate`,
 * `getChecklistDetail`, `getChecklistTemplate`, `getAllRecordFields`, ... —
 * instead of snapshotting the result into local `useState` from a
 * `useEffect` with a hand-picked dependency list. A selector that isn't
 * itself wrapped in `useCallback` by its owning hook (a plain closure with a
 * new identity every render) still works here — it just recomputes every
 * render instead of memoizing, which is correct, only not free.
 */
export function useSyncedSelector<Args extends unknown[], R>(
  selector: (...args: Args) => R,
  ...args: Args
): R {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => selector(...args), [selector, ...args]);
}
