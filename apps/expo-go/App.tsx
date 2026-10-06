import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type ProductId = 'finance' | 'investor' | 'business';
type Session = { accessToken: string; refreshToken: string; expiresAt: number };
type FinanceSummary = {
  currency: string | null;
  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  monthlyNet: number | null;
  trackedPosition: number | null;
  activeDebtCount: number;
};
type Instrument = { displaySymbol?: string; symbol: string; displayName?: string; name: string; marketName?: string; currency?: string };

const extra = Constants.expoConfig?.extra ?? {};
const product = (extra.sfmProduct ?? 'finance') as ProductId;
const apiBaseUrl = String(extra.apiBaseUrl ?? 'https://www.the-sfm.com').replace(/\/$/, '');
const colors = product === 'business'
  ? { accent: '#A78BFA', surface: '#171127', card: '#2A2040' }
  : product === 'investor'
    ? { accent: '#38BDF8', surface: '#08131C', card: '#102634' }
    : { accent: '#19C5B7', surface: '#07191A', card: '#103033' };

export default function App() {
  if (product === 'finance') return <FinanceApp />;
  if (product === 'investor') return <InvestorApp />;
  return <BusinessApp />;
}

function FinanceApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const restoreSession = useCallback(async () => {
    try {
      const saved = await SecureStore.getItemAsync('sfm-finance-session');
      if (saved) setSession(await refreshFinanceSession(JSON.parse(saved) as Session));
    } catch {
      await SecureStore.deleteItemAsync('sfm-finance-session');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void restoreSession(); }, [restoreSession]);

  async function signIn() {
    const url = String(extra.supabaseUrl ?? '').replace(/\/$/, '');
    const key = String(extra.supabaseAnonKey ?? '');
    if (!url || !key) return Alert.alert('الإعدادات ناقصة', 'أضف إعدادات Supabase العامة في ملف .env ثم أعد تشغيل Expo.');
    setLoading(true);
    try {
      const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!response.ok) throw new Error('INVALID_CREDENTIALS');
      const next = toSession(await response.json());
      await SecureStore.setItemAsync('sfm-finance-session', JSON.stringify(next));
      setSession(next);
    } catch {
      Alert.alert('تعذر تسجيل الدخول', 'تحقق من البريد وكلمة المرور والإعدادات.');
    } finally { setLoading(false); }
  }

  async function loadSummary() {
    if (!session) return;
    setLoading(true);
    try {
      const active = await refreshFinanceSession(session);
      setSession(active);
      const response = await fetch(`${apiBaseUrl}/api/mobile/finance/summary`, { headers: { Authorization: `Bearer ${active.accessToken}` } });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error('SUMMARY_UNAVAILABLE');
      setSummary(data.summary as FinanceSummary);
    } catch {
      setSummary(null);
      Alert.alert('تعذر تحميل ملخصك', 'تحقق من الشبكة ثم أعد المحاولة.');
    } finally { setLoading(false); }
  }

  async function signOut() {
    await SecureStore.deleteItemAsync('sfm-finance-session');
    setSession(null); setSummary(null);
  }

  if (loading && !session) return <LoadingScreen />;
  if (!session) return <Shell title="THE SFM Finance"><Text style={styles.heading}>المال الشخصي</Text><Text style={styles.muted}>سجّل دخولك للوصول إلى ملخص مالي محمي.</Text><TextInput value={email} onChangeText={setEmail} placeholder="البريد الإلكتروني" placeholderTextColor="#90A4A5" autoCapitalize="none" keyboardType="email-address" style={styles.input}/><TextInput value={password} onChangeText={setPassword} placeholder="كلمة المرور" placeholderTextColor="#90A4A5" secureTextEntry style={styles.input}/><Action title="تسجيل الدخول" onPress={signIn} /><Text style={styles.note}>تُحفظ الجلسة في التخزين الآمن للجهاز؛ لا تُحفظ كلمة المرور.</Text></Shell>;
  return <Shell title="THE SFM Finance"><Text style={styles.heading}>ملخصك المالي</Text><Action title={loading ? 'جارٍ التحديث…' : 'تحديث البيانات'} onPress={loadSummary} disabled={loading}/>{summary ? <View style={styles.grid}>{metric('المركز المالي', money(summary.trackedPosition, summary.currency))}{metric('الدخل الشهري', money(summary.monthlyIncome, summary.currency))}{metric('المصروفات', money(summary.monthlyExpenses, summary.currency))}{metric('صافي الشهر', money(summary.monthlyNet, summary.currency))}</View> : <Text style={styles.muted}>اضغط تحديث لطلب ملخصك من الخادم.</Text>}<Action title="تسجيل الخروج" onPress={signOut} secondary /></Shell>;
}

