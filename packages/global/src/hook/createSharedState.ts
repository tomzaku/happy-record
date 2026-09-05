import { create } from 'zustand';

type SharedState<T> = { value: T; setValue: (value: T | ((prev: T) => T)) => void };

/**
 * A small, dedicated zustand store for one piece of state that needs to be reactive across every
 * component using it, without being a fetched/cached server resource (that belongs in React
 * Query instead — see e.g. useNote.tsx's own notes cache). The motivating case is a loading flag
 * for a background fetch that runs outside React Query's own fetch lifecycle (an imperative
 * `.then()` populating a shared `enabled: false` cache, not a real `useQuery` fetch) — React
 * Query's own `isLoading` can't see that fetch at all, so something else has to track it,
 * reactively, across every component that cares.
 *
 * Call once per concern, at module scope — *not* inside a hook or component body, and never
 * conditionally. Each call creates its own independent store; there's no shared registry or
 * string key to collide on (unlike useSessionStore, which this replaces). Returns a hook with the
 * same `[value, setValue]` shape as useState/useLocalStorage for drop-in ergonomics.
 */
export function createSharedState<T>(initial: T) {
  const useStore = create<SharedState<T>>(set => ({
    value: initial,
    setValue: value =>
      set(state => ({
        value: value instanceof Function ? (value as (prev: T) => T)(state.value) : value,
      })),
  }));

  return (): [T, (value: T | ((prev: T) => T)) => void] => {
    const value = useStore(state => state.value);
    const setValue = useStore(state => state.setValue);
    return [value, setValue];
  };
}
