import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AssistantData, BackupDocument } from '../types/assistant';
import { STORAGE_KEYS, defaultAssistantData } from '../config/defaults';
import { peekNotificationMessages } from './notificationAccess';
import { mergeNotificationMessages } from '../utils/notifications';

export const defaultData = defaultAssistantData;
let pendingWrite: Promise<void> = Promise.resolve();

function isMessageRecord(value: unknown): value is { id: string; source: string; text: string; important: boolean; receivedAt?: number; origin?: 'notification' } {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return typeof message.id === 'string' &&
    typeof message.source === 'string' &&
    typeof message.text === 'string' &&
    typeof message.important === 'boolean';
}

function hasValidMessageList(value: unknown): value is AssistantData['messages'] {
  return Array.isArray(value) &&
    value.every(isMessageRecord) &&
    new Set(value.map((message) => message.id)).size === value.length;
}

function hasValidDataShape(value: unknown): value is AssistantData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return ['name', 'custom', 'draft', 'source', 'phone', 'title', 'date'].every((key) => typeof data[key] === 'string') &&
    ['tamil', 'busy', 'important'].every((key) => typeof data[key] === 'boolean') &&
    hasValidMessageList(data.messages);
}

export function parseBackup(raw: string): BackupDocument {
  const document = JSON.parse(raw);
  const data = document?.data;
  if (document?.version !== 1 || typeof document.savedAt !== 'string' || !hasValidDataShape(data)) {
    throw new Error('This backup has an invalid or unsupported format.');
  }
  return { version: 1, savedAt: document.savedAt, data };
}

export async function loadData(): Promise<AssistantData> {
  const saved = await AsyncStorage.getItem(STORAGE_KEYS.localData);
  if (saved) return parseBackup(saved).data;

  const legacy = await AsyncStorage.getItem(STORAGE_KEYS.legacyPreferences);
  if (!legacy) return defaultData;

  const parsed = JSON.parse(legacy);
  return {
    ...defaultData,
    name: typeof parsed.name === 'string' ? parsed.name : '',
    tamil: !!parsed.tamil,
    busy: !!parsed.busy,
    custom: typeof parsed.custom === 'string' ? parsed.custom : '',
  };
}

export function saveData(data: AssistantData): Promise<void> {
  const snapshot: BackupDocument = { version: 1, savedAt: new Date().toISOString(), data };
  pendingWrite = pendingWrite.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEYS.localData, JSON.stringify(snapshot)));
  return pendingWrite;
}

export async function readBackup(): Promise<string> {
  await pendingWrite;
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.localData);
  if (!raw) throw new Error('No saved data is available yet.');

  const document = parseBackup(raw);
  const queued = await peekNotificationMessages();
  if (!queued.length) return raw;

  return JSON.stringify({
    ...document,
    savedAt: new Date().toISOString(),
    data: {
      ...document.data,
      messages: mergeNotificationMessages(document.data.messages, queued),
    },
  });
}