function InvestorApp() {
  const [items, setItems] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/markets?limit=12&quality=complete`);
      const body = await response.json();
      if (!response.ok) throw new Error();
      setItems(body.markets ?? []);
    } catch { Alert.alert('تعذر تحميل الأسواق', 'تحقق من الشبكة ثم أعد المحاولة.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  return <Shell title="THE SFM Investor"><Text style={styles.heading}>الأسواق</Text><Text style={styles.muted}>دليل سوق أصلي. المعلومات ليست توصية استثمارية.</Text><Action title={loading ? 'جارٍ التحديث…' : 'تحديث القائمة'} onPress={load} disabled={loading}/><FlatList data={items} keyExtractor={(item) => item.displaySymbol ?? item.symbol} renderItem={({ item }) => <View style={styles.row}><View><Text style={styles.rowTitle}>{item.displayName || item.name}</Text><Text style={styles.muted}>{item.marketName || 'سوق عالمي'}</Text></View><View><Text style={styles.code}>{item.displaySymbol || item.symbol}</Text><Text style={styles.muted}>{item.currency || ''}</Text></View></View>} ListEmptyComponent={loading ? <ActivityIndicator color={colors.accent}/> : <Text style={styles.muted}>لا توجد أدوات متاحة.</Text>}/></Shell>;
}

function BusinessApp() {
  const areas = [['المشاريع', 'ابدأ ونظّم سير العمل والمواعيد.'], ['العملاء', 'اجمع علاقات العملاء وبيانات التواصل.'], ['الفواتير', 'أنشئ وتابع التحصيل عبر مساحة مستقلة.']];
  return <Shell title="THE SFM Business"><Text style={styles.heading}>مساحة العمل</Text><Text style={styles.muted}>إدارة الأعمال منفصلة عن المال الشخصي والاستثمار.</Text>{areas.map(([title, text]) => <View key={title} style={styles.businessCard}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.muted}>{text}</Text></View>)}<Text style={styles.note}>ستُربط هذه الوحدات بواجهات أعمال محمية قبل عرض بياناتك الحية.</Text></Shell>;
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) { return <SafeAreaView style={styles.safe}><StatusBar style="light"/><ScrollView contentContainerStyle={styles.page}><Text style={styles.brand}>{title}</Text>{children}</ScrollView></SafeAreaView>; }
function LoadingScreen() { return <Shell title="THE SFM Finance"><ActivityIndicator color={colors.accent} size="large"/></Shell>; }
function Action({ title, onPress, disabled, secondary }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) { return <Pressable onPress={onPress} disabled={disabled} style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text></Pressable>; }
function metric(label: string, value: string) { return <View style={styles.metric} key={label}><Text style={styles.muted}>{label}</Text><Text style={styles.value}>{value}</Text></View>; }
function money(value: number | null, currency: string | null) { return value == null || !currency ? '—' : `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`; }
function toSession(token: { access_token: string; refresh_token: string; expires_in: number }): Session { return { accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: Date.now() + token.expires_in * 1000 }; }
async function refreshFinanceSession(active: Session) {
  if (active.expiresAt > Date.now() + 60_000) return active;
  const url = String(extra.supabaseUrl ?? '').replace(/\/$/, '');
  const key = String(extra.supabaseAnonKey ?? '');
  if (!url || !key) throw new Error('SUPABASE_NOT_CONFIGURED');
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: active.refreshToken }),
  });
  if (!response.ok) throw new Error('SESSION_EXPIRED');
  const token = await response.json();
  const refreshed = toSession(token);
  await SecureStore.setItemAsync('sfm-finance-session', JSON.stringify(refreshed));
  return refreshed;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface }, page: { padding: 22, gap: 14, direction: 'rtl' }, brand: { color: colors.accent, fontSize: 18, fontWeight: '800', textAlign: 'right' }, heading: { color: '#F5FBFB', fontSize: 30, fontWeight: '800', textAlign: 'right', marginTop: 12 }, muted: { color: '#B7CDD0', fontSize: 15, lineHeight: 22, textAlign: 'right' }, note: { color: '#90A4A5', fontSize: 13, lineHeight: 19, textAlign: 'right', marginTop: 8 }, input: { minHeight: 52, backgroundColor: colors.card, color: '#F5FBFB', borderRadius: 14, paddingHorizontal: 14, textAlign: 'right', fontSize: 16 }, button: { minHeight: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.accent, borderRadius: 14, paddingHorizontal: 18 }, secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: '#456064' }, disabled: { opacity: 0.55 }, buttonText: { color: '#061416', fontSize: 16, fontWeight: '800' }, secondaryText: { color: '#F5FBFB' }, grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 }, metric: { width: '47%', minHeight: 102, backgroundColor: colors.card, borderRadius: 18, padding: 14, justifyContent: 'space-between' }, value: { color: '#F5FBFB', fontSize: 17, fontWeight: '800', textAlign: 'right' }, row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 15, marginTop: 10 }, rowTitle: { color: '#F5FBFB', fontSize: 17, fontWeight: '700', textAlign: 'right', marginBottom: 4 }, code: { color: colors.accent, fontSize: 15, fontWeight: '800', textAlign: 'left' }, businessCard: { backgroundColor: colors.card, borderRadius: 18, padding: 18, gap: 4 },
});
