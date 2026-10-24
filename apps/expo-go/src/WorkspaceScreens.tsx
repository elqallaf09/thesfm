import { useCallback, useEffect, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { localized, MOBILE_RESOURCES, type PhoneProduct } from '../../../src/lib/mobile/resourceContract';
import type { Screen } from './navigation';
import { MobileRequestError, type MobileSessionClient } from './session';
import { Button, Busy, Empty, ErrorNotice, formatValue, Input, Label, Panel, useUI } from './ui';

const metrics = {
  monthlyIncome: ['الدخل الشهري', 'Monthly income', 'Revenus mensuels'], monthlyExpenses: ['المصروفات الشهرية', 'Monthly expenses', 'Dépenses mensuelles'], monthlyNet: ['صافي الشهر', 'Monthly net', 'Solde mensuel'], trackedPosition: ['المركز المالي', 'Financial position', 'Position financière'], activeDebtCount: ['الديون النشطة', 'Active debts', 'Dettes actives'],
  projectCount: ['المشاريع', 'Projects', 'Projets'], customerCount: ['العملاء', 'Customers', 'Clients'], supplierCount: ['الموردون', 'Suppliers', 'Fournisseurs'], activeEmployeeCount: ['الموظفون النشطون', 'Active employees', 'Employés actifs'], openInvoiceCount: ['الفواتير المفتوحة', 'Open invoices', 'Factures ouvertes'], overdueInvoiceCount: ['الفواتير المتأخرة', 'Overdue invoices', 'Factures en retard'], outstandingInvoiceAmount: ['المبالغ المستحقة', 'Outstanding amount', 'Montant dû'], monthlySales: ['المبيعات الشهرية', 'Monthly sales', 'Ventes mensuelles'], monthlyOperatingExpenses: ['مصروفات التشغيل', 'Operating expenses', 'Charges d’exploitation'], monthlyOperatingNet: ['صافي التشغيل', 'Operating net', 'Solde d’exploitation'],
} as const;
export function HomeScreen({ client, product, navigate, wide }: { client: MobileSessionClient; product: PhoneProduct; navigate: (screen: Screen) => void; wide: boolean }) {
  const { t, language, colors } = useUI();
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (product === 'investor') return;
    setBusy(true); setError('');
    try { const data = await client.request<{ summary: Record<string, unknown> }>(`/api/mobile/${product}/summary`); setSummary(data.summary); }
    catch (error) { setError(error instanceof MobileRequestError ? error.code : 'LOAD_UNAVAILABLE'); }
    finally { setBusy(false); }
  }, [client, product]);
  useEffect(() => { void load(); }, [load]);
  return <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 24 }}><Label large>{t(product === 'finance' ? ['صورة أوضح لمالك.', 'A clearer view of your money.', 'Une vision claire de vos finances.'] : product === 'investor' ? ['الأسواق والاستثمار', 'Markets and investing', 'Marchés et investissement'] : ['مساحة أعمالك', 'Your business workspace', 'Votre espace professionnel'])}</Label>
    {error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}{busy && !summary ? <Busy /> : null}
    {summary ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{Object.entries(metrics).filter(([key]) => key in summary).map(([key, label]) => <View key={key} style={{ width: wide ? '31%' : '48%' }}><Panel><Label muted>{localized(label, language)}</Label><Label large>{formatValue(summary[key])}{!key.endsWith('Count') && summary[key] != null && summary.currency ? ` ${summary.currency}` : ''}</Label></Panel></View>)}</View> : null}
    {summary && typeof summary.monthlyIncome === 'number' && typeof summary.monthlyExpenses === 'number' ? <Panel><Label>{t(['التدفق الشهري', 'Monthly cash flow', 'Flux mensuel'])}</Label>{['monthlyIncome', 'monthlyExpenses'].map(key => <View key={key} style={{ gap: 6 }}><Label muted>{localized(metrics[key as 'monthlyIncome' | 'monthlyExpenses'], language)}</Label><View style={{ height: 12, backgroundColor: colors.raised, borderRadius: 6, overflow: 'hidden' }}><View style={{ height: 12, width: `${Math.max(0, Math.min(100, Number(summary[key]) / Math.max(Number(summary.monthlyIncome), Number(summary.monthlyExpenses), 1) * 100))}%`, backgroundColor: key === 'monthlyIncome' ? colors.accent : colors.danger }} /></View></View>)}</Panel> : null}
    {product !== 'investor' ? <Button label={t(['تحديث الملخص', 'Refresh summary', 'Actualiser le résumé'])} onPress={() => { void load(); }} disabled={busy} /> : <Button label={t(['استكشاف الأسواق', 'Explore markets', 'Explorer les marchés'])} onPress={() => navigate({ kind: 'markets' })} />}
    <CatalogScreen product={product} navigate={navigate} embedded />
  </ScrollView>;
}
export function CatalogScreen({ product, navigate, embedded = false }: { product: PhoneProduct; navigate: (screen: Screen) => void; embedded?: boolean }) {
  const { language, t } = useUI();
  const content = <View style={{ gap: 12 }}>
    {MOBILE_RESOURCES.filter(resource => resource.products.includes(product)).map(resource => <Button key={resource.id} label={localized(resource.label, language)} onPress={() => navigate({ kind: 'records', resource: resource.id })} />)}
    {product === 'investor' ? <Button label={t(['الأسواق العالمية', 'Global markets', 'Marchés mondiaux'])} onPress={() => navigate({ kind: 'markets' })} /> : null}
    {product === 'investor' ? <><Button label={t(['الأخبار المالية', 'Financial news', 'Actualités financières'])} onPress={() => navigate({ kind: 'news' })} /><Button label={t(['التقويم الاقتصادي', 'Economic calendar', 'Calendrier économique'])} onPress={() => navigate({ kind: 'calendar' })} /><Button label={t(['الفحص الشرعي', 'Shariah screening', 'Filtrage charia'])} onPress={() => navigate({ kind: 'screening' })} /></> : null}
    <Button label={t(['الحاسبات المالية', 'Financial calculators', 'Calculateurs financiers'])} onPress={() => navigate({ kind: 'tools' })} />
  </View>;
  return embedded ? content : <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>{content}</ScrollView>;
}
type Account = { user: { id: string; email: string | null }; profile: Record<string, string | null> | null; subscriptions: Array<{ plan: string; status: string; current_period_end: string | null }> };
export function AccountScreen({ client, languageChanged, themeChanged, signOut }: { client: MobileSessionClient; languageChanged: (language: 'ar' | 'en' | 'fr') => void; themeChanged: (theme: 'light' | 'dark' | 'system') => void; signOut: () => void }) {
  const { t, language } = useUI();
  const [account, setAccount] = useState<Account | null>(null); const [name, setName] = useState(''); const [username, setUsername] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try { const data = await client.request<Account>('/api/mobile/account', {}, 15_000); setAccount(data); setName(data.profile?.display_name ?? ''); setUsername(data.profile?.username ?? ''); }
    catch (error) { setError(error instanceof MobileRequestError ? error.code : 'LOAD_UNAVAILABLE'); }
    finally { setBusy(false); }
  }, [client]);
  useEffect(() => { void load(); }, [load]);
  async function save(values: Record<string, string>) {
    setBusy(true); setError('');
    try { await client.request('/api/mobile/account', { method: 'PATCH', body: JSON.stringify(values) }); await load(); }
    catch (error) { setError(error instanceof MobileRequestError ? error.code : 'SAVE_UNAVAILABLE'); }
    finally { setBusy(false); }
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 15, paddingBottom: 24 }}><Label large>{t(['حساب THE SFM', 'THE SFM account', 'Compte THE SFM'])}</Label>
    {busy ? <Busy /> : null}{error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}
    {account ? <><Panel><Label>{account.user.email ?? '—'}</Label><Input label={t(['الاسم', 'Name', 'Nom'])} value={name} onChange={setName} /><Input label={t(['اسم المستخدم', 'Username', 'Identifiant'])} value={username} onChange={setUsername} /><Button label={t(['حفظ الملف الشخصي', 'Save profile', 'Enregistrer le profil'])} disabled={busy || !name.trim() || username.trim().length < 3} onPress={() => { void save({ display_name: name, username }); }} /></Panel>
      <Panel><Label>{t(['الاشتراك', 'Subscription', 'Abonnement'])}</Label>{account.subscriptions.length ? account.subscriptions.map((item, index) => <Label key={`${item.plan}-${index}`}>{item.plan} · {item.status}{item.current_period_end ? ` · ${item.current_period_end.slice(0, 10)}` : ''}</Label>) : <Label muted>{t(['لا يوجد اشتراك مسجّل.', 'No recorded subscription.', 'Aucun abonnement enregistré.'])}</Label>}</Panel></> : null}
    <Panel><Label>{t(['اللغة', 'Language', 'Langue'])}</Label>{(['ar', 'en', 'fr'] as const).map(value => <Button key={value} label={{ ar: 'العربية', en: 'English', fr: 'Français' }[value]} selected={language === value} disabled={busy} onPress={() => { languageChanged(value); void save({ preferred_lang: value }); }} />)}</Panel>
    <Panel><Label>{t(['المظهر', 'Appearance', 'Apparence'])}</Label>{(['system', 'light', 'dark'] as const).map((value, index) => <Button key={value} label={t([['حسب الجهاز', 'Device setting', 'Selon l’appareil'], ['نهاري', 'Light', 'Clair'], ['ليلي', 'Dark', 'Sombre']][index] as [string, string, string])} disabled={busy} onPress={() => { themeChanged(value); void save({ preferred_theme: value }); }} />)}</Panel>
    <Button danger label={t(['تسجيل الخروج', 'Sign out', 'Déconnexion'])} onPress={signOut} />
  </ScrollView>;
}
type Notification = { id: string; title: string; message: string; read: boolean; created_at: string; action_url?: string; link?: string };
export function NotificationsScreen({ client, openLink }: { client: MobileSessionClient; openLink: (path: string) => void }) {
  const { t } = useUI(); const [items, setItems] = useState<Notification[]>([]); const [offset, setOffset] = useState(0); const [more, setMore] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(async (start = 0) => {
    setBusy(true); setError('');
    try { const data = await client.request<{ notifications: Notification[] }>(`/api/notifications?offset=${start}`); setItems(previous => start ? [...previous, ...data.notifications.filter(row => !previous.some(old => old.id === row.id))] : data.notifications); setOffset(start + data.notifications.length); setMore(data.notifications.length === 50); }
    catch (error) { setError(error instanceof MobileRequestError ? error.code : 'LOAD_UNAVAILABLE'); } finally { setBusy(false); }
  }, [client]);
  useEffect(() => { void load(); }, [load]);
  async function mark(item: Notification) { try { await client.request('/api/notifications', { method: 'POST', body: JSON.stringify({ ids: [item.id], status: 'read' }) }); setItems(previous => previous.map(row => row.id === item.id ? { ...row, read: true } : row)); } catch (error) { setError(error instanceof MobileRequestError ? error.code : 'SAVE_UNAVAILABLE'); } }
  return <View style={{ flex: 1, gap: 12 }}><Label large>{t(['الإشعارات', 'Notifications', 'Notifications'])}</Label>{error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}<FlatList data={items} refreshing={busy} onRefresh={() => { void load(); }} keyExtractor={item => item.id} contentContainerStyle={{ gap: 12 }} ListEmptyComponent={busy ? <Busy /> : <Empty />} renderItem={({ item }) => <Panel><Label>{item.title}</Label><Label muted>{item.message}</Label><Label muted>{item.created_at.slice(0, 10)}</Label>{!item.read ? <Button label={t(['تحديد كمقروء', 'Mark read', 'Marquer comme lu'])} onPress={() => { void mark(item); }} /> : null}{item.action_url || item.link ? <Button label={t(['فتح', 'Open', 'Ouvrir'])} onPress={() => openLink(item.action_url || item.link!)} /> : null}</Panel>} ListFooterComponent={more ? <Button disabled={busy} label={t(['تحميل المزيد', 'Load more', 'Charger la suite'])} onPress={() => { void load(offset); }} /> : null} /></View>;
}
