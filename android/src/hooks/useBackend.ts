import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { AssistantData } from '../types/assistant';
import { DEFAULT_BACKEND_URL, connectBackend, disconnectBackend, downloadBackendSnapshot, getBackendSettings, updateBackendSettings, uploadBackendSnapshot, type BackendSettings } from '../services/backend';

export function useBackend(ready: boolean, data: AssistantData, restoreData: (data: AssistantData) => Promise<void>) {
  const [settings, setSettings] = useState<BackendSettings>({ url: DEFAULT_BACKEND_URL, enabled: false, automatic: false, lastSync: '' });
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const running = useRef(false);
  const lastUploaded = useRef('');
  const refresh = useCallback(async () => { setSettings(await getBackendSettings()); }, []);
  const act = useCallback(async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true; setWorking(true); setNotice('');
    try { await action(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Backend unreachable. Local data is preserved.'); }
    finally { await refresh().catch(() => {}); running.current = false; setWorking(false); }
  }, [refresh]);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    getBackendSettings().then(saved => { if (!cancelled) setSettings(saved); })
      .catch(() => { if (!cancelled) setNotice('Could not load backend settings.'); });
    return () => { cancelled = true; };
  }, [ready]);
  const serialized = JSON.stringify(data);
  useEffect(() => {
    if (!ready || !settings.enabled || !settings.automatic) return;
    const sync = () => {
      if (AppState.currentState !== 'active' || running.current || lastUploaded.current === serialized) return;
      act(async () => {
        await uploadBackendSnapshot(); lastUploaded.current = serialized;
        setNotice('Local changes synced to your backend.');
      });
    };
    const timer = setTimeout(sync, 5000);
    const retry = setInterval(sync, 60000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    return () => { clearTimeout(timer); clearInterval(retry); subscription.remove(); };
  }, [ready, settings.enabled, settings.automatic, serialized, act]);
  return { settings, working, notice,
    connect: (url: string, key: string) => act(async () => {
      await connectBackend(url, key); lastUploaded.current = '';
      setNotice('Connected. Sync uploads this phone; restore downloads the server copy.');
    }),
    disconnect: () => act(async () => { await disconnectBackend(); setNotice('Backend disconnected. Local data is preserved.'); }),
    sync: () => act(async () => { await uploadBackendSnapshot(); lastUploaded.current = serialized; setNotice('Your local data is saved on the backend.'); }),
    restore: () => act(async () => { await restoreData(await downloadBackendSnapshot()); lastUploaded.current = ''; setNotice('Server data restored to local storage.'); }),
    automatic: (value: boolean) => act(async () => { await updateBackendSettings({ automatic: value }); setNotice(value ? 'Automatic upload is enabled while the app is open.' : 'Automatic upload is off.'); }),
  };
}
