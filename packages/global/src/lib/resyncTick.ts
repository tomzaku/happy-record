// A single "resync now" signal every domain store's sync guard can listen
// for, independent of whether that identity has already synced once this
// page load. Module-level pub/sub (not React state) so it can be bumped
// from outside any component tree — see useConnectivityResync.ts, the
// `online` handler that calls `bumpResyncTick()` alongside flushing the
// write queue.
type Listener = () => void;

const listeners = new Set<Listener>();
let tick = 0;

/** Forces every subscribed store to treat its next check as "resync now." */
export function bumpResyncTick(): void {
  tick += 1;
  listeners.forEach(listener => listener());
}

export function subscribeResyncTick(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getResyncTick(): number {
  return tick;
}
