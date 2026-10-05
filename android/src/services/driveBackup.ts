import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { parseBackup, readBackup } from './storage';

const SETTINGS_KEY = 'anbu.drive.v1';
const UPLOADED_DATA_KEY = 'anbu.drive.uploaded-data.v1';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export type DriveSettings = { enabled: boolean; email: string; lastBackup: string; lastError: string; webClientId: string };
const defaults: DriveSettings = { enabled: false, email: '', lastBackup: '', lastError: '', webClientId: '' };
let configuredClientId = '';
let activeBackup: Promise<void> | null = null;

export async function getDriveSettings(): Promise<DriveSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return { ...defaults, webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '', ...(raw ? JSON.parse(raw) : {}) };
}

async function updateSettings(patch: Partial<DriveSettings>) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...await getDriveSettings(), ...patch }));
}

export async function saveDriveClientId(value: string) {
  const webClientId = value.trim();
  if (!/^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(webClientId)) {
    throw new Error('Enter a Google Web OAuth client ID ending in .apps.googleusercontent.com.');
  }
  if ((await getDriveSettings()).enabled) throw new Error('Disconnect Google Drive before changing the client ID.');
  if (activeBackup) await activeBackup.catch(() => {});
  await updateSettings({ webClientId, email: '', lastBackup: '', lastError: '' });
  await AsyncStorage.setItem(UPLOADED_DATA_KEY, '');
  configuredClientId = '';
}

async function google() {
  if (Platform.OS !== 'android') throw new Error('Drive backup currently supports Android development builds.');
  const { webClientId } = await getDriveSettings();
  if (!webClientId) throw new Error('Enter and save your Google Web client ID in Settings first.');
  let module;
  try { module = await import('@react-native-google-signin/google-signin'); }
  catch { throw new Error('Google sign-in needs an Android development build; it is unavailable in Expo Go.'); }
  if (configuredClientId !== webClientId) {
    module.GoogleSignin.configure({ webClientId, scopes: [SCOPE], offlineAccess: false });
    configuredClientId = webClientId;
  }
  return module;
}

async function driveRequest(url: string, options: RequestInit = {}) {
  const { GoogleSignin } = await google();
  if (!GoogleSignin.getCurrentUser()) {
    const result = await GoogleSignin.signInSilently();
    if (result.type !== 'success') throw new Error('Please reconnect Google Drive in Settings.');
  }
  let { accessToken } = await GoogleSignin.getTokens();
  const send = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      return await fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${accessToken}` }, signal: controller.signal });
    } finally { clearTimeout(timeout); }
  };
  let response = await send();
  if (response.status === 401) {
    await GoogleSignin.clearCachedAccessToken(accessToken);
    accessToken = (await GoogleSignin.getTokens()).accessToken;
    response = await send();
  }
  if (!response.ok) throw new Error(`Google Drive request failed (${response.status}). Check connection and Drive consent.`);
  return response;
}

export async function connectDrive(clientId?: string) {
  if (clientId !== undefined && clientId.trim() !== (await getDriveSettings()).webClientId) {
    await saveDriveClientId(clientId);
  }
  const { GoogleSignin, isSuccessResponse } = await google();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return false;
  // Confirm access is available before enabling automatic uploads.
  await GoogleSignin.getTokens();
  await updateSettings({ enabled: true, email: response.data.user.email, lastBackup: '', lastError: '' });
  await AsyncStorage.setItem(UPLOADED_DATA_KEY, '');
  return true;
}

export async function disconnectDrive() {
  // Disable scheduled uploads first, then finish any upload already in progress.
  await updateSettings({ enabled: false });
  if (activeBackup) await activeBackup.catch(() => {});
  const { GoogleSignin } = await google();
  await GoogleSignin.signOut();
  await updateSettings({ enabled: false, email: '', lastBackup: '', lastError: '' });
  await AsyncStorage.setItem(UPLOADED_DATA_KEY, '');
}

export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function runDailyBackup(force = false): Promise<void> {
  if (activeBackup) return activeBackup;
  activeBackup = (async () => {
    const settings = await getDriveSettings();
    if (!settings.enabled) return;
    try {
      const raw = await readBackup();
      const data = JSON.stringify(parseBackup(raw).data);
      const alreadyBackedUpToday = settings.lastBackup && localDay(new Date(settings.lastBackup)) === localDay();
      if (!force && alreadyBackedUpToday && await AsyncStorage.getItem(UPLOADED_DATA_KEY) === data) return;
      const name = `anbu-${localDay()}.json`;
      const query = new URLSearchParams({ spaces: 'appDataFolder', q: `name = '${name}' and trashed = false`, fields: 'files(id)' });
      const list = await (await driveRequest(`https://www.googleapis.com/drive/v3/files?${query}`)).json();
      const fileId: string | undefined = list.files?.[0]?.id;
      if (fileId) {
        await driveRequest(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: raw });
      } else {
        const boundary = 'anbu_backup_multipart';
        const metadata = JSON.stringify({ name, parents: ['appDataFolder'], mimeType: 'application/json' });
        const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${raw}\r\n--${boundary}--`;
        await driveRequest('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
      }
      await AsyncStorage.setItem(UPLOADED_DATA_KEY, data);
      await updateSettings({ lastBackup: new Date().toISOString(), lastError: '' });
    } catch (error) {
      await updateSettings({ lastError: error instanceof Error ? error.message : 'Backup failed. Will retry later.' });
      throw error;
    }
  })();
  try { await activeBackup; } finally { activeBackup = null; }
}

export async function readLatestDriveBackup() {
  if (!(await getDriveSettings()).enabled) throw new Error('Connect Google Drive first.');
  const query = new URLSearchParams({ spaces: 'appDataFolder', q: "trashed = false and name contains 'anbu-'", orderBy: 'modifiedTime desc', pageSize: '1', fields: 'files(id)' });
  const list = await (await driveRequest(`https://www.googleapis.com/drive/v3/files?${query}`)).json();
  const id = list.files?.[0]?.id;
  if (!id) throw new Error('No Drive backup is available.');
  const raw = await (await driveRequest(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`)).text();
  return parseBackup(raw).data;
}
