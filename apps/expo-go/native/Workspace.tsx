import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { product } from './api';
import { resourceFor, shortcuts } from './catalog';
import { consumeDetailBack, onAuthChanged, onNavigate, openScreen } from './navigation';
import { AuthGate, AccountScreen } from './AccountScreen';
import { RecordScreen } from './RecordScreen';
import { MarketScreen } from './MarketScreen';
import { ReportsScreen, ZakatScreen } from './ToolsScreen';
import { accent, Button, Copy, Page, Title } from './ui';

export function NativeWorkspace({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<string[]>([]); const [generation, setGeneration] = useState(0);
  const path = stack.at(-1);
  const back = useCallback(() => { if (consumeDetailBack()) return true; if (!path) return false; setStack(previous => previous.slice(0, -1)); return true; }, [path]);
  useEffect(() => onNavigate(next => { setStack(previous => previous.at(-1) === next ? previous : [...previous, next]); }), []);
  useEffect(() => onAuthChanged(() => setGeneration(value => value + 1)), []);
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', back); return () => sub.remove(); }, [back]);
  const signOut = () => { setStack([]); setGeneration(value => value + 1); };
  return <View style={{ flex: 1, backgroundColor: '#0B0D12' }}>
    <View key={generation} style={{ flex: 1, display: path ? 'none' : 'flex' }}>{children}</View>
    {path ? <SafeAreaView style={{ flex: 1 }}><StatusBar style="light" /><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={back} style={styles.back}><Text style={{ color: accent, fontSize: 16 }}>رجوع →</Text></Pressable><Text style={styles.brand}>THE SFM {product.toUpperCase()}</Text></View>
      <ScrollView horizontal style={{ flexGrow: 0, maxHeight: 58 }} contentContainerStyle={styles.shortcuts} showsHorizontalScrollIndicator={false}>{shortcuts[product].map(([target, label]) => <Pressable key={target} accessibilityRole="tab" accessibilityState={{ selected: path === target }} onPress={() => setStack([target])} style={[styles.shortcut, path === target && { borderColor: accent }]}><Text style={{ color: path === target ? accent : '#ADB9D0' }}>{label}</Text></Pressable>)}</ScrollView>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen key={path} path={path} onSignOut={signOut} /></KeyboardAvoidingView>
    </SafeAreaView> : null}
  </View>;
}
function Screen({ path, onSignOut }: { path: string; onSignOut: () => void }) {
  if (path === '/zakat-calculator' || path === '/zakat') return <ZakatScreen />;
  if (path.startsWith('/symbol-details/') || ['/global-markets', '/sharia-stocks', '/market-news'].includes(path)) return <MarketScreen path={path} />;
  const resource = resourceFor(path, product);
  if (resource) return <AuthGate><RecordScreen resource={resource} /></AuthGate>;
  if (['/profile', '/security', '/login'].includes(path)) return <AuthGate><AccountScreen security={path === '/security'} onSignOut={onSignOut} /></AuthGate>;
  if (['/reports-center', '/reports', '/income/month-close', '/decisions'].includes(path) && product !== 'investor') return <AuthGate><ReportsScreen path={path} /></AuthGate>;
  return <Page><Title>مساحة {product === 'business' ? 'الأعمال' : product === 'finance' ? 'المال الشخصي' : 'المستثمر'}</Title><Copy>اختر القسم الذي تريد إدارته.</Copy>{shortcuts[product].map(([target, label]) => <Button key={target} title={label} onPress={() => openScreen(target)} />)}</Page>;
}
const styles = StyleSheet.create({ header: { minHeight: 56, paddingHorizontal: 18, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#2B3441' }, brand: { color: '#EEF4FF', fontSize: 13, fontWeight: '800' }, back: { minWidth: 72, minHeight: 48, justifyContent: 'center' }, shortcuts: { padding: 8, gap: 8, flexDirection: 'row-reverse' }, shortcut: { minHeight: 40, paddingHorizontal: 14, borderWidth: 1, borderColor: '#2B3441', borderRadius: 12, justifyContent: 'center' } });
