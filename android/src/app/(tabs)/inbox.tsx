import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Badge, Button, Card, Field, Notice, Section } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icon';
import { useAssistant } from '../../providers/AssistantProvider';
import { colors, styles as s } from '../../theme/styles';
import { isImportantMessage } from '../../utils/messages';

const sourceIcons: Record<string, IconName> = { WhatsApp: 'message', SMS: 'phone', Email: 'mail' };
export default function InboxScreen() {
  const { messages, setMessages, important, setImportant, speak, source, setSource, draft, setDraft, notifications } = useAssistant();
  const [search, setSearch] = useState('');
  const priorityCount = messages.filter(message => message.important).length;
  const visible = messages.filter(message => (!important || message.important) && `${message.source} ${message.text}`.toLowerCase().includes(search.toLowerCase()));
  function addMessage() {
    if (!draft.trim()) return;
    const id = String(Math.max(0, ...messages.map(message => Number(message.id)).filter(Number.isFinite)) + 1);
    setMessages([{ id, source, text: draft.trim(), important: isImportantMessage(draft) }, ...messages]);
    setDraft(''); setImportant(false);
  }
  return <Screen title="Your inbox" subtitle="The messages that matter. All in one calm space.">
    <View style={[s.input, s.inline, { marginBottom: 16 }]}><Icon name="inbox" color={colors.muted} size={18} /><TextInput accessibilityLabel="Search saved messages" placeholder="Search your saved messages" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={[s.flexible, { color: colors.ink, fontSize: 13, paddingVertical: 0 }]} /></View>
    <View style={s.filterBar}>{[{ label: `Important · ${priorityCount}`, selected: true }, { label: `All updates · ${messages.length}`, selected: false }].map(filter =>
      <Pressable key={filter.label} accessibilityRole="tab" accessibilityState={{ selected: important === filter.selected }} onPress={() => setImportant(filter.selected)} style={[s.filter, important === filter.selected && s.filterActive]}><Text style={[s.filterText, important === filter.selected && { color: colors.green }]}>{filter.label}</Text></Pressable>)}</View>
    <Notice>{notifications.settings.granted ? 'Notification access is on. Select WhatsApp and SMS in Settings to save new alerts here.' : 'Connect WhatsApp and SMS notification access in Settings. Sample and manually added messages also appear here.'}</Notice>
    <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} style={[s.textAction, { alignSelf: 'flex-start', marginBottom: 12 }]}><Text style={s.link}>Manage message notification access</Text></Pressable>
    {visible.length === 0 && <Card><View style={s.empty}><View style={s.iconBox}><Icon name="check" size={25} /></View><Text style={s.cardTitle}>{search ? 'No matching messages' : 'Nothing to catch up on'}</Text><Text style={s.small}>{search ? 'Try another name or keyword.' : 'Add a message below, or view all updates.'}</Text></View></Card>}
    {visible.map(message => <Card key={message.id}>
      <View style={s.row}><View style={[s.inline, s.flexible]}><View style={[s.iconBox, { width: 36, height: 36, borderRadius: 12 }]}><Icon name={sourceIcons[message.source.split(' · ')[0]] || 'message'} size={17} /></View><Text style={[s.label, s.flexible, { marginBottom: 0 }]}>{message.source}</Text></View>{message.important && <Badge label="Important" warning />}</View>
      <Text style={[s.message, { marginTop: 15 }]}>{message.text}</Text>
      {message.origin === 'notification' && <Text style={s.note}>Saved from notification{message.receivedAt ? ` · ${new Date(message.receivedAt).toLocaleString()}` : ''}</Text>}
      <View style={s.messageActions}>
        <Pressable accessibilityRole="button" accessibilityLabel={message.important ? 'Unmark important' : 'Mark important'} onPress={() => setMessages(messages.map(item => item.id === message.id ? { ...item, important: !item.important } : item))} style={[s.textAction, s.inline]}><Icon name="star" size={16} color={message.important ? colors.amber : colors.muted} /><Text style={[s.link, { color: message.important ? colors.amber : colors.muted }]}>{message.important ? 'Important' : 'Mark priority'}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => speak(message.text)} style={[s.textAction, s.inline]}><Icon name="headphones" size={16} /><Text style={s.link}>Listen</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Remove message" onPress={() => Alert.alert('Remove message?', 'This removes the message from your local inbox.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => setMessages(messages.filter(item => item.id !== message.id)) }])} style={s.textAction}><Icon name="trash" size={17} color={colors.muted} /></Pressable>
      </View>
    </Card>)}
    <Section title="Add an update" />
    <Card>
      <Text style={s.cardTitle}>Something to keep track of?</Text><Text style={s.note}>Paste a message in Tamil or English.</Text>
      <View style={s.sourceRow}>{['WhatsApp', 'SMS', 'Email'].map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: source === item }} onPress={() => setSource(item)} style={[s.chip, source === item && s.chipActive]}><Icon name={sourceIcons[item]} size={15} color={source === item ? colors.green : colors.muted} /><Text style={[s.link, { color: source === item ? colors.green : colors.muted }]}>{item}</Text></Pressable>)}</View>
      <Field label="Message" placeholder="Type or paste your message here…" multiline value={draft} onChangeText={setDraft} />
      <View style={{ marginTop: 16 }}><Button label="Save to my inbox" icon="plus" onPress={addMessage} disabled={!draft.trim()} /></View>
      <Text style={s.note}>Saved on your device. Local keywords suggest priority.</Text>
    </Card>
  </Screen>;
}
