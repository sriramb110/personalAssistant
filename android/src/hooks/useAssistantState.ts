import { useEffect } from 'react';
import { openCalendarEvent, openSmsReply, speakText, stopSpeech } from '../services/device';
import { getBusyReply } from '../utils/replies';
import { useLocalAssistant } from './useLocalAssistant';
import type { Message } from '../types/message';

export function useAssistantState() {
  const { data, ready, error, setError, set, restoreData, importMessages } = useLocalAssistant();
  useEffect(() => () => { stopSpeech(); }, []);
  const reply = getBusyReply(data.name, data.tamil, data.custom);
  function speak(text: string) {
    speakText(text, data.tamil, () => setError('Voice unavailable. Check Tamil / English voices in phone settings.'));
  }
  async function calendar() {
    try { await openCalendarEvent(data.title, data.date); setError(''); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not open calendar.'); }
  }
  async function sms() {
    try { await openSmsReply(data.phone, reply); setError(''); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not open SMS composer.'); }
  }
  return {
    ...data, snapshot: data, ready, error, setError, restoreData, importMessages, reply, speak, calendar, sms,
    setName: (value: string) => set('name', value),
    setTamil: (value: boolean) => set('tamil', value),
    setBusy: (value: boolean) => set('busy', value),
    setCustom: (value: string) => set('custom', value),
    setMessages: (value: Message[]) => set('messages', value),
    setImportant: (value: boolean) => set('important', value),
    setDraft: (value: string) => set('draft', value),
    setSource: (value: string) => set('source', value),
    setPhone: (value: string) => set('phone', value),
    setTitle: (value: string) => set('title', value),
    setDate: (value: string) => set('date', value),
  };
}
