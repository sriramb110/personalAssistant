import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class AnbuNotificationsModule extends NativeModule<Record<string, never>> {
  getStatus(): Promise<string>;
  configure(settings: string): Promise<void>;
  openAccessSettings(): Promise<void>;
  openPhone(): Promise<void>;
  peek(): Promise<string>;
  acknowledge(ids: string[]): Promise<void>;
}

export default requireOptionalNativeModule<AnbuNotificationsModule>('AnbuNotifications');
