import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { connectDrive, disconnectDrive, getDriveSettings, runDailyBackup, saveDriveClientId, type DriveSettings } from '../services/driveBackup';
import { updateBackupSchedule } from '../services/backupTask';

export function useDriveBackup(ready: boolean) {
  const [settings, setSettings] = useState<DriveSettings>({ enabled: false, email: '', lastBackup: '', lastError: '', webClientId: '' });
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const operationRunning = useRef(false);
  const refresh = useCallback(async () => { setSettings(await getDriveSettings()); }, []);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const check = async () => {
      try { await runDailyBackup(); }
      catch { /* Persisted backup error is displayed in Settings. */ }
      finally { if (!cancelled) await refresh().catch(() => {}); }
    };
    check();
    updateBackupSchedule().catch(() => {});
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') check(); });
    const timer = setInterval(check, 60 * 60 * 1000);
    return () => { cancelled = true; subscription.remove(); clearInterval(timer); };
  }, [ready, refresh]);
  async function act(action: () => Promise<void>) {
    if (operationRunning.current) return;
    operationRunning.current = true;
    setWorking(true); setNotice('');
    try { await action(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Drive operation failed.'); }
    finally { await refresh().catch(() => {}); operationRunning.current = false; setWorking(false); }
  }
  const connect = (clientId?: string) => act(async () => {
    if (!await connectDrive(clientId)) { setNotice('Google sign-in cancelled. Your data remains saved on this phone.'); return; }
    const scheduled = await updateBackupSchedule().catch(() => false);
    await runDailyBackup(true);
    setNotice(scheduled ? 'Connected. Daily automatic backup is enabled.' : 'Connected. Background tasks are unavailable; backups will run when you open the app.');
  });
  const disconnect = () => act(async () => {
    await disconnectDrive(); await updateBackupSchedule(); setNotice('Drive disconnected. Local data is preserved.');
  });
  const backupNow = () => act(async () => { await runDailyBackup(true); setNotice('Backup uploaded successfully.'); });
  const saveClientId = (value: string) => act(async () => {
    await saveDriveClientId(value);
    setNotice('Client ID saved on this phone. Connect Google Drive to enable backups.');
  });
  return { settings, working, notice, connect, disconnect, backupNow, saveClientId, act };
}
