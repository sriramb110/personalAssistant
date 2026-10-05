import { router } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Badge, Button, Card, Field, Notice, Section } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useAssistant } from '../../providers/AssistantProvider';
import { colors, styles as s } from '../../theme/styles';
import { openPhoneApp } from '../../services/notificationAccess';

export default function CallsScreen() {
  const { reply, speak, phone, setPhone, sms, busy, setBusy, tamil, setError, notifications } = useAssistant();
  return <Screen title="A reply with a little care." subtitle="Let people know when you need time for yourself.">
    <Card>
      <View style={s.row}><View style={[s.inline, s.flexible]}><View style={s.iconBox}><Icon name="moon" /></View><View style={s.flexible}><Text style={s.cardTitle}>Busy reply preference</Text><Text style={s.small}>{busy ? 'Busy reply selected' : 'Currently available'}</Text></View></View><Switch accessibilityLabel="Select busy reply preference" value={busy} onValueChange={setBusy} trackColor={{ false: '#DCE5DF', true: '#80B49B' }} thumbColor="#FFFFFF" /></View>
    </Card>
    <Section title="What your reply says" />
    <Card>
      <View style={s.row}><Text style={s.eyebrow}>YOUR BUSY REPLY</Text><Badge label={tamil ? 'தமிழ்' : 'English'} /></View>
      <View style={s.quote}><Text style={[s.message, { color: colors.ink, fontSize: 15, lineHeight: 26 }]}>{reply}</Text></View>
      <Button label="Listen to the reply" icon="headphones" variant="secondary" onPress={() => speak(reply)} />
      <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} style={[s.textAction, { alignItems: 'center', marginTop: 6 }]}><Text style={s.link}>Personalize your reply in Settings</Text></Pressable>
    </Card>
    <Section title="Send it to someone" />
    <Card>
      <View style={s.inline}><View style={s.iconBox}><Icon name="message" /></View><View style={s.flexible}><Text style={s.cardTitle}>Send a thoughtful SMS</Text><Text style={s.small}>You review the message before it’s sent.</Text></View></View>
      <Field label="Contact number" placeholder="e.g. +91 98765 43210" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <View style={{ marginTop: 16 }}><Button label="Review & send SMS" icon="arrow" onPress={sms} disabled={!phone.trim()} /></View>
      <Text style={s.note}>Opens your phone’s SMS app. Nothing is sent automatically.</Text>
    </Card>
    <Notice icon="phone">Automatic call answering isn’t available. Reply previews play on this device, and the busy switch doesn’t change your phone’s silent mode.</Notice>
    <Card>
      <Text style={s.cardTitle}>Phone calls stay in your phone app</Text>
      <Text style={[s.note, { marginBottom: 16 }]}>Enable phone call alerts in Settings to save exposed incoming / missed-call notifications. These are alerts, not full call tracking. Answer calls in the system phone app.</Text>
      <Button label="Open phone app" icon="phone" variant="secondary" disabled={!notifications.available} onPress={() => openPhoneApp().catch(error => setError(error instanceof Error ? error.message : 'Could not open phone app.'))} />
    </Card>
  </Screen>;
}
