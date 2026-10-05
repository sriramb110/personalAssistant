import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { Message } from '../types/message';

export type NotificationSettings = {
  granted: boolean; whatsapp: boolean; sms: boolean; calls: boolean;
  readAloud: boolean; tamil: boolean; importantOnly: boolean;
  lastCapturedAt: number; lastError: string;
};
type NotificationModule = {
  getStatus(): Promise<string>; configure(raw: string): Promise<void>;
  openAccessSettings(): Promise<void>; openPhone(): Promise<void>;
  peek(): Promise<string>; acknowledge(ids: string[]): Promise<void>;
};
const native = Platform.OS === 'android' ? requireOptionalNativeModule<NotificationModule>('AnbuNotifications') : null;
export const notificationAccessAvailable = !!native;
export const defaultNotificationSettings: NotificationSettings = {
  granted: false, whatsapp: false, sms: false, calls: false, readAloud: false,
  tamil: false, importantOnly: true, lastCapturedAt: 0, lastError: '',
};
function module() {
  if (!native) throw new Error('Notification access needs a rebuilt native Android app. It is unavailable in Expo Go and web previews.');
  return native;
}
export async function getNotificationSettings(): Promise<NotificationSettings> {
  if (!native) return defaultNotificationSettings;
  return JSON.parse(await native.getStatus());
}
export const openNotificationSettings = () => module().openAccessSettings();
export const openPhoneApp = () => module().openPhone();
export const configureNotifications = (settings: Partial<NotificationSettings>) => module().configure(JSON.stringify(settings));

export async function peekNotificationMessages(): Promise<Message[]> {
  if (!native) return [];
  const raw = JSON.parse(await native.peek());
  if (!Array.isArray(raw)) throw new Error('Invalid notification queue.');
  const messages: Message[] = raw.filter(item => item && typeof item.id === 'string' &&
    typeof item.source === 'string' && typeof item.text === 'string' && typeof item.important === 'boolean');
  return messages;
}

export async function importQueuedNotifications(importMessages: (messages: Message[]) => Promise<void>) {
  const messages = await peekNotificationMessages();
  if (!messages.length || !native) return;
  await importMessages(messages);
  await native.acknowledge(messages.map(message => message.id));
}
