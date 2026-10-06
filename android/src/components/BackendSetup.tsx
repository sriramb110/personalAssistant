import { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { Badge, Button, Card, Field, Notice } from './ui';
import { styles as s } from '../theme/styles';
import { useAssistant } from '../providers/AssistantProvider';

export function BackendSetup() {
  const { backend } = useAssistant();
  const [urlDraft, setUrl] = useState<string | null>(null);
  const [key, setKey] = useState('');
  const url = urlDraft ?? backend.settings.url;
  const connected = backend.settings.enabled;
  return <Card>
    <View style={s.row}><Text style={s.cardTitle}>Personal backend</Text><Badge label={connected ? 'Connected' : 'Not connected'} warning={!connected} /></View>
    <Field label="HTTPS backend server URL" placeholder="https://your-backend.example.com" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" editable={!connected && !backend.working} />
    {!connected && <Field label="Backend access key" placeholder="BACKEND_API_KEY from your local backend .env" secureTextEntry value={key} onChangeText={setKey} autoCapitalize="none" autoCorrect={false} editable={!backend.working} />}
    <Text style={s.note}>Sync will copy your messages, call notification text, preferences and drafts to this server. Google client IDs and Google access tokens stay outside the snapshot.</Text>
    <Text style={s.note}>The local inbox will continue to work offline. Restoring server data will require confirmation before replacing the local copy. Google Drive backup stays separate.</Text>
    {!connected && <Button label="Connect backend" loading={backend.working} disabled={!url.trim() || key.trim().length < 32} onPress={() => Alert.alert('Connect this server?', `Server: ${url}\n\nSync will send your local messages, call alerts, preferences and drafts to this server. Automatic upload starts off.`, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Connect', onPress: async () => { await backend.connect(url, key); setKey(''); } },
    ])} />}
    {connected && <>
      <Button label="Sync local data to backend" loading={backend.working} onPress={backend.sync} />
      <View style={{ marginTop: 10 }}><Button label="Restore server data" variant="secondary" disabled={backend.working} onPress={() => Alert.alert('Replace local data?', 'This replaces the local inbox, preferences and drafts with the server snapshot.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Restore', onPress: backend.restore },
      ])} /></View>
      <View style={s.connection}><View style={s.flexible}><Text style={s.cardTitle}>Automatic sync</Text><Text style={s.small}>Uploads changes while the app is open; retries after reconnecting</Text></View><Switch accessibilityLabel="Automatic backend sync" value={backend.settings.automatic} disabled={backend.working} onValueChange={backend.automatic} /></View>
      <Text style={s.note}>{backend.settings.lastSync ? `Last sync: ${new Date(backend.settings.lastSync).toLocaleString()}` : 'No snapshot uploaded yet.'}</Text>
      <Button label="Disconnect backend" variant="ghost" disabled={backend.working} onPress={backend.disconnect} />
    </>}
    {!!backend.notice && <Notice>{backend.notice}</Notice>}
    <Text style={s.note}>Temporary HTTPS links stop when the tunnel closes. The access key is stored in secure phone storage; web preview keeps it only for the current session.</Text>
  </Card>;
}
