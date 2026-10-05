import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { Message } from '../types/message';
import {
  configureNotifications, defaultNotificationSettings, getNotificationSettings,
  importQueuedNotifications, notificationAccessAvailable, openNotificationSettings,
  type NotificationSettings,
} from '../services/notificationAccess';

export function useNotificationAccess(ready: boolean, tamil: boolean, importMessages: (messages: Message[]) => Promise<void>) {
  const [settings, setSettings] = useState(defaultNotificationSettings);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const refresh = useCallback(async () => { setSettings(await getNotificationSettings()); }, []);
  useEffect(() => {
    if (!ready || !notificationAccessAvailable) return;
    let running = false;
    const sync = async () => {
      if (running) return;
      running = true;
      try { await importQueuedNotifications(importMessages); await refresh(); }
      catch (error) { setError(error instanceof Error ? error.message : 'Could not import notifications.'); }
      finally { running = false; }
    };
    sync();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') sync(); }, 3000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [ready, refresh, importMessages]);
  useEffect(() => {
    if (ready && notificationAccessAvailable) configureNotifications({ tamil }).catch(() => setError('Could not update notification voice.'));
  }, [ready, tamil]);
  async function change(patch: Partial<NotificationSettings>) {
    if (working) return;
    setWorking(true); setError('');
    try { await configureNotifications(patch); await refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not save notification settings.'); }
    finally { setWorking(false); }
  }
  async function requestAccess() {
    try { await openNotificationSettings(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not open notification access.'); }
  }
  return { available: notificationAccessAvailable, settings, working, error, change, requestAccess };
}
