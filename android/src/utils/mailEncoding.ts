const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeBase64(text: string): string {
  const bytes = Array.from(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))), character => character.charCodeAt(0));
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const value = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    result += alphabet[(value >>> 18) & 63] + alphabet[(value >>> 12) & 63] +
      (i + 1 < bytes.length ? alphabet[(value >>> 6) & 63] : '=') + (i + 2 < bytes.length ? alphabet[value & 63] : '=');
  }
  return result;
}

export function decodeBase64(value: string): string {
  const raw = value.replace(/-/g, '+').replace(/_/g, '/').replace(/=|\s/g, '');
  let bits = 0, buffer = 0, encoded = '';
  for (const character of raw) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error('Invalid encoded email content.');
    buffer = (buffer << 6) | digit; bits += 6;
    if (bits >= 8) { bits -= 8; encoded += '%' + ((buffer >>> bits) & 255).toString(16).padStart(2, '0'); }
  }
  return decodeURIComponent(encoded);
}

export function emailRaw(to: string, subject: string, body: string, from?: string): string {
  if (!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(to.trim()) || /[\r\n]/.test(subject)) {
    throw new Error('Enter one valid recipient and a subject without line breaks.');
  }
  if (!subject.trim() || !body.trim()) throw new Error('Enter a subject and email body.');
  if (from !== undefined && !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(from)) throw new Error('Google sender account is invalid. Reconnect your account.');
  const encodedSubject = Array.from(subject.trim()).reduce<string[]>((chunks, character) => {
    if (!chunks.length || encodeBase64(chunks[chunks.length - 1] + character).length > 52) chunks.push(character);
    else chunks[chunks.length - 1] += character;
    return chunks;
  }, []).map(chunk => `=?UTF-8?B?${encodeBase64(chunk)}?=`).join('\r\n ');
  const content = [`To: ${to.trim()}`, ...(from ? [`From: ${from}`] : []), `Subject: ${encodedSubject}`, 'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '',
    encodeBase64(body).match(/.{1,76}/g)?.join('\r\n') || ''].join('\r\n');
  return encodeBase64(content).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
