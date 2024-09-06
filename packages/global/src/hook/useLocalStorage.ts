import React from 'react';
import { create } from 'zustand';

// export function useLocalStorage<T>(
//   key: string,
//   initialValue: T,
//   { storeOnMount }: { storeOnMount?: boolean } = {}
// ) {
//   // State to store our value
//   // Pass initial state function to useState so logic is only executed once
//   const [storedValue, setStoredValue] = React.useState<T>(() => {
//     if (typeof window === 'undefined') {
//       return initialValue;
//     }
//
//     try {
//       // Get from local storage by key
//       const item = window.localStorage.getItem(key);
//       if (storeOnMount && !item && initialValue) {
//         window.localStorage.setItem(key, JSON.stringify(initialValue));
//       }
//       // Parse stored json or if none return initialValue
//       return item ? JSON.parse(item) : initialValue;
//     } catch (error) {
//       // If error also return initialValue
//       console.log(error);
//       return initialValue;
//     }
//   });
//
//   // Return a wrapped version of useState's setter function that ...
//   // ... persists the new value to localStorage.
//   const setValue = (value: T) => {
//     try {
//       // Allow value to be a function so we have same API as useState
//       const valueToStore =
//         value instanceof Function ? value(storedValue) : value;
//       // Save state
//       setStoredValue(valueToStore);
//       // Save to local storage
//       if (typeof window !== 'undefined') {
//         window.localStorage.setItem(key, JSON.stringify(valueToStore));
//       }
//     } catch (error) {
//       // A more advanced implementation would handle the error case
//       console.log(error);
//     }
//   };
//
//   return [storedValue, setValue] as [T, (data: T) => void];
// }

type LocalStorageStore<T> = {
  storedValue: T;
  setValue: (value: T | ((val: T) => T)) => void;
};

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  { storeOnMount }: { storeOnMount?: boolean } = {}
) {
  // Zustand store with localStorage persistence
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

  const { storedValue, setValue } = useStore();

  return [storedValue, setValue] as [T, (data: T | ((val: T) => T)) => void];
}
