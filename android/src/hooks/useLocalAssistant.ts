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
  useEffect(() => {
    let cancelled = false;
    loadData().then(saved => {
      if (!cancelled) { latest.current = saved; setData(saved); setReady(true); }
    }).catch(() => {
      if (!cancelled) setError('Could not read local data. Restart the app to retry. Saved data has not been overwritten.');
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (ready) saveData(data).catch(() => setError('Could not save local data. Please check device storage.'));
  }, [data, ready]);
  function set<K extends keyof AssistantData>(key: K, value: AssistantData[K]) {
    const next = { ...latest.current, [key]: value };
    latest.current = next;
    setData(next);
  }
  async function restoreData(saved: AssistantData) {
    await saveData(saved);
    latest.current = saved;
    setData(saved);
  }
  const importMessages = useCallback(async (messages: Message[]) => {
    const next = { ...latest.current, messages: mergeNotificationMessages(latest.current.messages, messages) };
    await saveData(next);
    // Preserve edits made while the durable write was in progress.
    const current = { ...latest.current, messages: mergeNotificationMessages(latest.current.messages, messages) };
    latest.current = current;
    setData(current);
    await saveData(current);
  }, []);
  return { data, ready, error, setError, set, restoreData, importMessages };
}
