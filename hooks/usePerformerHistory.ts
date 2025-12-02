import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { PerformerHistory } from '../types';

const STORAGE_KEY = 'gt2-performer-history';
const MAX_HISTORY = 20;

const initialHistory: PerformerHistory = {
  version: 1,
  names: [],
  maxSize: MAX_HISTORY
};

export function usePerformerHistory() {
  const [history, setHistory, isAvailable] = useLocalStorage<PerformerHistory>(
    STORAGE_KEY,
    initialHistory
  );

  const addPerformerName = useCallback(
    (name: string) => {
      if (!name.trim()) return;

      const trimmedName = name.trim();

      setHistory(prev => {
        // Remove if exists, then add to front
        const filtered = prev.names.filter(n => n !== trimmedName);
        return {
          ...prev,
          names: [trimmedName, ...filtered].slice(0, MAX_HISTORY)
        };
      });
    },
    [setHistory]
  );

  return {
    history,
    addPerformerName,
    isAvailable
  };
}
