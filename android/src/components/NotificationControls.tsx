import { Alert, Switch, Text, View } from 'react-native';
import { useAssistant } from '../providers/AssistantProvider';
import { styles as s } from '../theme/styles';
import { Badge, Button, Card, Notice } from './ui';
import { Icon } from './Icon';

export function NotificationControls() {
  const { notifications } = useAssistant();
  const { settings, available, working, error, change, requestAccess } = notifications;
  const controls = [
    { key: 'whatsapp' as const, title: 'WhatsApp', note: 'Save text from new WhatsApp notifications' },
    { key: 'sms' as const, title: 'SMS messages', note: 'Save notifications from your default SMS app' },
    { key: 'calls' as const, title: 'Phone call alerts', note: 'Save call notifications, not call audio or call logs' },
    { key: 'readAloud' as const, title: 'Read new alerts aloud', note: 'Uses your selected offline Tamil / English voice' },
    { key: 'importantOnly' as const, title: 'Speak important alerts only', note: 'All captured messages are saved to the inbox' },
  ];
  return <Card>
    <View style={s.row}><View style={[s.inline, s.flexible]}><View style={s.iconBox}><Icon name="message" /></View><View style={s.flexible}><Text style={s.cardTitle}>Notification assistant</Text><Text style={s.small}>WhatsApp, SMS & phone alerts</Text></View></View><Badge label={settings.granted ? 'Access on' : 'Access off'} warning={!settings.granted} /></View>
    <Text style={[s.note, { marginBottom: 16 }]}>Capture only the apps you select. Notification text stays on your phone and is included in Drive backups if you connect Drive.</Text>
    <Text style={s.note}>Reading notifications requires your approval in Android settings. You can write and save messages in the local inbox without permission. SMS replies open the phone composer for you to send; WhatsApp sending is not connected.</Text>
    {!available && <Notice>A rebuilt native Android app is required. Notification access is unavailable in Expo Go, web and iOS.</Notice>}
    <Button label={settings.granted ? 'Manage notification access' : 'Allow notification access'} icon="shield" variant="secondary" onPress={requestAccess} disabled={!available} />
    {controls.map(control => <View key={control.key} style={s.connection}>
      <View style={s.flexible}><Text style={[s.cardTitle, { fontSize: 13 }]}>{control.title}</Text><Text style={[s.small, { fontSize: 11 }]}>{control.note}</Text></View>
      <Switch accessibilityLabel={control.title} disabled={!available || working || (control.key === 'importantOnly' && !settings.readAloud)} value={settings[control.key]} onValueChange={value => {
        if (control.key === 'readAloud' && value) {
          Alert.alert('Read notifications aloud?', 'People nearby may hear your messages. Playback respects silent mode, Do Not Disturb and active calls. Install an offline voice first.', [
            { text: 'Cancel', style: 'cancel' }, { text: 'Enable', onPress: () => change({ readAloud: true }) },
          ]);
        } else change({ [control.key]: value });
      }} trackColor={{ false: '#DCE5DF', true: '#80B49B' }} thumbColor="#FFFFFF" />
    </View>)}
    {!!(error || settings.lastError) && <Text style={[s.error, { marginTop: 12 }]}>{error || settings.lastError}</Text>}
    <Text style={s.note}>{settings.lastCapturedAt ? `Last saved alert: ${new Date(settings.lastCapturedAt).toLocaleString()}` : 'No notification has been saved yet.'}</Text>
    <Text style={s.note}>Only exposed notification text is available. Hidden previews, muted chats, old chat history and some sensitive alerts may not be accessible.</Text>
  </Card>;
}
