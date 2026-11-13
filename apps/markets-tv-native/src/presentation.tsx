import { createContext, useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Language } from './api';
export const Presentation = createContext({ language: 'ar' as Language, light: false });
export const palette = (light: boolean) => light ? { bg: '#F1F3F6', panel: '#FFFFFF', text: '#101822', muted: '#435166', border: '#9B7A38', up: '#126745', down: '#B02626' }
  : { bg: '#06080C', panel: '#101822', text: '#F0F2F5', muted: '#B7C1D0', border: '#D4AF6A', up: '#86D7B6', down: '#F19B9B' };
export function usePresentation() {
  const { language, light } = useContext(Presentation), colors = palette(light);
  return { language, light, colors, row: { flexDirection: language === 'ar' ? 'row-reverse' as const : 'row' as const },
    align: { textAlign: language === 'ar' ? 'right' as const : 'left' as const } };
}
export function Label({ children, muted = false, large = false }: { children: React.ReactNode; muted?: boolean; large?: boolean }) {
  const { colors, align } = usePresentation();
  return <Text style={[base.text, align, { color: muted ? colors.muted : colors.text, fontSize: large ? 38 : 26 }]}>{children}</Text>;
}
export function Panel({ children }: { children: React.ReactNode }) {
  const { colors } = usePresentation();
  return <View style={[base.panel, { backgroundColor: colors.panel }]}>{children}</View>;
}
export const kuwaitDate = (date: string | number | null) => date !== null && Number.isFinite(new Date(date).getTime())
  ? new Date(date).toLocaleString('en-GB', { timeZone: 'Asia/Kuwait' }) : '—';
export const money = (amount: number | null, currency: string | null) => amount === null ? '—' : `${new Intl.NumberFormat('en-US', { minimumFractionDigits: currency === 'KWD' ? 3 : 2, maximumFractionDigits: currency === 'KWD' ? 3 : 2 }).format(amount)} ${currency || ''}`;
const base = StyleSheet.create({ text: { fontFamily: 'SfmArabic', flexShrink: 1 }, panel: { borderRadius: 18, padding: 24, gap: 14 } });
