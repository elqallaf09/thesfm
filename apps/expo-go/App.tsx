import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
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
type BusinessSummary = {
  currency: string | null;
  projectCount: number;
  customerCount: number;
  supplierCount: number;
  activeEmployeeCount: number;
  invoiceCount: number;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  outstandingInvoiceAmount: number | null;
  monthlySales: number | null;
  monthlyOperatingExpenses: number | null;
  monthlyOperatingNet: number | null;
  refreshedAt: string;
};
type Instrument = {
  displaySymbol?: string;
  symbol: string;
  displayName?: string;
  name: string;
  assetType?: string;
  marketName?: string;
  currency?: string;
  source?: string;
  sector?: string;
  shariahStatus?: string;
};
type ApiBody = Record<string, unknown> & { ok?: boolean; code?: string };

const extra = Constants.expoConfig?.extra ?? {};
const product = (extra.sfmProduct ?? 'finance') as ProductId;
const apiBaseUrl = String(extra.apiBaseUrl ?? 'https://www.the-sfm.com').replace(/\/$/, '');
const FINANCE_SESSION_KEY = 'sfm-finance-session';
const BUSINESS_SESSION_KEY = 'sfm-business-session';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const restoreSession = useCallback(async () => {
    try {
      const saved = await SecureStore.getItemAsync(FINANCE_SESSION_KEY);
      if (saved) setSession(await refreshSession(JSON.parse(saved) as Session, FINANCE_SESSION_KEY));
    } catch {
      await SecureStore.deleteItemAsync(FINANCE_SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const loadSummary = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const active = await refreshSession(session, FINANCE_SESSION_KEY);
      if (active.accessToken !== session.accessToken) setSession(active);

      const response = await fetchWithTimeout(`${apiBaseUrl}/api/mobile/finance/summary`, {
        headers: { Authorization: `Bearer ${active.accessToken}` },
      });
      const data = await responseJson(response);
      if (!response.ok || !data?.ok) throw new Error(data?.code ?? 'SUMMARY_UNAVAILABLE');

      setSummary(data.summary as FinanceSummary);
      setLastUpdatedAt(new Date());
    } catch (error) {
      if (isSessionError(error)) {
        await SecureStore.deleteItemAsync(FINANCE_SESSION_KEY);
        setSession(null);
        setSummary(null);
        Alert.alert('انتهت الجلسة', 'سجّل الدخول مرة أخرى لحماية بياناتك المالية.');
        return;
      }
      setErrorMessage('تعذر تحميل ملخصك. تحقق من الشبكة ثم أعد المحاولة.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) void loadSummary();
  }, [session, loadSummary]);

  async function signIn() {
    const url = String(extra.supabaseUrl ?? '').replace(/\/$/, '');
    const key = String(extra.supabaseAnonKey ?? '');
    if (!url || !key) {
      Alert.alert('الإعدادات ناقصة', 'أضف إعدادات Supabase العامة في ملف .env ثم أعد تشغيل Expo.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithTimeout(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = await responseJson(response);
      if (!response.ok || !payload) throw new Error(`AUTH_${response.status}`);

      const next = toSession(payload);
      await SecureStore.setItemAsync(FINANCE_SESSION_KEY, JSON.stringify(next));
      setSummary(null);
      setErrorMessage(null);
      setLastUpdatedAt(null);
      setPassword('');
      setSession(next);
    } catch (error) {
      Alert.alert('تعذر تسجيل الدخول', signInErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await SecureStore.deleteItemAsync(FINANCE_SESSION_KEY);
    setSession(null);
    setSummary(null);
    setErrorMessage(null);
    setLastUpdatedAt(null);
  }

  if (loading && !session) return <LoadingScreen />;

  if (!session) {
    return (
      <Shell title="THE SFM Finance">
        <Text style={styles.heading}>المال الشخصي</Text>
        <Text style={styles.muted}>سجّل دخولك للوصول إلى ملخص مالي محمي.</Text>
        <TextInput
          accessibilityLabel="البريد الإلكتروني"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="البريد الإلكتروني"
          placeholderTextColor="#90A4A5"
          style={styles.input}
          textAlign="right"
          value={email}
        />
        <TextInput
          accessibilityLabel="كلمة المرور"
          autoComplete="password"
          onChangeText={setPassword}
          placeholder="كلمة المرور"
          placeholderTextColor="#90A4A5"
          secureTextEntry
          style={styles.input}
          textAlign="right"
          value={password}
        />
        <Action title="تسجيل الدخول" onPress={signIn} />
        <Text style={styles.note}>تُحفظ الجلسة في التخزين الآمن للجهاز؛ لا تُحفظ كلمة المرور.</Text>
      </Shell>
    );
  }

  return (
    <Shell title="THE SFM Finance">
      <Text style={styles.heading}>ملخصك المالي</Text>
      <Text style={styles.muted}>يُحدّث الملخص تلقائيًا عند فتح التطبيق.</Text>
      <Action title={loading ? 'جارٍ التحديث…' : 'تحديث البيانات'} onPress={loadSummary} disabled={loading} />
      {errorMessage ? <InlineNotice message={errorMessage} /> : null}
      {summary ? (
        <>
          <View style={styles.grid}>
            {metric('المركز المالي', money(summary.trackedPosition, summary.currency))}
            {metric('الدخل الشهري', money(summary.monthlyIncome, summary.currency))}
            {metric('المصروفات', money(summary.monthlyExpenses, summary.currency))}
            {metric('صافي الشهر', money(summary.monthlyNet, summary.currency))}
          </View>
          <View style={[styles.metric, styles.metricWide]}>
            <Text style={styles.muted}>الديون النشطة</Text>
            <Text style={styles.value}>{summary.activeDebtCount.toLocaleString('ar-KW')}</Text>
          </View>
          <Text style={styles.note}>آخر تحديث: {formatUpdatedAt(lastUpdatedAt)}</Text>
        </>
      ) : (
        <EmptyState message={loading ? 'جارٍ جلب ملخصك المحمي…' : 'لا توجد بيانات معروضة بعد. اضغط تحديث للمحاولة مرة أخرى.'} />
      )}
      <Action title="تسجيل الخروج" onPress={signOut} secondary />
    </Shell>
  );
}

function InvestorApp() {
  const [items, setItems] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [assetType, setAssetType] = useState('all');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetchWithTimeout(`${apiBaseUrl}/api/markets?limit=60&quality=complete`);
      const body = await responseJson(response);
      if (!response.ok || !body) throw new Error('MARKETS_UNAVAILABLE');
      setItems(Array.isArray(body.markets) ? body.markets as Instrument[] : []);
      setLastUpdatedAt(new Date());
    } catch {
      setErrorMessage('تعذر تحميل الأسواق. تحقق من الشبكة ثم أعد المحاولة.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const assetTypes = useMemo(() => [...new Set(items.map((item) => item.assetType).filter(Boolean))] as string[], [items]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const matchesType = assetType === 'all' || item.assetType === assetType;
      const matchesSearch = !normalized || [item.displaySymbol, item.symbol, item.displayName, item.name, item.marketName, item.sector]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(normalized));
      return matchesType && matchesSearch;
    });
  }, [assetType, items, query]);

  return (
    <Shell title="THE SFM Investor" scroll={false}>
      <Text style={styles.heading}>الأسواق</Text>
      <Text style={styles.muted}>دليل سوق أصلي. المعلومات ليست توصية استثمارية.</Text>
      <TextInput
        accessibilityLabel="البحث في الأسواق"
        onChangeText={setQuery}
        placeholder="ابحث بالاسم أو الرمز"
        placeholderTextColor="#90A4A5"
        style={styles.input}
        textAlign="right"
        value={query}
      />
      <Action title={loading ? 'جارٍ التحديث…' : 'تحديث القائمة'} onPress={load} disabled={loading} />
      {errorMessage ? <InlineNotice message={errorMessage} /> : null}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.displaySymbol ?? item.symbol}
        style={styles.marketList}
        contentContainerStyle={styles.marketListContent}
        ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
        ListHeaderComponent={items.length > 0 ? (
          <View style={styles.marketHeader}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <FilterPill active={assetType === 'all'} label="الكل" onPress={() => setAssetType('all')} />
              {assetTypes.map((type) => <FilterPill active={assetType === type} key={type} label={type} onPress={() => setAssetType(type)} />)}
            </ScrollView>
            <Text style={styles.note}>{filteredItems.length.toLocaleString('ar-KW')} أداة متاحة · آخر تحديث: {formatUpdatedAt(lastUpdatedAt)}</Text>
          </View>
        ) : null}
        ListEmptyComponent={
          loading
            ? <ActivityIndicator color={colors.accent} size="large" />
            : <EmptyState message={query ? 'لا توجد أداة تطابق بحثك.' : 'لا توجد أدوات سوق متاحة الآن.'} />
        }
        renderItem={({ item }) => (
          <View style={styles.row} accessibilityLabel={`${item.displayName || item.name}، ${item.displaySymbol || item.symbol}`}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{item.displayName || item.name}</Text>
              <Text style={styles.muted}>{[item.marketName || 'سوق عالمي', item.sector, item.shariahStatus].filter(Boolean).join(' · ')}</Text>
            </View>
            <View style={styles.rowCode}>
              <Text style={styles.code}>{item.displaySymbol || item.symbol}</Text>
              <Text style={styles.muted}>{[item.assetType, item.currency, item.source].filter(Boolean).join(' · ')}</Text>
            </View>
          </View>
        )}
      />
    </Shell>
  );
}

