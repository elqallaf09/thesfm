import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePresentation } from './presentation';

export function TvButton({ children, onPress, selected = false, initial = false, label, style, disabled = false }: {
  children: ReactNode; onPress: () => void; selected?: boolean; initial?: boolean; label?: string; style?: StyleProp<ViewStyle>; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const { colors } = usePresentation();
  return <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled }}
    hasTVPreferredFocus={initial} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPress={onPress}
    style={[styles.button, { backgroundColor: colors.panel, borderColor: colors.muted, opacity: disabled ? .5 : 1 }, selected && { borderColor: colors.border }, focused && { borderColor: colors.border, borderWidth: 4 }, style]}>
    {typeof children === 'string' ? <Text style={[styles.label, { color: colors.text, fontSize: 26 }]}>{children}</Text> : children}
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
