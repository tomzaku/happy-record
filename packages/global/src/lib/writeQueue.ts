// Outbox for writes that failed because the device was offline — see
// CLAUDE.md and api.ts's own comment on `quiet`. `api.ts`'s `run()` is the
// only writer here: a `quiet` write that fails with a genuine network error
// (status 0 — offline/DNS/CORS/timeout, never a real 4xx/5xx the server
// actually saw) gets queued instead of just discarded.
//
// Deliberately plain `localStorage`, not `useLocalStorage`/zustand — this is
// read and written from `api.ts`'s `run()`, a plain async function with no
// React tree above it, and it has to survive a full reload while still
// offline (a write queued right before the tab closes must still flush on
// the next visit).
//
// Every write route this app has is already an upsert (POST) or an
// idempotent delete (see CLAUDE.md's REST conventions) — replaying a queued
// write blindly, in order, needs no dedup logic: replaying the same POST
// twice just upserts the same row twice. `updatedAt` is set client-side at
// the moment of the original edit and carried in the body, so a write
// replayed long after the fact still merges correctly under every store's
// last-write-wins-by-`updatedAt` logic.
import { uniqueId } from '../util';

export type QueuedWriteMethod = 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type QueuedWrite = {
  /** Only for removing this entry from the queue itself — not sent to the server. */
  id: string;
  method: QueuedWriteMethod;
  path: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Debugging only — replay order is the array order, not this. */
  queuedAt: string;
};

const QUEUE_KEY = 'write_queue';

function read(): QueuedWrite[] {
  if (typeof window === 'undefined') return [];
  try {
    const item = window.localStorage.getItem(QUEUE_KEY);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.log(error);
    return [];
  }
}

function write(items: QueuedWrite[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch (error) {
    console.log(error);
  }
}

export function enqueueWrite(entry: Omit<QueuedWrite, 'id' | 'queuedAt'>): void {
  write([...read(), { ...entry, id: uniqueId(), queuedAt: new Date().toISOString() }]);
}

export function queueLength(): number {
  return read().length;
}

// Shared across every caller — one flush in flight at a time, same shape as
// useSyncOncePerIdentity's SyncState guard.
let flushing = false;

/**
 * Replays every queued write, in order, persisting progress after each one
 * — not batched at the end — so a reload mid-flush doesn't replay something
 * twice. Stops at the first entry that's still failing (still offline, or
 * offline again) and leaves it and everything after it queued for the next
 * flush attempt.
 *
 * `send` is passed in rather than imported, since api.ts is the caller (it
 * owns the real `send`) — importing it here would be circular.
 */
export async function flushWriteQueue(
  send: (
    method: QueuedWriteMethod,
    path: string,
    body: unknown,
    opts: { params?: QueuedWrite['params'] },
  ) => Promise<unknown>,
): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    let items = read();
    while (items.length) {
      const [next, ...rest] = items;
      try {
        await send(next.method, next.path, next.body, { params: next.params });
      } catch {
        // Still failing — leave this entry and everything queued after it
        // for the next flush (this device may still be offline).
        break;
      }
      items = rest;
      write(items);
    }
  } finally {
    flushing = false;
  }
}
