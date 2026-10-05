import * as Calendar from 'expo-calendar';
import * as SMS from 'expo-sms';
import * as Speech from 'expo-speech';
export function stopSpeech() {
    return Speech.stop();
}
export function speakText(text: string, tamil: boolean, onError: () => void) {
    Speech.stop();
    Speech.speak(text, { language: tamil ? 'ta-IN' : 'en-IN', onError });
}
export async function openCalendarEvent(title: string, date: string) {
    const start = new Date(date);
    if (!title.trim() || !date || Number.isNaN(start.getTime()) || start <= new Date()) {
        throw new Error('Enter a title and future local date: YYYY-MM-DDTHH:mm');
    }
    try {
        await Calendar.createEventInCalendarAsync({
            title: title.trim(),
            startDate: start,
            endDate: new Date(start.getTime() + 3600000),
        });
    }
    catch {
        throw new Error('Could not open calendar. Use a phone with a calendar app.');
    }
}
export async function openSmsReply(phone: string, reply: string) {
    if (!/^\+?[\d ()-]{7,20}$/.test(phone)) {
        throw new Error('Enter a valid phone number.');
    }
    if (!await SMS.isAvailableAsync()) {
        throw new Error('SMS unavailable on this device.');
    }
    try {
        await SMS.sendSMSAsync([phone], reply);
    }
    catch {
        throw new Error('Could not open SMS composer.');
    }
}