function FilterPill({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.filterPill, active && styles.filterPillActive]}>
      <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function BusinessApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<BusinessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const restoreSession = useCallback(async () => {
    try {
      const saved = await SecureStore.getItemAsync(BUSINESS_SESSION_KEY);
      if (saved) setSession(await refreshSession(JSON.parse(saved) as Session, BUSINESS_SESSION_KEY));
    } catch {
      await SecureStore.deleteItemAsync(BUSINESS_SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const loadSummary = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const active = await refreshSession(session, BUSINESS_SESSION_KEY);
      if (active.accessToken !== session.accessToken) setSession(active);
      const response = await fetchWithTimeout(`${apiBaseUrl}/api/mobile/business/summary`, {
        headers: { Authorization: `Bearer ${active.accessToken}` },
      });
      const data = await responseJson(response);
      if (!response.ok || !data?.ok) throw new Error(data?.code ?? 'SUMMARY_UNAVAILABLE');
      setSummary(data.summary as BusinessSummary);
    } catch (error) {
      if (isSessionError(error)) {
        await SecureStore.deleteItemAsync(BUSINESS_SESSION_KEY);
        setSession(null);
        setSummary(null);
        Alert.alert('انتهت الجلسة', 'سجّل الدخول مرة أخرى لحماية بيانات أعمالك.');
        return;
      }
      setErrorMessage('تعذر تحميل ملخص أعمالك. تحقق من الشبكة ثم أعد المحاولة.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) void loadSummary();
  }, [session, loadSummary]);

  async function signIn() {
    const url = String(extra.supabaseUrl ?? '').replace(/\/$/, '');
    const key = String(extra.supabaseAnonKey ?? '');
    if (!url || !key) {
      Alert.alert('الإعدادات ناقصة', 'أضف إعدادات Supabase العامة في ملف .env ثم أعد تشغيل Expo.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithTimeout(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = await responseJson(response);
      if (!response.ok || !payload) throw new Error(`AUTH_${response.status}`);
      const next = toSession(payload);
      await SecureStore.setItemAsync(BUSINESS_SESSION_KEY, JSON.stringify(next));
      setErrorMessage(null);
      setPassword('');
      setSession(next);
    } catch (error) {
      Alert.alert('تعذر تسجيل الدخول', signInErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await SecureStore.deleteItemAsync(BUSINESS_SESSION_KEY);
    setSession(null);
    setSummary(null);
    setErrorMessage(null);
  }

  if (loading && !session) return <LoadingScreen title="THE SFM Business" />;

  if (!session) {
    return (
      <Shell title="THE SFM Business">
        <Text style={styles.heading}>مساحة العمل</Text>
        <Text style={styles.muted}>سجّل دخولك لعرض بيانات أعمالك المحمية.</Text>
        <TextInput accessibilityLabel="البريد الإلكتروني" autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="البريد الإلكتروني" placeholderTextColor="#90A4A5" style={styles.input} textAlign="right" value={email} />
        <TextInput accessibilityLabel="كلمة المرور" autoComplete="password" onChangeText={setPassword} placeholder="كلمة المرور" placeholderTextColor="#90A4A5" secureTextEntry style={styles.input} textAlign="right" value={password} />
        <Action title="تسجيل الدخول" onPress={signIn} />
        <Text style={styles.note}>تُحفظ الجلسة في التخزين الآمن للجهاز؛ لا تُحفظ كلمة المرور.</Text>
      </Shell>
    );
  }

  return (
    <Shell title="THE SFM Business">
      <Text style={styles.heading}>ملخص أعمالك</Text>
      <Text style={styles.muted}>نظرة مختصرة على السجلات التي يملكها حسابك فقط.</Text>
      <Action title={loading ? 'جارٍ التحديث…' : 'تحديث البيانات'} onPress={loadSummary} disabled={loading} />
      {errorMessage ? <InlineNotice message={errorMessage} /> : null}
      {summary ? (
        <>
          <View style={styles.grid}>
            {metric('المشاريع', summary.projectCount.toLocaleString('ar-KW'))}
            {metric('العملاء', summary.customerCount.toLocaleString('ar-KW'))}
            {metric('الموظفون النشطون', summary.activeEmployeeCount.toLocaleString('ar-KW'))}
            {metric('الفواتير المفتوحة', summary.openInvoiceCount.toLocaleString('ar-KW'))}
          </View>
          <View style={styles.businessCard}>
            <Text style={styles.rowTitle}>الأداء الشهري</Text>
            <Text style={styles.muted}>المبيعات: {money(summary.monthlySales, summary.currency)}</Text>
            <Text style={styles.muted}>المصروفات التشغيلية: {money(summary.monthlyOperatingExpenses, summary.currency)}</Text>
            <Text style={styles.muted}>الصافي التشغيلي: {money(summary.monthlyOperatingNet, summary.currency)}</Text>
          </View>
          <View style={styles.businessCard}>
            <Text style={styles.rowTitle}>متابعة التحصيل</Text>
            <Text style={styles.muted}>المستحق: {money(summary.outstandingInvoiceAmount, summary.currency)}</Text>
            <Text style={styles.muted}>الفواتير المتأخرة: {summary.overdueInvoiceCount.toLocaleString('ar-KW')}</Text>
            <Text style={styles.note}>آخر تحديث: {formatUpdatedAt(new Date(summary.refreshedAt))}</Text>
          </View>
        </>
      ) : (
        <EmptyState message={loading ? 'جارٍ جلب ملخص أعمالك المحمي…' : 'لا توجد بيانات معروضة بعد. اضغط تحديث للمحاولة مرة أخرى.'} />
      )}
      <Action title="تسجيل الخروج" onPress={signOut} secondary />
    </Shell>
  );
}

function Shell({ title, children, scroll = true }: { title: string; children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      {scroll ? (
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>{title}</Text>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.fixedPage}>
          <Text style={styles.brand}>{title}</Text>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

function LoadingScreen({ title = 'THE SFM Finance' }: { title?: string }) {
  return <Shell title={title}><ActivityIndicator accessibilityLabel="جارٍ التحميل" color={colors.accent} size="large" /></Shell>;
}

function Action({ title, onPress, disabled, secondary }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

function EmptyState({ message }: { message: string }) {
  return <View style={styles.emptyState}><Text style={styles.muted}>{message}</Text></View>;
}

function InlineNotice({ message }: { message: string }) {
  return <View accessibilityRole="alert" style={styles.notice}><Text style={styles.noticeText}>{message}</Text></View>;
}

function metric(label: string, value: string) {
  return <View style={styles.metric} key={label}><Text style={styles.muted}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

function money(value: number | null, currency: string | null) {
  return value == null || !currency ? '—' : `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`;
}

function formatUpdatedAt(value: Date | null) {
  return value ? value.toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' }) : '—';
}

function toSession(token: ApiBody): Session {
  const accessToken = typeof token.access_token === 'string' ? token.access_token : '';
  const refreshToken = typeof token.refresh_token === 'string' ? token.refresh_token : '';
  const expiresIn = typeof token.expires_in === 'number' ? token.expires_in : 0;
  if (!accessToken || !refreshToken || expiresIn <= 0) throw new Error('INVALID_SESSION');
  return { accessToken, refreshToken, expiresAt: Date.now() + expiresIn * 1000 };
}

async function refreshSession(active: Session, sessionKey: string) {
  if (active.expiresAt > Date.now() + 60_000) return active;
  const url = String(extra.supabaseUrl ?? '').replace(/\/$/, '');
  const key = String(extra.supabaseAnonKey ?? '');
  if (!url || !key) throw new Error('SUPABASE_NOT_CONFIGURED');

  const response = await fetchWithTimeout(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: active.refreshToken }),
  });
  const token = await responseJson(response);
  if (!response.ok || !token) throw new Error('SESSION_EXPIRED');

  const refreshed = toSession(token);
  await SecureStore.setItemAsync(sessionKey, JSON.stringify(refreshed));
  return refreshed;
}

async function fetchWithTimeout(url: string, options?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function responseJson(response: Response): Promise<ApiBody | null> {
  try {
    const body = await response.json();
    return body && typeof body === 'object' ? body as ApiBody : null;
  } catch {
    return null;
  }
}

function isSessionError(error: unknown) {
  return error instanceof Error && ['SESSION_EXPIRED', 'UNAUTHORIZED'].includes(error.message);
}

function signInErrorMessage(error: unknown) {
  if (error instanceof Error && ['AUTH_400', 'AUTH_401'].includes(error.message)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (error instanceof Error && error.message === 'AUTH_429') return 'تمت محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.';
  return 'تحقق من اتصال الإنترنت ثم أعد المحاولة.';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  page: { padding: 22, gap: 14, direction: 'rtl' },
  fixedPage: { flex: 1, padding: 22, gap: 14, direction: 'rtl' },
  brand: { color: colors.accent, fontSize: 18, fontWeight: '800', textAlign: 'right' },
  heading: { color: '#F5FBFB', fontSize: 30, fontWeight: '800', textAlign: 'right', marginTop: 12 },
  muted: { color: '#B7CDD0', fontSize: 15, lineHeight: 22, textAlign: 'right' },
  note: { color: '#90A4A5', fontSize: 13, lineHeight: 19, textAlign: 'right', marginTop: 8 },
  input: { minHeight: 52, backgroundColor: colors.card, color: '#F5FBFB', borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  button: { minHeight: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.accent, borderRadius: 14, paddingHorizontal: 18 },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: '#456064' },
  disabled: { opacity: 0.55 },
  buttonText: { color: '#061416', fontSize: 16, fontWeight: '800' },
  secondaryText: { color: '#F5FBFB' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  metric: { width: '47%', minHeight: 102, backgroundColor: colors.card, borderRadius: 18, padding: 14, justifyContent: 'space-between' },
  metricWide: { width: '100%', minHeight: 78 },
  value: { color: '#F5FBFB', fontSize: 17, fontWeight: '800', textAlign: 'right' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 15 },
  rowMain: { flex: 1, paddingLeft: 12 },
  rowCode: { alignItems: 'flex-start', minWidth: 64 },
  rowTitle: { color: '#F5FBFB', fontSize: 17, fontWeight: '700', textAlign: 'right', marginBottom: 4 },
  code: { color: colors.accent, fontSize: 15, fontWeight: '800', textAlign: 'left' },
  businessCard: { backgroundColor: colors.card, borderRadius: 18, padding: 18, gap: 4 },
  notice: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.accent, padding: 14 },
  noticeText: { color: '#F5FBFB', fontSize: 14, lineHeight: 21, textAlign: 'right' },
  emptyState: { minHeight: 96, alignItems: 'center', justifyContent: 'center', padding: 16 },
  marketList: { flex: 1 },
  marketListContent: { paddingVertical: 4, paddingBottom: 24 },
  marketHeader: { gap: 10, paddingBottom: 10 },
  filterRow: { gap: 8, direction: 'rtl' },
  filterPill: { backgroundColor: colors.card, borderColor: '#456064', borderRadius: 18, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 },
  filterPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterPillText: { color: '#F5FBFB', fontWeight: '700' },
  filterPillTextActive: { color: '#061416' },
  rowSeparator: { height: 10 },
});
