import type { Message } from '../types/message';

export function mergeNotificationMessages(existing: Message[], incoming: Message[]): Message[] {
  const seen = new Set(existing.map(message => message.id));
  const additions = incoming.filter(message => {
    if (seen.has(message.id)) return false;
    seen.add(message.id); return true;
  });
  return [...additions.reverse(), ...existing];
}
