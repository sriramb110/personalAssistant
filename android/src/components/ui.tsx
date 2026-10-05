import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, styles as s } from '../theme/styles';
import { Icon, type IconName } from './Icon';

export function Button({ label, onPress, icon, variant = 'primary', disabled = false, loading = false }: {
  label: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'secondary' | 'ghost' | 'hero'; disabled?: boolean; loading?: boolean;
}) {
  const light = variant === 'secondary' || variant === 'ghost' || variant === 'hero';
  const color = variant === 'hero' ? colors.ink : light ? colors.green : '#FFFFFF';
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [s.button, variant === 'secondary' && s.secondaryButton, variant === 'ghost' && s.ghostButton, variant === 'hero' && s.heroButton, (disabled || loading) && s.disabled, pressed && { opacity: .8 }]}>
    {loading ? <ActivityIndicator size="small" color={color} /> : icon && <Icon name={icon} size={18} color={color} />}
    <Text style={[s.buttonText, { color }]}>{label}</Text>
  </Pressable>;
}
export function Card({ children }: { children: ReactNode }) { return <View style={s.card}>{children}</View>; }
export function Field({ label, multiline, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return <View style={s.fieldGroup}><Text style={s.label}>{label}</Text><TextInput {...props} accessibilityLabel={label} multiline={multiline} placeholderTextColor="#86948D"
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[s.input, focused && s.focusedInput, multiline && { minHeight: 112, textAlignVertical: 'top' }]} /></View>;
}
export function Badge({ label, warning = false }: { label: string; warning?: boolean }) {
  return <View style={[s.badge, warning && { backgroundColor: colors.amberBg }]}><Text style={[s.badgeText, warning && { color: colors.amber }]}>{label}</Text></View>;
}
export function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={s.sectionRow}><Text style={s.section}>{title}</Text>{action && <Pressable accessibilityRole="button" onPress={onPress} style={s.textAction}><Text style={s.link}>{action}</Text></Pressable>}</View>;
}
export function Notice({ children, icon = 'info' }: { children: string; icon?: IconName }) {
  return <View style={s.notice}><Icon name={icon} size={17} /><Text style={s.noticeText}>{children}</Text></View>;
}
