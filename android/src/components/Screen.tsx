import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAssistant } from '../providers/AssistantProvider';
import { colors, styles as s } from '../theme/styles';
import { Icon } from './Icon';

export function Screen({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { tamil, setTamil, error, setError, ready } = useAssistant();
  const pathname = usePathname();
  useEffect(() => { if (ready) setError(''); }, [pathname, setError, ready]);
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.root}>
    <View style={s.header}>
      <View style={s.brandGroup}><View style={s.brandMark}><Icon name="spark" color={colors.lime} size={23} /></View><View><Text style={s.brand}>anbu</Text><Text style={s.brandSub}>YOUR EVERYDAY ASSISTANT</Text></View></View>
      <Pressable disabled={!ready} accessibilityRole="button" accessibilityLabel={tamil ? 'Switch to English' : 'Switch to Tamil'} onPress={() => setTamil(!tamil)} style={s.language}>
        <Icon name="language" size={17} /><Text style={s.link}>{tamil ? 'தமிழ்' : 'EN'}</Text>
      </Pressable>
    </View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!!error && <Pressable accessibilityRole="button" accessibilityLabel="Dismiss error" onPress={() => setError('')}><Text accessibilityRole="alert" style={s.error}>{error}</Text></Pressable>}
        <Text style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text>
        {ready ? children : <View style={s.empty}><ActivityIndicator color={colors.green} /><Text style={s.note}>{error || 'Loading your saved data…'}</Text></View>}
        <View style={s.footer}><Icon name="shield" size={12} color={colors.muted} /><Text style={s.footerText}>Your everyday data, saved on your device.</Text></View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
