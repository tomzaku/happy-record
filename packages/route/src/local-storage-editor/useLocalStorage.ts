import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const existingValue = window.localStorage.getItem(key);
      return existingValue ? existingValue : initialValue;
    } catch (error) {
      console.error('Error reading localStorage:', error);
      return initialValue;
    }
  });

  const save = () => {
    window.localStorage.setItem(key, storedValue);
  };

  return { storedValue, setStoredValue, save };
}

export default useLocalStorage;

export function useLocalStorageAll({
  onStorageChange,
}: { onStorageChange?: (data: Record<string, unknown>) => void } = {}) {
  const [storage, setStorage] = useState({});

  // Get all localStorage as an object
  const getAll = () => {
    const all = Object.keys(localStorage).reduce(
      (obj, k) => ({ ...obj, [k]: localStorage.getItem(k) }),
      {},
    );
    setStorage(all);
    onStorageChange?.(all);
    return all;
  };

  // Store all (set all key-value pairs from an object)
  const setAll = (obj: Record<string, unknown>) => {
    Object.entries(obj).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    setStorage(obj);
    onStorageChange?.(obj);
  };

  // Initialize storage on mount
  useEffect(() => {
    getAll();
  }, []);

  return { storage, getAll, setAll };
}
