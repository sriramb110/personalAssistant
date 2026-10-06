import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { parseBackup, readBackup } from './storage';

const SETTINGS_KEY = 'anbu.backend.v1';
const TOKEN_KEY = 'anbu.backend.token.v1';
export const DEFAULT_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://curve-ultra-produced-civilization.trycloudflare.com';
let webSessionToken = '';
export type BackendSettings = { url: string; enabled: boolean; automatic: boolean; lastSync: string };

export async function getBackendSettings(): Promise<BackendSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return { url: DEFAULT_BACKEND_URL, enabled: false, automatic: false, lastSync: '', ...(raw ? JSON.parse(raw) : {}) };
}

export async function updateBackendSettings(patch: Partial<BackendSettings>) {
  const next = { ...await getBackendSettings(), ...patch };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function normalizeBackendUrl(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error('Enter a valid HTTPS backend URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Enter only the HTTPS server origin, for example https://api.example.com.');
  }
  return url.origin;
}

async function getToken() {
  return Platform.OS === 'web' ? webSessionToken : await SecureStore.getItemAsync(TOKEN_KEY) || '';
}

async function request(url: string, token: string, path: string, options: RequestInit = {}) {
  if (!token) throw new Error('Enter your backend access key and connect first.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${url}/api/v1/assistant${path}`, {
      ...options, redirect: 'error', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const errors: Record<number, string> = { 401: 'Backend access key is incorrect.',
        404: 'No server snapshot yet. Sync this phone first.', 413: 'Your data exceeds the server snapshot size limit.',
        422: 'Server rejected the data format.', 503: 'Backend or MongoDB is not ready.' };
      throw new Error(errors[response.status] || `Backend request failed (${response.status}).`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Backend request timed out. Local data is preserved.');
    throw error;
  } finally { clearTimeout(timer); }
}

export async function connectBackend(value: string, key: string) {
  const url = normalizeBackendUrl(value);
  const token = key.trim();
  if (token.length < 32) throw new Error('Enter the backend access key (at least 32 characters).');
  const status = await request(url, token, '/status');
  if (status?.status !== 'ok' || status?.version !== 1) throw new Error('This server does not support Anbu sync version 1.');
  if (Platform.OS === 'web') webSessionToken = token;
  else await SecureStore.setItemAsync(TOKEN_KEY, token);
  return updateBackendSettings({ url, enabled: true, automatic: false, lastSync: '' });
}

export async function disconnectBackend() {
  const settings = await updateBackendSettings({ enabled: false, automatic: false });
  if (Platform.OS === 'web') webSessionToken = '';
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
  return settings;
}

async function connectedRequest(path: string, options?: RequestInit) {
  const settings = await getBackendSettings();
  if (!settings.enabled) throw new Error('Connect your backend first.');
  return request(normalizeBackendUrl(settings.url), await getToken(), path, options);
}

export async function uploadBackendSnapshot() {
  const raw = await readBackup();
  parseBackup(JSON.stringify(await connectedRequest('/state', { method: 'PUT', body: raw })));
  return updateBackendSettings({ lastSync: new Date().toISOString() });
}

export async function downloadBackendSnapshot() {
  return parseBackup(JSON.stringify(await connectedRequest('/state'))).data;
}
