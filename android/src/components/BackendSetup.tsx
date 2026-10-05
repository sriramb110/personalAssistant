import { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Card, Field, Notice } from './ui';
import { styles as s } from '../theme/styles';

export function BackendSetup() {
  const [url, setUrl] = useState('');
  return <Card>
    <View style={s.row}><Text style={s.cardTitle}>Personal backend</Text><Badge label="Setup pending" warning /></View>
    <Field label="Backend server URL" placeholder="https://your-backend.example.com" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
    <Text style={s.note}>Sync will copy your messages, call notification text, preferences and drafts to this server. Google client IDs and Google access tokens stay outside the snapshot.</Text>
    <Text style={s.note}>The local inbox will continue to work offline. Restoring server data will require confirmation before replacing the local copy. Google Drive backup stays separate.</Text>
    <Notice>Backend upload is not enabled yet. Server setup must be completed before connecting.</Notice>
  </Card>;
}
