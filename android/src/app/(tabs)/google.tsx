import { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Badge, Button, Card, Field, Notice, Section } from '../../components/ui';
import { useAssistant } from '../../providers/AssistantProvider';
import { listGoogleFiles, readGmailInbox, readGoogleNote, sendGmail, writeGoogleNote, type GmailMessage, type GoogleFile } from '../../services/googleWorkspace';
import { styles as s } from '../../theme/styles';
import { isImportantMessage } from '../../utils/messages';

export default function GoogleScreen() {
  const { drive } = useAssistant();
  return <GooglePanel key={drive.settings.email} />;
}

function GooglePanel() {
  const { drive, importMessages, speak } = useAssistant();
  const connected = !!drive.settings.enabled && !!drive.settings.workspaceEnabled;
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [files, setFiles] = useState<GoogleFile[]>([]);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [noteName, setNoteName] = useState('');
  const [noteText, setNoteText] = useState('');
  const [opened, setOpened] = useState('');
  const running = useRef(false);
  async function act(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true; setWorking(true); setNotice('');
    try { await action(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Google operation failed.'); }
    finally { running.current = false; setWorking(false); }
  }
  function reviewSend() {
    Alert.alert('Send this email?', `To: ${to.trim()}\nSubject: ${subject}\n\n${body}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send email', onPress: () => act(async () => {
        try { await sendGmail(to, subject, body); }
        catch (error) { throw new Error(`${error instanceof Error ? error.message : 'Send failed.'} Check Gmail Sent before retrying if the connection was interrupted.`); }
        setBody(''); setSubject(''); setNotice('Email sent successfully.');
      }) },
    ]);
  }
  return <Screen title="Your Google workspace" subtitle="Gmail and personal notes, connected from your phone.">
    <Card>
      <View style={s.row}><Text style={s.cardTitle}>Gmail & Drive</Text><Badge label={connected ? 'Connected' : 'Not connected'} warning={!connected} /></View>
      <Text style={s.note}>{drive.settings.email || 'Use your Google account to read emails, send reviewed messages and save Drive notes.'}</Text>
      <Text style={s.note}>Google asks you to approve Gmail read/send and access to files created or opened through Anbu. Backup remains in the separate private app-data folder.</Text>
      {!connected && <Button label="Connect Gmail and Drive" icon="cloud" loading={working || drive.working} onPress={drive.connectWorkspace} />}
      {!connected && <Text style={s.note}>Save a Google Web client ID in Settings first. This connection requires an Android native build and enabled Gmail/Drive APIs.</Text>}
      {!!(notice || drive.notice) && <Notice>{notice || drive.notice}</Notice>}
    </Card>
    {connected && <>
      <Section title="Gmail inbox" />
      <Card>
        <Button label="Read latest 20 emails" icon="mail" loading={working} onPress={() => act(async () => {
          setEmails(await readGmailInbox()); setNotice('Inbox loaded. Reading here does not mark emails as read in Gmail.');
        })} />
        <Text style={s.note}>Email content stays in this screen unless you choose Save to inbox. Attachments are not downloaded; HTML-only emails show a preview.</Text>
      </Card>
      {emails.map(email => <Card key={email.id}>
        <Text style={s.cardTitle}>{email.subject}</Text><Text style={s.small}>{email.from}</Text>
        <Text style={[s.message, { marginVertical: 14 }]}>{email.text}</Text>
        <Button label="Listen" icon="headphones" variant="secondary" onPress={() => speak(`${email.subject}. ${email.text}`)} />
        <View style={{ marginTop: 10 }}><Button label="Save to local inbox" variant="ghost" disabled={working} onPress={() => act(async () => {
          await importMessages([{ id: `gmail-${drive.settings.email}-${email.id}`, source: `Email · ${email.from}`, text: `${email.subject}\n${email.text}`, important: isImportantMessage(`${email.subject} ${email.text}`) }]);
          setNotice('Email saved locally. It is included in your connected Drive backups.');
        })} /></View>
      </Card>)}
      <Section title="Write an email" />
      <Card>
        <Field label="Recipient" placeholder="person@example.com" value={to} onChangeText={setTo} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!working} />
        <Field label="Subject" value={subject} onChangeText={setSubject} editable={!working} />
        <Field label="Email body" multiline value={body} onChangeText={setBody} editable={!working} />
        <Button label="Review and send email" icon="mail" disabled={working || !to.trim() || !subject.trim() || !body.trim()} onPress={reviewSend} />
        <Text style={s.note}>Sending needs your confirmation. Text entered here is held in memory until you leave this session.</Text>
      </Card>
      <Section title="Your Drive notes" />
      <Card>
        <Button label="Read Anbu files" icon="cloud" loading={working} onPress={() => act(async () => {
          setFiles(await listGoogleFiles()); setNotice('Latest accessible Drive files loaded.');
        })} />
        <Text style={s.note}>Shows up to 100 accessible files. Anbu does not request access to your entire Drive. Plain text notes can be opened here.</Text>
        {files.map(file => <View key={file.id} style={{ marginTop: 12 }}><Button label={file.name} variant="secondary" disabled={working || file.mimeType !== 'text/plain'} onPress={() => act(async () => {
          setOpened(await readGoogleNote(file)); setNotice(`Opened ${file.name}`);
        })} /></View>)}
        {!!opened && <Text style={[s.message, { marginTop: 14 }]}>{opened}</Text>}
      </Card>
      <Card>
        <Field label="New note title" value={noteName} onChangeText={setNoteName} editable={!working} />
        <Field label="Note text" multiline value={noteText} onChangeText={setNoteText} editable={!working} />
        <Button label="Create note in Drive" icon="plus" disabled={working || !noteName.trim() || !noteText.trim()} onPress={() => act(async () => {
          await writeGoogleNote(noteName, noteText); setNoteText(''); setNotice('Text note created in My Drive.');
        })} />
      </Card>
    </>}
  </Screen>;
}
