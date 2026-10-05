import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssistantData } from '../types/assistant';
import { defaultData, loadData, saveData } from '../services/storage';
import type { Message } from '../types/message';
import { mergeNotificationMessages } from '../utils/notifications';

export function useLocalAssistant() {
  const [data, setData] = useState<AssistantData>(defaultData);
  const latest = useRef(defaultData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const updateSnapshot = useCallback((next: AssistantData) => {
    latest.current = next;
    setData(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadData().then(saved => {
      if (!cancelled) {
        updateSnapshot(saved);
        setReady(true);
      }
    }).catch(() => {
      if (!cancelled) setError('Could not read local data. Restart the app to retry. Saved data has not been overwritten.');
    });
    return () => { cancelled = true; };
  }, [updateSnapshot]);

  useEffect(() => {
    if (!ready) return;
    saveData(data).catch(() => setError('Could not save local data. Please check device storage.'));
  }, [data, ready]);

  function set<K extends keyof AssistantData>(key: K, value: AssistantData[K]) {
    const next = { ...latest.current, [key]: value };
    updateSnapshot(next);
  }

  async function restoreData(saved: AssistantData) {
    await saveData(saved);
    updateSnapshot(saved);
  }

  const importMessages = useCallback(async (messages: Message[]) => {
    const next = { ...latest.current, messages: mergeNotificationMessages(latest.current.messages, messages) };
    await saveData(next);
    updateSnapshot(next);
  }, [updateSnapshot]);

  return { data, ready, error, setError, set, restoreData, importMessages };
}
