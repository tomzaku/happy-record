import { useEffect } from 'react';
import { useSession } from './useSession';

/** A domain store's own module-level "have I synced, and for whom" cell — see below. */
export type SyncState = { current: string | undefined | null };

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

  useEffect(() => {
    if (!ready) return;
    if (syncState.current === userId) return;
    syncState.current = userId;
    sync().then(ok => {
      if (!ok) syncState.current = null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId]);
}
