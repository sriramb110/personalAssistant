export function getBusyReply(name: string, tamil: boolean, custom: string): string {
    if (custom)
        return custom;
    if (tamil) {
        return `${name || 'அவர்கள்'} இப்போது வேலையாக இருக்கிறார்கள். பின்னர் தொடர்பு கொள்ளவும் அல்லது உங்கள் செய்தியை அனுப்பவும்.`;
    }
    return `${name || 'I'} ${name ? 'is' : 'am'} busy right now. Please contact later or send a message with what you need.`;
}
