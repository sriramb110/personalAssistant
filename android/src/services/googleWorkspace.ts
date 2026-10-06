import { getDriveSettings, googleWorkspaceRequest } from './driveBackup';
import { decodeBase64, emailRaw } from '../utils/mailEncoding';

export type GmailMessage = { id: string; subject: string; from: string; text: string };
export type GoogleFile = { id: string; name: string; mimeType: string };
type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[] };
function plainText(part: Part): string {
  if (part.mimeType === 'text/plain' && part.body?.data) return decodeBase64(part.body.data);
  return part.parts?.map(plainText).find(Boolean) || '';
}
export async function readGmailInbox(): Promise<GmailMessage[]> {
  const listing = await (await googleWorkspaceRequest('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&labelIds=INBOX')).json();
  const results: GmailMessage[] = [];
  // Limit concurrent requests and retain order without overwhelming mobile networks.
  for (const item of listing.messages || []) {
    const data = await (await googleWorkspaceRequest(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?format=full`)).json();
    const headers: { name: string; value: string }[] = data.payload?.headers || [];
    results.push({ id: data.id, subject: headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No subject)',
      from: headers.find(h => h.name.toLowerCase() === 'from')?.value || '', text: plainText(data.payload || {}) || data.snippet || '' });
  }
  return results;
}
export async function sendGmail(to: string, subject: string, body: string) {
  const raw = emailRaw(to, subject, body, (await getDriveSettings()).email);
  await googleWorkspaceRequest('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }),
  });
}
export async function listGoogleFiles(): Promise<GoogleFile[]> {
  return (await (await googleWorkspaceRequest('https://www.googleapis.com/drive/v3/files?spaces=drive&pageSize=100&q=trashed%3Dfalse&fields=files(id,name,mimeType)&orderBy=modifiedTime%20desc')).json()).files || [];
}
export async function readGoogleNote(file: GoogleFile): Promise<string> {
  if (file.mimeType !== 'text/plain') throw new Error('Only plain text notes can be read here.');
  return (await googleWorkspaceRequest(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`)).text();
}
export async function writeGoogleNote(name: string, content: string) {
  if (!name.trim() || !content.trim()) throw new Error('Enter a note title and text.');
  const boundary = `anbu_note_${Date.now()}`;
  const metadata = JSON.stringify({ name: name.trim().endsWith('.txt') ? name.trim() : `${name.trim()}.txt`, mimeType: 'text/plain' });
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${content}\r\n--${boundary}--`;
  await googleWorkspaceRequest('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body,
  });
}
