import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, ScrollView, View } from 'react-native';
import { localized, MOBILE_RESOURCES, type MobilePage, type MobileRecord, type PhoneProduct } from '../../../src/lib/mobile/resourceContract';
import type { Screen } from './navigation';
import { MobileRequestError, type MobileSessionClient } from './session';
import { Button, Busy, Empty, ErrorNotice, formatValue, Input, Label, Panel, useUI } from './ui';
import { useAccountSync } from './accountSync';
import { portfolioMetrics } from './investorPortfolio';

const metrics = {
  monthlyIncome: ['الدخل الشهري', 'Monthly income', 'Revenus mensuels'], monthlyExpenses: ['المصروفات الشهرية', 'Monthly expenses', 'Dépenses mensuelles'], monthlyNet: ['صافي الشهر', 'Monthly net', 'Solde mensuel'], trackedPosition: ['المركز المالي', 'Financial position', 'Position financière'], activeDebtCount: ['الديون النشطة', 'Active debts', 'Dettes actives'],
  projectCount: ['المشاريع', 'Projects', 'Projets'], customerCount: ['العملاء', 'Customers', 'Clients'], supplierCount: ['الموردون', 'Suppliers', 'Fournisseurs'], activeEmployeeCount: ['الموظفون النشطون', 'Active employees', 'Employés actifs'], openInvoiceCount: ['الفواتير المفتوحة', 'Open invoices', 'Factures ouvertes'], overdueInvoiceCount: ['الفواتير المتأخرة', 'Overdue invoices', 'Factures en retard'], outstandingInvoiceAmount: ['المبالغ المستحقة', 'Outstanding amount', 'Montant dû'], monthlySales: ['المبيعات الشهرية', 'Monthly sales', 'Ventes mensuelles'], monthlyOperatingExpenses: ['مصروفات التشغيل', 'Operating expenses', 'Charges d’exploitation'], monthlyOperatingNet: ['صافي التشغيل', 'Operating net', 'Solde d’exploitation'],
} as const;
export function HomeScreen({ client, product, navigate, wide }: { client: MobileSessionClient; product: PhoneProduct; navigate: (screen: Screen) => void; wide: boolean }) {
  const { t, language, colors } = useUI();
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const load = useCallback(async (silent = false) => {
    if (product === 'investor') return;
    if (!silent) { setBusy(true); setError(''); }
    try { const data = await client.request<{ summary: Record<string, unknown> }>(`/api/mobile/${product}/summary`); setSummary(data.summary); setLastSyncedAt(Date.now()); setError(''); }
    catch (error) { if (!silent) setError(error instanceof MobileRequestError ? error.code : 'LOAD_UNAVAILABLE'); }
    finally { if (!silent) setBusy(false); }
  }, [client, product]);
  useEffect(() => { void load(); }, [load]);
  useAccountSync(() => { if (product !== 'investor') void load(true); });
  return <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 24 }}><Label large>{t(product === 'finance' ? ['صورة أوضح لمالك.', 'A clearer view of your money.', 'Une vision claire de vos finances.'] : product === 'investor' ? ['الأسواق والاستثمار', 'Markets and investing', 'Marchés et investissement'] : ['مساحة أعمالك', 'Your business workspace', 'Votre espace professionnel'])}</Label>
    {error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}{busy && !summary ? <Busy /> : null}
    {lastSyncedAt ? <Label muted>{t(['تمت المزامنة مع حسابك', 'Synced with your account', 'Synchronisé avec votre compte'])}: {new Date(lastSyncedAt).toLocaleTimeString(language === 'ar' ? 'ar-KW' : language === 'fr' ? 'fr-FR' : 'en-US')}</Label> : null}
    {summary ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{Object.entries(metrics).filter(([key]) => key in summary).map(([key, label]) => <View key={key} style={{ width: wide ? '31%' : '48%' }}><Panel><Label muted>{localized(label, language)}</Label><Label large>{formatValue(summary[key])}{!key.endsWith('Count') && summary[key] != null && summary.currency ? ` ${summary.currency}` : ''}</Label></Panel></View>)}</View> : null}
    {summary && typeof summary.monthlyIncome === 'number' && typeof summary.monthlyExpenses === 'number' ? <Panel><Label>{t(['التدفق الشهري', 'Monthly cash flow', 'Flux mensuel'])}</Label>{['monthlyIncome', 'monthlyExpenses'].map(key => <View key={key} style={{ gap: 6 }}><Label muted>{localized(metrics[key as 'monthlyIncome' | 'monthlyExpenses'], language)}</Label><View style={{ height: 12, backgroundColor: colors.raised, borderRadius: 6, overflow: 'hidden' }}><View style={{ height: 12, width: `${Math.max(0, Math.min(100, Number(summary[key]) / Math.max(Number(summary.monthlyIncome), Number(summary.monthlyExpenses), 1) * 100))}%`, backgroundColor: key === 'monthlyIncome' ? colors.accent : colors.danger }} /></View></View>)}</Panel> : null}
    {product === 'investor' ? <InvestorPortfolio client={client} navigate={navigate} /> : null}
    {product !== 'investor' ? <Button label={t(['تحديث الملخص', 'Refresh summary', 'Actualiser le résumé'])} onPress={() => { void load(); }} disabled={busy} /> : <Button label={t(['استكشاف الأسواق', 'Explore markets', 'Explorer les marchés'])} onPress={() => navigate({ kind: 'markets' })} />}
    {product === 'finance' ? <Button label={t(['مراجعة التقارير', 'Review reports', 'Consulter les rapports'])} onPress={() => navigate({ kind: 'reports' })} /> : null}
    {product === 'business' ? <Button label={t(['مراجعة العمليات', 'Review operations', 'Consulter les opérations'])} onPress={() => navigate({ kind: 'reports' })} /> : null}
    <CatalogScreen product={product} navigate={navigate} embedded />
  </ScrollView>;
}
async function readAllInvestorRecords(client: MobileSessionClient, resource: 'holdings' | 'watchlist', shouldContinue: () => boolean) {
  const records: MobileRecord[] = []; let cursor: string | null = null;
  do {
    const page: MobilePage = await client.request(`/api/mobile/investor/records/${resource}?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    records.push(...page.records); cursor = page.nextCursor;
  } while (cursor && shouldContinue());
  return records;
}
function InvestorPortfolio({ client, navigate }: { client: MobileSessionClient; navigate: (screen: Screen) => void }) {
  const { t, language } = useUI(); const [holdings, setHoldings] = useState<MobileRecord[]>([]); const [watchlist, setWatchlist] = useState<MobileRecord[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const sequence = useRef(0);
  const load = useCallback(async (silent = false) => {
    const requestId = ++sequence.current;
    if (!silent) { setBusy(true); setError(''); }
    try {
      const shouldContinue = () => requestId === sequence.current;
      const [nextHoldings, nextWatchlist] = await Promise.all([readAllInvestorRecords(client, 'holdings', shouldContinue), readAllInvestorRecords(client, 'watchlist', shouldContinue)]);
      if (requestId !== sequence.current) return;
      setHoldings(nextHoldings); setWatchlist(nextWatchlist); setLastSyncedAt(Date.now()); setError('');
    } catch (error) {
      if (!silent && requestId === sequence.current) setError(error instanceof MobileRequestError ? error.code : 'LOAD_UNAVAILABLE');
    } finally { if (!silent && requestId === sequence.current) setBusy(false); }
  }, [client]);
  useEffect(() => { const counter = sequence; void load(); return () => { ++counter.current; }; }, [load]);
  useAccountSync(() => { void load(true); });
  const metrics = portfolioMetrics(holdings, watchlist);
  return <Panel><Label large>{t(['محفظتي الاستثمارية', 'My investment portfolio', 'Mon portefeuille'])}</Label>
    {lastSyncedAt ? <Label muted>{t(['تمت المزامنة مع حسابك', 'Synced with your account', 'Synchronisé avec votre compte'])}: {new Date(lastSyncedAt).toLocaleTimeString(language === 'ar' ? 'ar-KW' : language === 'fr' ? 'fr-FR' : 'en-US')}</Label> : null}
    {busy && !lastSyncedAt ? <Busy /> : null}{error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}
    {!error ? <View style={{ gap: 8 }}><Label>{t(['الأصول المسجلة', 'Tracked holdings', 'Positions suivies'])}: {metrics.holdingCount}</Label><Label>{t(['قائمة المتابعة', 'Watchlist', 'Liste de suivi'])}: {metrics.watchlistCount}</Label>{metrics.valuedCount ? <Label>{t(['القيمة المحولة الحالية', 'Current converted value', 'Valeur convertie actuelle'])}: {formatValue(metrics.totalConvertedValue)}{metrics.userCurrencies.length === 1 ? ` ${metrics.userCurrencies[0]}` : ''}</Label> : <Label muted>{t(['لا توجد قيمة محولة متاحة بعد.', 'No converted valuation is available yet.', 'Aucune valorisation convertie disponible pour le moment.'])}</Label>}</View> : null}
    <Button label={t(['عرض المحفظة', 'View holdings', 'Voir le portefeuille'])} onPress={() => navigate({ kind: 'records', resource: 'holdings' })} disabled={busy} />
    <Button label={t(['عرض قائمة المتابعة', 'View watchlist', 'Voir la liste de suivi'])} onPress={() => navigate({ kind: 'records', resource: 'watchlist' })} disabled={busy} />
    <Button label={t(['تحديث المحفظة', 'Refresh portfolio', 'Actualiser le portefeuille'])} onPress={() => { void load(); }} disabled={busy} />
  </Panel>;
}
export function CatalogScreen({ product, navigate, embedded = false }: { product: PhoneProduct; navigate: (screen: Screen) => void; embedded?: boolean }) {
  const { language, t } = useUI();
  const content = <View style={{ gap: 12 }}>
    {product === 'investor' ? <Button label={t(['محلل المستثمر', 'Investor analyst', 'Analyste investisseur'])} onPress={() => navigate({ kind: 'analysis' })} /> : null}
    {product === 'business' ? <><Button label={t(['فرق العمل', 'Teams', 'Équipes'])} onPress={() => navigate({ kind: 'teams' })} /><Button label={t(['تحليل القرارات', 'Decision analysis', 'Analyse de décision'])} onPress={() => navigate({ kind: 'decisions' })} /></> : null}
    {MOBILE_RESOURCES.filter(resource => resource.products.includes(product)).map(resource => <Button key={resource.id} label={localized(resource.label, language)} onPress={() => navigate({ kind: 'records', resource: resource.id })} />)}
    {product === 'finance' ? <Button label={t(['مركز التقارير', 'Reports Center', 'Centre des rapports'])} onPress={() => navigate({ kind: 'reports' })} /> : null}
    {product === 'business' ? <Button label={t(['عمليات الأعمال', 'Business operations', "Opérations d'entreprise"])} onPress={() => navigate({ kind: 'reports' })} /> : null}
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
  const load = useCallback(async (start = 0, silent = false) => {
    if (!silent) { setBusy(true); setError(''); }
    try { const data = await client.request<{ notifications: Notification[] }>(`/api/notifications?offset=${start}`); setItems(previous => start ? [...previous, ...data.notifications.filter(row => !previous.some(old => old.id === row.id))] : data.notifications); setOffset(start + data.notifications.length); setMore(data.notifications.length === 50); setError(''); }
    catch (error) { if (!silent) setError(error instanceof MobileRequestError ? error.code : 'LOAD_UNAVAILABLE'); } finally { if (!silent) setBusy(false); }
  }, [client]);
  useEffect(() => { void load(); }, [load]);
  useAccountSync(() => { void load(0, true); });
  async function mark(item: Notification) { try { await client.request('/api/notifications', { method: 'POST', body: JSON.stringify({ ids: [item.id], status: 'read' }) }); setItems(previous => previous.map(row => row.id === item.id ? { ...row, read: true } : row)); } catch (error) { setError(error instanceof MobileRequestError ? error.code : 'SAVE_UNAVAILABLE'); } }
  return <View style={{ flex: 1, gap: 12 }}><Label large>{t(['الإشعارات', 'Notifications', 'Notifications'])}</Label>{error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}<FlatList data={items} refreshing={busy} onRefresh={() => { void load(); }} keyExtractor={item => item.id} contentContainerStyle={{ gap: 12 }} ListEmptyComponent={busy ? <Busy /> : <Empty />} renderItem={({ item }) => <Panel><Label>{item.title}</Label><Label muted>{item.message}</Label><Label muted>{item.created_at.slice(0, 10)}</Label>{!item.read ? <Button label={t(['تحديد كمقروء', 'Mark read', 'Marquer comme lu'])} onPress={() => { void mark(item); }} /> : null}{item.action_url || item.link ? <Button label={t(['فتح', 'Open', 'Ouvrir'])} onPress={() => openLink(item.action_url || item.link!)} /> : null}</Panel>} ListFooterComponent={more ? <Button disabled={busy} label={t(['تحميل المزيد', 'Load more', 'Charger la suite'])} onPress={() => { void load(offset); }} /> : null} /></View>;
}
type NotificationChannel = { id: string; channel: 'email' | 'telegram' | 'whatsapp' | 'push'; enabled: boolean; verified_at: string | null; quiet_start: number | null; quiet_end: number | null; timezone: string | null };
type NotificationChannelsResponse = { channels: NotificationChannel[]; configuration: Partial<Record<NotificationChannel['channel'], boolean>> };
function safeNotificationLink(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['t.me', 'wa.me'].includes(url.hostname) ? url.toString() : null;
  } catch { return null; }
}
export function NotificationChannelsScreen({ client, openExternal }: { client: MobileSessionClient; openExternal: (url: string) => void }) {
  const { t, language } = useUI(); const [channels, setChannels] = useState<NotificationChannel[]>([]); const [configuration, setConfiguration] = useState<NotificationChannelsResponse['configuration']>({});
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const sequence = useRef(0);
  const load = useCallback(async (silent = false) => {
    const requestId = ++sequence.current;
    if (!silent) { setBusy(true); setError(''); }
    try {
      const data = await client.request<NotificationChannelsResponse>('/api/notifications/channels');
      if (requestId !== sequence.current) return;
      setChannels(data.channels); setConfiguration(data.configuration); setError('');
    } catch (error) {
      if (!silent && requestId === sequence.current) setError(error instanceof MobileRequestError ? error.code : 'LOAD_UNAVAILABLE');
    } finally { if (!silent && requestId === sequence.current) setBusy(false); }
  }, [client]);
  useEffect(() => { const counter = sequence; void load(); return () => { ++counter.current; }; }, [load]);
  useAccountSync(() => { void load(true); });
  const disconnect = (channel: NotificationChannel) => Alert.alert(t(['فصل القناة', 'Disconnect channel', 'Déconnecter le canal']), t(['سيتم إيقاف تسليم الإشعارات إلى هذه القناة.', 'Notifications will stop being delivered to this channel.', 'Les notifications ne seront plus envoyées vers ce canal.']), [
    { text: t(['إلغاء', 'Cancel', 'Annuler']), style: 'cancel' },
    { text: t(['فصل', 'Disconnect', 'Déconnecter']), style: 'destructive', onPress: () => { setBusy(true); void client.request('/api/notifications/channels', { method: 'POST', body: JSON.stringify({ action: 'disconnect', id: channel.id }) }).then(() => load()).catch(error => { setError(error instanceof MobileRequestError ? error.code : 'SAVE_UNAVAILABLE'); setBusy(false); }); } },
  ]);
  const connect = (channel: 'email' | 'telegram' | 'whatsapp') => {
    setBusy(true); setError('');
    void client.request<{ url?: unknown }>('/api/notifications/channels', { method: 'POST', body: JSON.stringify({ action: 'connect', channel, consent: true, locale: language }) }).then(data => {
      const url = safeNotificationLink(data.url);
      if (channel !== 'email' && !url) throw new MobileRequestError('LINK_UNAVAILABLE');
      if (url) openExternal(url);
      return load();
    }).catch(error => setError(error instanceof MobileRequestError ? error.code : 'SAVE_UNAVAILABLE')).finally(() => setBusy(false));
  };
  const labels: Record<NotificationChannel['channel'], readonly [string, string, string]> = {
    email: ['البريد الإلكتروني', 'Email', 'E-mail'], telegram: ['تيليجرام', 'Telegram', 'Telegram'], whatsapp: ['واتساب', 'WhatsApp', 'WhatsApp'], push: ['إشعار دفع', 'Push notification', 'Notification push'],
  };
  return <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}><Label large>{t(['قنوات الإشعارات', 'Notification channels', 'Canaux de notification'])}</Label><Label muted>{t(['تتم إدارة القنوات من حسابك نفسه ولا تُخزَّن بياناتها على الجهاز.', 'Channels are managed from your same account and are not stored on this device.', 'Les canaux sont gérés depuis votre compte et ne sont pas conservés sur l’appareil.'])}</Label>
    {error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}{busy && !channels.length ? <Busy /> : null}
    {channels.map(channel => <Panel key={channel.id}><Label large>{t(labels[channel.channel])}</Label><Label muted>{channel.verified_at ? t(['تم التحقق', 'Verified', 'Vérifié']) : t(['بانتظار التحقق', 'Pending verification', 'En attente de vérification'])}</Label>{channel.quiet_start != null && channel.quiet_end != null ? <Label muted>{t(['ساعات هادئة مضبوطة', 'Quiet hours configured', 'Heures calmes configurées'])}</Label> : null}<Button danger label={t(['فصل القناة', 'Disconnect', 'Déconnecter'])} disabled={busy} onPress={() => disconnect(channel)} /></Panel>)}
    {(['email', 'telegram', 'whatsapp'] as const).map(channel => !channels.some(item => item.channel === channel && item.enabled) ? <Button key={channel} label={configuration[channel] === false ? `${t(labels[channel])} — ${t(['غير متاح', 'Unavailable', 'Indisponible'])}` : `${t(['ربط', 'Connect', 'Connecter'])} ${t(labels[channel])}`} disabled={busy || configuration[channel] === false} onPress={() => connect(channel)} /> : null)}
    <Button label={t(['تحديث القنوات', 'Refresh channels', 'Actualiser les canaux'])} disabled={busy} onPress={() => { void load(); }} />
  </ScrollView>;
}
