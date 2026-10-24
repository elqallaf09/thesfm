import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { product } from './api';
export const accent = { finance: '#5EEAD4', investor: '#79ADEF', business: '#A78BFA' }[product];
export function Button({ title, onPress, secondary = false, danger = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; danger?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.button, secondary && s.secondary, danger && s.danger, disabled && { opacity: .45 }]}><Text style={[s.buttonText, secondary && { color: accent }, danger && { color: '#FB7185' }]}>{title}</Text></Pressable>;
}
export function Input({ label, value, onChange, numeric = false, secret = false, email = false, multiline = false }: { label: string; value: string; onChange: (value: string) => void; numeric?: boolean; secret?: boolean; email?: boolean; multiline?: boolean }) {
  return <View style={{ gap: 6 }}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType={numeric ? 'decimal-pad' : email ? 'email-address' : 'default'} autoCapitalize={email ? 'none' : 'sentences'} secureTextEntry={secret} multiline={multiline} style={[s.input, multiline && { minHeight: 90, textAlignVertical: 'top' }]} placeholderTextColor="#99A4BA" /></View>;
}
export function Page({ children }: { children: ReactNode }) { return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}><View style={s.container}>{children}</View></ScrollView>; }
export function Card({ children }: { children: ReactNode }) { return <View style={s.card}>{children}</View>; }
export function Title({ children }: { children: ReactNode }) { return <Text style={s.title}>{children}</Text>; }
export function Copy({ children }: { children: ReactNode }) { return <Text style={s.copy}>{children}</Text>; }
export function Busy() { return <ActivityIndicator accessibilityLabel="جارٍ التحميل" size="large" color={accent} style={{ margin: 24 }} />; }
export function ErrorNote({ text }: { text: string }) { return text ? <Text accessibilityRole="alert" style={s.error}>{text}</Text> : null; }
export const s = StyleSheet.create({
  page: { flexGrow: 1, padding: 18, paddingBottom: 36 }, container: { width: '100%', maxWidth: 1120, alignSelf: 'center', gap: 14 },
  card: { backgroundColor: '#141820', borderColor: '#2B3441', borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  title: { fontSize: 23, lineHeight: 34, fontWeight: '800', color: '#EEF4FF', textAlign: 'right' },
  copy: { fontSize: 14, lineHeight: 23, color: '#B6C1D8', textAlign: 'right' }, label: { color: '#EDF1FB', fontSize: 14, textAlign: 'right' },
  input: { borderColor: '#505F79', borderWidth: 1, borderRadius: 12, backgroundColor: '#0D1320', color: '#F0F4FF', minHeight: 50, padding: 13, fontSize: 16, textAlign: 'right' },
  button: { minHeight: 48, padding: 12, borderRadius: 12, backgroundColor: accent, justifyContent: 'center', alignItems: 'center' },
  secondary: { backgroundColor: '#18212F', borderColor: '#3B4860', borderWidth: 1 }, danger: { backgroundColor: '#361820', borderColor: '#884051', borderWidth: 1 },
  buttonText: { color: '#0A111B', fontSize: 14, fontWeight: '800', textAlign: 'center' }, error: { color: '#FFBFBC', backgroundColor: '#341C23', padding: 14, borderRadius: 12, textAlign: 'right', lineHeight: 22 },
  row: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  field: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2B3441', gap: 6 },
});
