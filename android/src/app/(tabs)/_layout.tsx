import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/Icon';
import { colors } from '../../theme/styles';

const screens: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Today', icon: 'home' }, { name: 'inbox', title: 'Inbox', icon: 'inbox' },
  { name: 'calls', title: 'Calls', icon: 'phone' }, { name: 'settings', title: 'Settings', icon: 'settings' },
];
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{
    headerShown: false, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: colors.border, height: 74 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8), elevation: 0 },
    tabBarLabelStyle: { fontSize: 10, lineHeight: 14, fontWeight: '600', marginTop: 0 }
  }}>
    {screens.map(screen => <Tabs.Screen key={screen.name} name={screen.name} options={{
      title: screen.title,
      tabBarIcon: ({ color, focused }) => <View style={{ backgroundColor: focused ? colors.pale : 'transparent', paddingHorizontal: 17, paddingVertical: 5, borderRadius: 12 }}><Icon name={screen.icon} color={color} size={21} /></View>
    }} />)}
  </Tabs>;
}