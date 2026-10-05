import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AssistantData, BackupDocument } from '../types/assistant';
import { sampleMessages } from '../data/sampleMessages';
import { peekNotificationMessages } from './notificationAccess';
import { mergeNotificationMessages } from '../utils/notifications';

const DATA_KEY = 'anbu.data.v1';
export const defaultData: AssistantData = {
  name: '', tamil: false, busy: false, custom: '', messages: sampleMessages,
  important: true, draft: '', source: 'WhatsApp', phone: '', title: '', date: '',
};
let pendingWrite: Promise<void> = Promise.resolve();

export function parseBackup(raw: string): BackupDocument {
  const document = JSON.parse(raw);
  const data = document?.data;
  if (document?.version !== 1 || typeof document.savedAt !== 'string' || !data ||
      !['name', 'custom', 'draft', 'source', 'phone', 'title', 'date'].every(key => typeof data[key] === 'string') ||
      !['tamil', 'busy', 'important'].every(key => typeof data[key] === 'boolean') ||
      !Array.isArray(data.messages) || !data.messages.every((message: unknown) => {
        if (!message || typeof message !== 'object') return false;
        const m = message as Record<string, unknown>;
        return typeof m.id === 'string' && typeof m.source === 'string' && typeof m.text === 'string' && typeof m.important === 'boolean';
      }) || new Set(data.messages.map((m: { id: string }) => m.id)).size !== data.messages.length) {
    throw new Error('This backup has an invalid or unsupported format.');
  }
  return { version: 1, savedAt: document.savedAt, data };
}

export async function loadData(): Promise<AssistantData> {
  const saved = await AsyncStorage.getItem(DATA_KEY);
  if (saved) return parseBackup(saved).data;
  const legacy = await AsyncStorage.getItem('anbu.preferences');
  if (!legacy) return defaultData;
  const p = JSON.parse(legacy);
  return { ...defaultData, name: typeof p.name === 'string' ? p.name : '', tamil: !!p.tamil,
    busy: !!p.busy, custom: typeof p.custom === 'string' ? p.custom : '' };
}

export function saveData(data: AssistantData): Promise<void> {
  const snapshot: BackupDocument = { version: 1, savedAt: new Date().toISOString(), data };
  pendingWrite = pendingWrite.catch(() => {}).then(() => AsyncStorage.setItem(DATA_KEY, JSON.stringify(snapshot)));
  return pendingWrite;
}

export async function readBackup(): Promise<string> {
  await pendingWrite;
  const raw = await AsyncStorage.getItem(DATA_KEY);
  if (!raw) throw new Error('No saved data is available yet.');
  const document = parseBackup(raw);
  const queued = await peekNotificationMessages();
  if (!queued.length) return raw;
  // Include notifications captured while JS was closed without acknowledging them.
  return JSON.stringify({ ...document, savedAt: new Date().toISOString(), data: {
    ...document.data, messages: mergeNotificationMessages(document.data.messages, queued),
  } });
}
