import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AssistantProvider } from '../providers/AssistantProvider';
import '../services/backupTask';
export default function RootLayout() {
    return <AssistantProvider><StatusBar style="dark"/><Stack screenOptions={{ headerShown: false }}/></AssistantProvider>;
}
