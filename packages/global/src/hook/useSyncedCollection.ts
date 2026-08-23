import { useLocalStorage } from './useLocalStorage';
import { useSyncOncePerIdentity, type SyncState } from './useSyncOncePerIdentity';

/**
 * THE pattern for a domain store backed by both `localStorage` and a
 * Supabase edge function (`fields`, `notes`, `note-folders`, `flags`,
 * `checklists` — see CLAUDE.md's "Data access" section for the resources
 * themselves). Every store that fits this shape should use this hook
 * directly instead of re-implementing it — five stores each hand-writing
 * their own version of the same merge loop is exactly how the last several
 * bugs got introduced: `checklist_template`'s got the "seed demo data
 * before the fetch resolves" bug, `ChecklistToday`'s consumer got a stale
 * dependency array, and each store's own copy of "one flag for the whole
 * page load" all shared the same identity-change blind spot. One tested
 * implementation instead of N subtly-different ones closes all of those at
 * once, and closes the same class of bug in whatever store gets added next.
 *
 * The contract, spelled out:
 *
 * 1. **Local `useLocalStorage` state is always the source of truth for
 *    rendering.** Every read in this app renders instantly from it, online
 *    or offline — nothing ever blocks on the network.
 * 2. **Sync is a one-time reconciliation per signed-in identity**, not per
 *    page load and not per component mount — `useSyncOncePerIdentity`
 *    tracks "have I already reconciled this identity," keyed on the actual
 *    `userId`, so switching identity (signing in, signing out) triggers a
 *    fresh reconciliation instead of the store staying stuck on whatever
 *    the first identity's fetch happened to return.
 * 3. **The merge is last-write-wins by `updatedAt`, per id** — an id this
 *    device has never seen is always added; an id it already has is only
 *    replaced by the fetched copy if the fetched copy's `updatedAt` is
 *    strictly newer. Every write in this app — local or server-side — sets
 *    `updatedAt` to the moment it happened (see CLAUDE.md's "every table
 *    gets `updated_at`" convention, and each store's `addX`/`updateX`
 *    functions on the client side), so this is comparing two real
 *    timestamps, not guessing. This is what makes an edit on one device
 *    actually show up on another the next time that other device syncs
 *    (a plain "fill in what's missing" merge — what this hook did before —
 *    never revisits an id once it has one, so an edit elsewhere would never
 *    arrive), while still protecting a local edit that hasn't reached the
 *    server yet from being clobbered by a slightly-stale fetch that happens
 *    to land around the same time.
 * 4. **A quiet `null` (offline, no backend, a failed request) changes
 *    nothing and is retried on the next identity check** — never an error
 *    screen, never a wipe.
 *
 * A sync runs once per identity per page load, *or* whenever the shared
 * resync tick is bumped (see `useSyncOncePerIdentity` — `useConnectivityResync`
 * bumps it on `online`), so a tab left open does catch up on another
 * device's edit once this one reconnects, without needing a reload.
 * Realtime (pushing a sync the instant another device writes, not just on
 * reconnect) is still a separate, not-yet-built piece.
 *
 * What this hook deliberately does *not* try to solve: deletions on one
 * device don't remove anything on another — this merge only ever adds or
 * replaces, never deletes; that needs a tombstone (a `deleted_at` the sync
 * can see), which no table has yet.
 */
export function useSyncedCollection<T extends { id: string; updatedAt: string }>(
  storageKey: string,
  syncState: SyncState,
  fetchItems: () => Promise<T[] | null>,
  /**
   * An in-memory fallback shown before the first sync ever resolves —
   * `record_field`'s three system defaults (duration/push-ups/note) are the
   * motivating case: usable offline immediately, and reconciled for real
   * once the sync confirms them (they're public rows, so the fetch returns
   * them too). Never written to storage itself; only ever a starting value.
   */
  initialValue: Record<string, T> = {},
) {
  const [items, setItems] = useLocalStorage<Record<string, T>>(storageKey, initialValue);

  useSyncOncePerIdentity(syncState, async () => {
    const fetched = await fetchItems();
    if (fetched === null) return false;
    if (fetched.length) {
      setItems(prev => {
        const merged = { ...prev };
        let changed = false;
        for (const item of fetched) {
          const existing = merged[item.id];
          if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
            merged[item.id] = item;
            changed = true;
          }
        }
        return changed ? merged : prev;
      });
    }
    return true;
  });

  return [items, setItems] as const;
}
