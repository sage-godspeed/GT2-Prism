import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: { enabled?: boolean } = {}
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const { enabled = true } = options;
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (!enabled) return;

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      setIsAvailable(false);
    }
  }, [key, enabled]);

  // Save to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (enabled) {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error writing localStorage key "${key}":`, error);
        setIsAvailable(false);
      }
    },
    [key, storedValue, enabled]
  );

  return [storedValue, setValue, isAvailable];
}
