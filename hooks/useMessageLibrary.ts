import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { MessageLibrary, LibraryMessage } from '../types';

const STORAGE_KEY = 'gt2-message-library';
const MAX_MESSAGES = 100;

const initialLibrary: MessageLibrary = {
  version: 1,
  messages: []
};

export function useMessageLibrary() {
  const [library, setLibrary, isAvailable] = useLocalStorage<MessageLibrary>(
    STORAGE_KEY,
    initialLibrary
  );

  const addMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      // Check for duplicates
      const exists = library.messages.some(msg => msg.text === text.trim());
      if (exists) return;

      const newMessage: LibraryMessage = {
        id: crypto.randomUUID(),
        text: text.trim(),
        createdAt: Date.now(),
        selected: false
      };

      setLibrary(prev => ({
        ...prev,
        messages: [newMessage, ...prev.messages].slice(0, MAX_MESSAGES)
      }));
    },
    [library.messages, setLibrary]
  );

  const removeMessage = useCallback(
    (id: string) => {
      setLibrary(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== id)
      }));
    },
    [setLibrary]
  );

  const toggleMessageSelection = useCallback(
    (id: string) => {
      setLibrary(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === id ? { ...msg, selected: !msg.selected } : msg
        )
      }));
    },
    [setLibrary]
  );

  const getSelectedMessages = useCallback(
    () => library.messages.filter(msg => msg.selected).map(msg => msg.text),
    [library.messages]
  );

  return {
    library,
    addMessage,
    removeMessage,
    toggleMessageSelection,
    getSelectedMessages,
    isAvailable
  };
}
