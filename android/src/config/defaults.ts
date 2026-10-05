import type { AssistantData } from '../types/assistant';
import { sampleMessages } from '../data/sampleMessages';
import type { DriveSettings } from '../services/driveBackup';

export const STORAGE_KEYS = {
  localData: 'anbu.data.v1',
  legacyPreferences: 'anbu.preferences',
  driveSettings: 'anbu.drive.v1',
  uploadedData: 'anbu.drive.uploaded-data.v1',
} as const;

export const defaultAssistantData: AssistantData = {
  name: '',
  tamil: false,
  busy: false,
  custom: '',
  messages: sampleMessages,
  important: true,
  draft: '',
  source: 'WhatsApp',
  phone: '',
  title: '',
  date: '',
};

export const defaultDriveSettings: DriveSettings = {
  enabled: false,
  email: '',
  lastBackup: '',
  lastError: '',
  webClientId: '',
};
