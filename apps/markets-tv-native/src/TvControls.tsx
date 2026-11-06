import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export function TvButton({ children, onPress, selected = false, initial = false, label, style }: {
  children: ReactNode; onPress: () => void; selected?: boolean; initial?: boolean; label?: string; style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }}
    hasTVPreferredFocus={initial} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPress={onPress}
    style={[styles.button, selected && styles.selected, focused && styles.focused, style]}>
    {typeof children === 'string' ? <Text style={styles.label}>{children}</Text> : children}
  </Pressable>;
}
export function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}
export const styles = StyleSheet.create({
  button: { minHeight: 54, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 2, borderColor: '#303943', borderRadius: 12, backgroundColor: '#0E141C', justifyContent: 'center' },
  selected: { borderColor: '#D4AF6A' }, focused: { borderColor: '#F7DFAC', backgroundColor: '#25303E', transform: [{ scale: 1.02 }] },
  label: { color: '#F0F2F5', fontSize: 20, fontFamily: 'SfmArabic' },
  metric: { flex: 1, minWidth: 160, padding: 20, borderRadius: 16, backgroundColor: '#101822', gap: 8 },
  value: { color: '#F0F2F5', fontSize: 38, fontVariant: ['tabular-nums'], writingDirection: 'ltr' },
});
