import { create } from 'zustand';

// Same shape as useLocalStorage.ts's zustand `storeCache` mechanism — one
// reactive store shared across every component that asks for a given key —
// but deliberately with no `window.localStorage` read/write. This app is
// going online-first for its 8 backend-mirrored resources (fields, notes,
// note-folders, flags, tags, checklists, checklist-templates, checklist-records):
// a fresh page load always starts empty and re-fetches from the backend,
// never renders a stale local copy. Genuinely local-only state (selected
// checklist templates, theme, pomodoro config) keeps using
// `useLocalStorage` — this is only for state that's a cache of backend data.
// eslint-disable-next-line
const storeCache = new Map<string, any>();

type SessionStore<T> = {
  storedValue: T;
  setValue: (value: T | ((val: T) => T)) => void;
};

export function useSessionStore<T>(key: string, initialValue: T) {
  if (!storeCache.has(key)) {
    const useStore = create<SessionStore<T>>(set => ({
      storedValue: initialValue,
      setValue: (value: T | ((val: T) => T)) => {
        set(state => ({
          storedValue: value instanceof Function ? value(state.storedValue) : value,
        }));
      },
    }));
    storeCache.set(key, useStore);
  }

  const useStore = storeCache.get(key);
  const { storedValue, setValue } = useStore();

  return [storedValue, setValue] as [T, (data: T | ((val: T) => T)) => void];
}
