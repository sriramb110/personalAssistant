import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Badge, Button, Card, Field, Notice, Section } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icon';
import { useAssistant } from '../../providers/AssistantProvider';
import { colors, styles as s } from '../../theme/styles';
import { readLatestDriveBackup } from '../../services/driveBackup';
import { NotificationControls } from '../../components/NotificationControls';

const connections: { name: string; description: string; icon: IconName; available?: boolean }[] = [
  { name: 'Calendar', description: 'Review and save events on your phone', icon: 'calendar', available: true },
  { name: 'SMS replies', description: 'Review messages in your SMS app', icon: 'message', available: true },
  { name: 'Email inbox', description: 'Account connection is not set up', icon: 'mail' },
];
export default function SettingsScreen() {
  const { name, setName, custom, setCustom, tamil, drive, restoreData } = useAssistant();
  const connected = drive.settings.enabled;
  const [clientIdDraft, setClientId] = useState<string | null>(null);
  const [showClientSetup, setShowClientSetup] = useState(false);
  const clientId = clientIdDraft ?? drive.settings.webClientId;
  const clientIdChanged = clientId.trim() !== drive.settings.webClientId;
  function restore() {
    Alert.alert('Restore your backup?', 'This replaces local messages, preferences and drafts with your latest Drive backup.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Restore', onPress: () => drive.act(async () => { await restoreData(await readLatestDriveBackup()); }) },
    ]);
  }
  return <Screen title="Make Anbu yours." subtitle="Small preferences that make a big difference.">
    <View style={s.profile}><View style={s.avatar}><Text style={s.avatarText}>{name.trim() ? name.trim().slice(0, 1).toUpperCase() : 'A'}</Text></View><View style={s.flexible}><Text style={s.cardTitle}>{name || 'Your personal space'}</Text><Text style={s.small}>{tamil ? 'தமிழ் voice' : 'English voice'} · Saved on this device</Text></View><Badge label="Personal" /></View>
    <Section title="Your preferences" />
    <Card>
      <Text style={s.cardTitle}>A familiar introduction</Text>
      <Field label="Your name" placeholder="What should Anbu call you?" value={name} onChangeText={setName} autoComplete="name" />
      <Field label="Custom busy reply" placeholder="Write your reply, or leave blank for the default." multiline value={custom} onChangeText={setCustom} />
      <Text style={s.note}>Changes save automatically. Use the language button above to switch the default reply and voice.</Text>
    </Card>
    <Section title="Your notification assistant" />
    <NotificationControls />
    <Section title="Keep your data safe" />
    <Card>
      <View style={s.row}><View style={[s.inline, s.flexible]}><View style={s.iconBox}><Icon name="shield" /></View><View style={s.flexible}><Text style={s.cardTitle}>Phone internal storage</Text><Text style={s.small}>Automatically saved on this device</Text></View></View><Badge label="Local" /></View>
      <Text style={s.note}>Messages, call alerts, preferences and drafts stay in private internal app storage. No SD card access or app server is needed. Google Drive keeps an optional daily backup; local saving works offline.</Text>
      <Text style={s.note}>Clearing app data or uninstalling removes the local copy. A connected Drive backup can be restored after reinstalling.</Text>
    </Card>
    <Card>
      <View style={s.row}><View style={[s.inline, s.flexible]}><View style={s.iconBox}><Icon name="cloud" /></View><View style={s.flexible}><Text style={s.cardTitle}>Google Drive backup</Text><Text style={s.small}>A daily copy of your personal data</Text></View></View><Badge label={connected ? 'Connected' : 'Not connected'} warning={!connected} /></View>
      <View style={s.divider} />
      <Button label={connected ? 'Back up now' : 'Sign in with Google'} icon="cloud" onPress={connected ? drive.backupNow : () => drive.connect(clientId.trim() || undefined)} loading={drive.working} />
      {!connected && <Text style={s.note}>Choose your Google account and approve backup access on your phone. After approval, daily backup starts automatically. No password or access token needs to be entered here.</Text>}
      {!connected && <Button label={showClientSetup ? 'Hide Google setup' : 'Google client ID setup'} variant="ghost" onPress={() => setShowClientSetup(!showClientSetup)} disabled={drive.working} />}
      {!connected && (showClientSetup || !drive.settings.webClientId) && <>
      <Field label="Google Web OAuth client ID" placeholder="123456-example.apps.googleusercontent.com" value={clientId} onChangeText={setClientId} autoCapitalize="none" autoCorrect={false} editable={!connected && !drive.working} />
      <Button label="Save client ID on this phone" variant="secondary" onPress={() => drive.saveClientId(clientId)} disabled={connected || drive.working || !clientId.trim() || !clientIdChanged} />
      <Text style={[s.note, { marginBottom: 18 }]}>Each customer can save a different client ID locally. Disconnect Drive before changing it. Use a Web client ID from the same Google project as the Android client registered for this app.</Text>
      <Text style={s.note}>The app needs a client ID once. Google sign-in cannot discover or create it. If Anbu already includes one, customers only need to choose their account. Sign in also saves a newly entered ID automatically.</Text>
      </>}
      {connected && <Text style={[s.message, { marginBottom: 10 }]}>{drive.settings.email}</Text>}
      <View style={s.row}><Text style={s.small}>Last successful backup</Text><Text style={[s.label, { marginBottom: 0, maxWidth: '55%', textAlign: 'right' }]}>{drive.settings.lastBackup ? new Date(drive.settings.lastBackup).toLocaleString() : 'No backup yet'}</Text></View>
      <Text style={[s.note, { marginBottom: 18 }]}>Messages, drafts and preferences are backed up to Anbu’s private Drive folder, separate from My Drive.</Text>
      {!!drive.settings.lastError && <Text style={s.error}>{drive.settings.lastError}</Text>}
      {!!drive.notice && <Notice>{drive.notice}</Notice>}
      {connected && <><View style={{ marginTop: 10 }}><Button label="Restore latest backup" icon="download" variant="secondary" onPress={restore} disabled={drive.working} /></View><View style={{ marginTop: 10 }}><Button label="Disconnect account" icon="logout" variant="ghost" onPress={drive.disconnect} disabled={drive.working} /></View></>}
      <Text style={s.note}>{connected ? 'Today\'s backup refreshes when saved activity changes. Automatic checks run when you open the app and approximately hourly; Android may delay background uploads.' : 'Google sign-in needs OAuth setup and a native Android build. Your local data is saved even without Drive.'}</Text>
    </Card>
    <Section title="On your phone" />
    <Card>{connections.map((connection, index) => <View key={connection.name} style={[s.connection, index === connections.length - 1 && { borderBottomWidth: 0 }]}>
      <Icon name={connection.icon} color={connection.available ? colors.green : colors.muted} /><View style={s.flexible}><Text style={[s.cardTitle, { fontSize: 13 }]}>{connection.name}</Text><Text style={[s.small, { fontSize: 11 }]}>{connection.description}</Text></View><Badge label={connection.available ? 'Available' : 'Not set up'} warning={!connection.available} />
    </View>)}</Card>
    <Notice icon="shield">Your data stays on this device unless you connect Drive for backups. Notification access and automatic speech are controlled above.</Notice>
  </Screen>;
}
