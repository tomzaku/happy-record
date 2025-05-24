import { create } from 'zustand';

// Cache to store Zustand stores by key
// eslint-disable-next-line
const storeCache = new Map<string, any>();

type LocalStorageStore<T> = {
  storedValue: T;
  setValue: (value: T | ((val: T) => T)) => void;
};

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  { storeOnMount }: { storeOnMount?: boolean } = {},
) {
  // Reuse or create a store for the given key
  if (!storeCache.has(key)) {
    const useStore = create<LocalStorageStore<T>>(set => ({
      storedValue: (() => {
        if (typeof window === 'undefined') {
          return initialValue;
        }
        try {
          const item = window.localStorage.getItem(key);
          if (storeOnMount && !item && initialValue) {
            window.localStorage.setItem(key, JSON.stringify(initialValue));
          }
          return item ? JSON.parse(item) : initialValue;
        } catch (error) {
          console.log(error);
          return initialValue;
        }
      })(),
      setValue: (value: T | ((val: T) => T)) => {
        set(state => {
          const valueToStore =
            value instanceof Function ? value(state.storedValue) : value;
          try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          } catch (error) {
            console.log(error);
          }
          return { storedValue: valueToStore };
        });
      },
    }));
    storeCache.set(key, useStore);
  }

  const useStore = storeCache.get(key);
  const { storedValue, setValue } = useStore();

  return [storedValue, setValue] as [T, (data: T | ((val: T) => T)) => void];
}
