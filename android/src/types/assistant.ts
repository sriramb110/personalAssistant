import type { Message } from './message';

export type AssistantData = {
  name: string;
  tamil: boolean;
  busy: boolean;
  custom: string;
  messages: Message[];
  important: boolean;
  draft: string;
  source: string;
  phone: string;
  title: string;
  date: string;
};

export type BackupDocument = {
  version: 1;
  savedAt: string;
  data: AssistantData;
};
