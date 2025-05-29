import { useState, useEffect } from 'react';

function useLocalStorage(key, initialValue) {
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
