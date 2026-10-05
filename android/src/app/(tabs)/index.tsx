import { useState } from 'react';
import { router } from 'expo-router';
import { Linking, Pressable, Switch, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Badge, Button, Card, Field, Section } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icon';
import { useAssistant } from '../../providers/AssistantProvider';
import { colors, styles as s } from '../../theme/styles';

export default function TodayScreen() {
  const { messages, speak, busy, setBusy, setError, title, setTitle, date, setDate, calendar, name, tamil } = useAssistant();
  const [today] = useState(() => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }));
  const important = messages.filter(message => message.important);
  const shortcuts: { label: string; subtitle: string; icon: IconName; route: '/inbox' | '/calls' }[] = [
    { label: 'Your inbox', subtitle: `${messages.length} saved updates`, icon: 'inbox', route: '/inbox' },
    { label: 'Busy reply', subtitle: 'A thoughtful response', icon: 'phone', route: '/calls' },
  ];
  return <Screen title={`${tamil ? 'வணக்கம்' : 'Hello'}${name ? `, ${name}` : ' there'}${tamil ? '' : '.'}`} subtitle="A little less noise. A little more time for you.">
    <View style={s.hero}>
      <View style={s.heroCircle} pointerEvents="none" />
      <View style={s.row}><Text style={s.heroLabel}>YOUR DAILY BRIEF</Text><Icon name="spark" color={colors.lime} size={20} /></View>
      <Text style={s.heroTitle}>{important.length ? `${important.length} ${important.length === 1 ? 'update needs' : 'updates need'}\nyour attention.` : 'A clear inbox.\nA calmer day.'}</Text>
      <Text style={s.heroBody}>{important.length ? 'The important things in your saved messages, all in one place.' : 'Nothing marked important. You’re all caught up.'}</Text>
      <Button label="Listen to my brief" icon="headphones" variant="hero" onPress={() => speak(important.map(message => message.text).join('. ') || 'No important updates.')} />
      <Text style={[s.heroLabel, { marginTop: 16, fontSize: 9, letterSpacing: .8 }]}>{today.toUpperCase()} · {tamil ? 'TAMIL VOICE' : 'ENGLISH VOICE'}</Text>
    </View>
    <View style={s.stats}>
      <View style={s.stat}><View style={s.row}><Icon name="message" size={19} /><Text style={s.eyebrow}>INBOX</Text></View><Text style={s.statValue}>{messages.length}</Text><Text style={s.small}>Saved messages</Text></View>
      <View style={s.stat}><View style={s.row}><Icon name="star" size={19} color={colors.amber} /><Text style={s.eyebrow}>PRIORITY</Text></View><Text style={s.statValue}>{important.length}</Text><Text style={s.small}>Marked important</Text></View>
    </View>
    <View style={s.quickActions}>{shortcuts.map(action => <Pressable key={action.route} accessibilityRole="button" onPress={() => router.push(action.route)} style={({ pressed }) => [s.quickAction, pressed && { opacity: .65 }]}>
      <Icon name={action.icon} size={21} /><View style={s.flexible}><Text style={s.quickLabel}>{action.label}</Text><Text style={[s.small, { fontSize: 10 }]}>{action.subtitle}</Text></View><Icon name="chevron" size={15} color={colors.muted} />
    </Pressable>)}</View>
    <Section title="Your availability" />
    <Card>
      <View style={s.row}><View style={[s.inline, s.flexible]}><View style={s.iconBox}><Icon name="moon" /></View><View style={s.flexible}><Text style={s.cardTitle}>Busy reply</Text><Text style={s.small}>{busy ? 'Your busy reply is selected' : 'Ready when you need a little space'}</Text></View></View><Switch accessibilityLabel="Select busy reply preference" value={busy} onValueChange={setBusy} trackColor={{ false: '#DCE5DF', true: '#80B49B' }} thumbColor="#FFFFFF" /></View>
      <Text style={s.note}>Choose your reply preference. Silent mode is managed in your phone settings.</Text>
      <Pressable accessibilityRole="button" onPress={() => Linking.openSettings().catch(() => setError('Could not open settings.'))} style={[s.textAction, { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 }]}><Text style={s.link}>Open phone settings</Text><Icon name="arrow" size={15} /></Pressable>
    </Card>
    {important.length > 0 && <><Section title="Worth your attention" action="View inbox" onPress={() => router.push('/inbox')} />
      <Card>{important.slice(0, 2).map((message, index) => <View key={message.id}>
        {index > 0 && <View style={s.divider} />}
        <View style={[s.row, { marginBottom: 9 }]}><Text style={[s.label, { marginBottom: 0 }]}>{message.source}</Text><Badge label="Important" warning /></View>
        <Text style={s.message} numberOfLines={2}>{message.text}</Text>
      </View>)}</Card></>}
    <Section title="Make room for your plans" />
    <Card>
      <View style={s.inline}><View style={s.iconBox}><Icon name="calendar" /></View><View style={s.flexible}><Text style={s.cardTitle}>Add a calendar event</Text><Text style={s.small}>Keep the next thing on your calendar.</Text></View></View>
      <Field label="Event title" placeholder="e.g. Team meeting" value={title} onChangeText={setTitle} />
      <Field label="Date & time" placeholder="YYYY-MM-DDTHH:mm" value={date} onChangeText={setDate} autoCapitalize="none" />
      <Text style={[s.note, { marginBottom: 16 }]}>Local time · 1 hour · Review before saving</Text>
      <Button label="Review calendar event" icon="plus" variant="secondary" onPress={calendar} />
    </Card>
  </Screen>;
}
