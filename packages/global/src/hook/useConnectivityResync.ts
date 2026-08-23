import { useEffect } from 'react';
import { flushQueuedWrites } from '../lib/api';
import { bumpResyncTick } from '../lib/resyncTick';
import { resetChecklistRecordSync } from '../store/checklist-record/useChecklistRecord';

/**
 * Mount once, near the app root (next to `useSession()`). Everything else
 * in this app's offline story already handles "nothing came back yet" by
 * just staying on local data — this hook is the other half: what happens
 * once connectivity actually returns.
 *
 * On `online`: replay whatever writes queued while this device was offline
 * (lib/writeQueue.ts), let `checklist-records` re-check whatever ranges
 * it's already fetched this page load, and bump the shared resync tick so
 * every other store (`useSyncOncePerIdentity`) re-syncs too — not just a
 * store whose last attempt failed, but one that already succeeded and may
 * simply be behind on whatever changed elsewhere while this device was
 * offline.
 *
 * Also fires once on mount if the device is already online — covers a tab
 * that was reopened already-connected with a queued write or a stale sync
 * left over from before it closed; the `online` event itself only fires on
 * a transition, never on load.
 */
export function useConnectivityResync() {
  useEffect(() => {
    const onReconnect = () => {
      flushQueuedWrites();
      resetChecklistRecordSync();
      bumpResyncTick();
    };
    window.addEventListener('online', onReconnect);
    if (navigator.onLine) onReconnect();
    return () => window.removeEventListener('online', onReconnect);
  }, []);
}
