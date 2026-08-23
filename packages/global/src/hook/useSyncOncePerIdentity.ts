import { useEffect, useSyncExternalStore } from 'react';
import { useSession } from './useSession';
import { getResyncTick, subscribeResyncTick } from '../lib/resyncTick';

/**
 * A domain store's own module-level "have I synced, and for whom" cell —
 * see below. `lastResyncTick` is the same idea for `bumpResyncTick`
 * (useConnectivityResync.ts, on `online`): recorded on the *shared* cell,
 * not per component instance, so when several mounted components use the
 * same store (e.g. `ChecklistToday` and `WeeklyCalendarVertical` both
 * calling `useChecklist()`), only the first one to notice a given tick
 * actually re-syncs — the rest see it's already been handled. Per-instance
 * tracking (a `useRef` in the hook below) would lose that guarantee: every
 * mounted instance would independently fire its own redundant fetch on
 * every reconnect, exactly what this shared cell exists to prevent for the
 * identity-change case already.
 */
export type SyncState = { current: string | undefined | null; lastResyncTick?: number };

/**
 * Every domain store's initial fetch used to guard on a plain
 * `let xSynced = false`, fired unconditionally on first mount. That's wrong
 * on two counts this fixes:
 *
 * 1. It could fire before the session was ready at all — a fetch that
 *    landed on this device's *first* transient session (whatever
 *    `ensureSession()` handed back in that instant) rather than waiting for
 *    the real one to settle.
 * 2. Once fired, it never fired again for the rest of the page's life, even
 *    if the identity underneath then changed (anonymous → signed in with
 *    Google). A fetch that happened to land a beat before that switch was
 *    permanently marked "done," so the store never found out its actual
 *    identity had real data waiting on the server — the cause of
 *    checklist-templates (and every other domain store) staying empty after
 *    signing in without a full page reload in between.
 *
 * `syncState` is a store's own module-level cell (not component state) so
 * every mounted instance of that store shares one fetch instead of each
 * racing to start its own — same property the old boolean flags had.
 * `sync` should resolve to `true` on success (marks this identity synced)
 * or `false` to allow a retry next render for the same identity (offline, a
 * quiet 401, etc.).
 */
export function useSyncOncePerIdentity(syncState: SyncState, sync: () => Promise<boolean>) {
  const { userId, ready } = useSession();
  // Bumped by useConnectivityResync.ts on `online` — a store that already
  // synced successfully for this identity still needs to catch up on
  // whatever changed elsewhere while this device was offline, not just a
  // store whose last attempt failed (that case is already covered below by
  // `syncState.current` getting reset to `null` on failure).
  const resyncTick = useSyncExternalStore(subscribeResyncTick, getResyncTick);

  useEffect(() => {
    if (!ready) return;
    const identityChanged = syncState.current !== userId;
    const forcedResync = (syncState.lastResyncTick ?? 0) !== resyncTick;
    if (!identityChanged && !forcedResync) return;
    syncState.current = userId;
    syncState.lastResyncTick = resyncTick;
    sync().then(ok => {
      if (!ok) syncState.current = null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, resyncTick]);
}
