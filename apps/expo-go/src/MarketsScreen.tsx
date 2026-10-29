import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, ScrollView, View } from 'react-native';
import { type MobileRecord, type MobilePage } from '../../../src/lib/mobile/resourceContract';
import type { Screen } from './navigation';
import { MobileRequestError, type MobileSessionClient } from './session';
import { Button, Busy, Empty, ErrorNotice, formatValue, Input, Label, Panel, useUI } from './ui';
import { useAccountSync } from './accountSync';
export async function publicRequest<T>(base: string, path: string): Promise<T> {
  const abort = new AbortController(); const timeout = setTimeout(() => abort.abort(), 15_000);
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}${path}`, { signal: abort.signal });
    const body = await response.json();
    if (!response.ok) throw new MobileRequestError(body.code ?? 'DATA_UNAVAILABLE', response.status);
    return body as T;
  } finally { clearTimeout(timeout); }
}
type Instrument = { symbol: string; displaySymbol?: string; name?: string; displayName?: string; assetType?: string; currency?: string; exchange?: string; country?: string; providerSymbol?: string; marketName?: string; source?: string; shariahStatus?: string };
type MarketHistoryPoint = { price?: unknown; observedAt?: unknown };
type MarketHistory = { points?: MarketHistoryPoint[]; pointCount?: number; source?: string; generatedAt?: string };
type MarketTechnical = { available?: boolean; technicalAvailable?: boolean; trend?: unknown; rsi?: unknown; movingAverages?: Record<string, unknown>; indicators?: Record<string, unknown>; samples?: unknown; technicalAsOf?: unknown; source?: unknown; upstreamProvider?: unknown };
export function MarketsScreen({ base, client, navigate }: { base: string; client: MobileSessionClient; navigate: (screen: Screen) => void }) {
  const { t } = useUI();
  const [items, setItems] = useState<Instrument[]>([]); const [watchlist, setWatchlist] = useState<MobileRecord[]>([]);
  const [query, setQuery] = useState(''); const [category, setCategory] = useState('all'); const [market, setMarket] = useState('');
  const [page, setPage] = useState(1); const [more, setMore] = useState(false); const [busy, setBusy] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const sequence = useRef(0);
  const watchlistSequence = useRef(0);
  const load = useCallback(async (next = 1) => {
    const requestId = ++sequence.current; setBusy(true); setError('');
    try {
      const data = await publicRequest<{ markets: Instrument[]; pagination?: { hasMore: boolean } }>(base, `/api/markets?quality=all&limit=50&page=${next}&category=${category}&q=${encodeURIComponent(query)}${market ? `&market=${encodeURIComponent(market)}` : ''}`);
      if (requestId !== sequence.current) return;
      setItems(previous => next === 1 ? data.markets : [...previous, ...data.markets.filter(row => !previous.some(old => old.symbol === row.symbol && old.exchange === row.exchange))]); setPage(next); setMore(Boolean(data.pagination?.hasMore));
    } catch (error) { if (requestId === sequence.current) setError(error instanceof MobileRequestError ? error.code : 'LOAD_UNAVAILABLE'); }
    finally { if (requestId === sequence.current) setBusy(false); }
  }, [base, category, market, query]);
  useEffect(() => { const counter = sequence; const timer = setTimeout(() => { void load(); }, 300); return () => { clearTimeout(timer); ++counter.current; }; }, [load]);
  const loadWatchlist = useCallback(async (silent = false) => {
    const requestId = ++watchlistSequence.current;
    if (!client.signedIn) { setWatchlist([]); return; }
    try {
      const rows: MobileRecord[] = []; let cursor: string | null = null;
      do {
        const data: MobilePage = await client.request(`/api/mobile/investor/records/watchlist?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
        rows.push(...data.records); cursor = data.nextCursor;
      } while (cursor && requestId === watchlistSequence.current);
      if (requestId !== watchlistSequence.current) return;
      setWatchlist(rows); setError('');
    } catch (error) {
      if (!silent && requestId === watchlistSequence.current) setError(error instanceof MobileRequestError ? error.code : 'LOAD_UNAVAILABLE');
    }
  }, [client]);
  useEffect(() => { const counter = watchlistSequence; void loadWatchlist(); return () => { ++counter.current; }; }, [loadWatchlist]);
  useAccountSync(() => { void loadWatchlist(true); });
  async function toggle(item: Instrument) {
    if (!client.signedIn) { Alert.alert(t(['يلزم تسجيل الدخول للمزامنة', 'Sign in to sync your watchlist', 'Connectez-vous pour synchroniser votre suivi'])); return; }
    setSaving(true); setError('');
    const symbol = item.displaySymbol || item.symbol;
    const existing = watchlist.find(row => row.symbol === symbol && row.asset_type === item.assetType);
    try {
      if (existing) { await client.request('/api/mobile/investor/records/watchlist', { method: 'DELETE', body: JSON.stringify({ id: existing.id }) }); setWatchlist(previous => previous.filter(row => row.id !== existing.id)); }
      else {
        if (!item.currency || !item.assetType) throw new MobileRequestError('INCOMPLETE_IDENTITY');
        const data = await client.request<{ record: MobileRecord }>('/api/mobile/investor/records/watchlist', { method: 'POST', body: JSON.stringify({ symbol, name: item.displayName || item.name || symbol, asset_type: item.assetType, currency: item.currency, ...(item.providerSymbol ? { provider_symbol: item.providerSymbol } : {}), ...(item.exchange ? { exchange: item.exchange } : {}), ...(item.country ? { country: item.country } : {}) }) });
        setWatchlist(previous => [...previous, data.record]);
      }
    } catch (error) { setError(error instanceof MobileRequestError ? error.code : 'SAVE_UNAVAILABLE'); }
    finally { setSaving(false); }
  }
  const filters = [['all', ['الكل', 'All', 'Tous']], ['stock', ['أسهم', 'Stocks', 'Actions']], ['forex', ['فوركس', 'Forex', 'Forex']], ['commodity', ['معادن وسلع', 'Metals and commodities', 'Métaux et matières premières']], ['fund', ['صناديق', 'Funds', 'Fonds']], ['crypto', ['عملات رقمية', 'Crypto', 'Crypto']]] as const;
  return <View style={{ flex: 1, gap: 10 }}><Label large>{t(['الأسواق العالمية', 'Global markets', 'Marchés mondiaux'])}</Label><Input label={t(['ابحث بالاسم أو الرمز', 'Search by name or symbol', 'Rechercher un nom ou symbole'])} value={query} onChange={setQuery} />
    <ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>{filters.map(([id, label]) => <Button key={id} label={t(label)} selected={category === id} onPress={() => setCategory(id)} />)}</ScrollView>
    <ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>{([
      ['', ['كل الأسواق', 'All markets', 'Tous les marchés']], ['us-stocks', ['أمريكا', 'United States', 'États-Unis']], ['kuwait', ['الكويت', 'Kuwait', 'Koweït']], ['saudi', ['السعودية', 'Saudi Arabia', 'Arabie saoudite']], ['uae', ['الإمارات', 'UAE', 'Émirats arabes unis']], ['qatar', ['قطر', 'Qatar', 'Qatar']], ['bahrain', ['البحرين', 'Bahrain', 'Bahreïn']], ['oman', ['عُمان', 'Oman', 'Oman']], ['europe', ['أوروبا', 'Europe', 'Europe']], ['asia', ['آسيا', 'Asia', 'Asie']],
    ] as const).map(([id, label]) => <Button key={id} label={t(label)} selected={market === id} onPress={() => setMarket(id)} />)}</ScrollView>
    {error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}
    <FlatList data={items} keyExtractor={(item, index) => `${item.symbol}:${item.exchange ?? ''}:${index}`} refreshing={busy} onRefresh={() => { void load(); }} contentContainerStyle={{ gap: 12, paddingBottom: 20 }} ListEmptyComponent={busy ? <Busy /> : <Empty />} renderItem={({ item }) => <Panel><Button label={item.displayName || item.name || item.symbol} onPress={() => navigate({ kind: 'symbol', symbol: item.displaySymbol || item.symbol })} /><Label>{item.displaySymbol || item.symbol}</Label><Label muted>{[item.marketName, item.currency, item.exchange, item.source].filter(Boolean).join(' · ')}</Label>{item.shariahStatus ? <Label muted>{item.shariahStatus}</Label> : null}<Button disabled={saving} selected={watchlist.some(row => row.symbol === (item.displaySymbol || item.symbol) && row.asset_type === item.assetType)} label={t(['المتابعة في حسابي', 'Watch in my account', 'Suivre sur mon compte'])} onPress={() => { void toggle(item); }} /></Panel>} ListFooterComponent={more ? <Button label={t(['تحميل المزيد', 'Load more', 'Charger la suite'])} disabled={busy} onPress={() => { void load(page + 1); }} /> : null} />
  </View>;
}
export function SymbolScreen({ base, symbol }: { base: string; symbol: string }) {
  const { t } = useUI(); const [quote, setQuote] = useState<Record<string, unknown> | null>(null); const [history, setHistory] = useState<MarketHistory | null>(null); const [technical, setTechnical] = useState<MarketTechnical | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const quoteResult = await publicRequest<{ quote: Record<string, unknown> }>(base, `/api/sfm-market/v1/quote/${encodeURIComponent(symbol)}`);
      setQuote(quoteResult.quote);
      const [historyResult, technicalResult] = await Promise.allSettled([
        publicRequest<{ history: MarketHistory }>(base, `/api/sfm-market/v1/history/${encodeURIComponent(symbol)}?limit=60`),
        publicRequest<MarketTechnical>(base, `/api/sfm-market/v1/trader/technical/${encodeURIComponent(symbol)}`),
      ]);
      setHistory(historyResult.status === 'fulfilled' ? historyResult.value.history : null);
      setTechnical(technicalResult.status === 'fulfilled' ? technicalResult.value : null);
    } catch (error) { setError(error instanceof MobileRequestError ? error.code : 'DATA_UNAVAILABLE'); }
    finally { setBusy(false); }
  }, [base, symbol]);
  useEffect(() => { void load(); }, [load]);
  const points = (history?.points ?? []).flatMap(point => {
    const price = Number(point.price); return Number.isFinite(price) && price > 0 ? [{ price, observedAt: typeof point.observedAt === 'string' ? point.observedAt : '' }] : [];
  });
  const chartPoints = points.slice(-36); const low = Math.min(...chartPoints.map(point => point.price)); const high = Math.max(...chartPoints.map(point => point.price));
  const indicators = technical?.indicators ?? technical?.movingAverages ?? {};
  const technicalRows: Array<[string, unknown]> = [['rsi', technical?.rsi], ['trend', technical?.trend], ['samples', technical?.samples], ['sma20', indicators.sma20], ['sma50', indicators.sma50], ['ema20', indicators.ema20], ['ema50', indicators.ema50], ['support', indicators.support], ['resistance', indicators.resistance]].filter(([, value]) => value != null) as Array<[string, unknown]>;
  return <ScrollView contentContainerStyle={{ gap: 15 }}>
    <Label large>{symbol}</Label>{busy ? <Busy /> : null}{error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}
    {quote ? <Panel>{['price', 'currency', 'change', 'changePercent', 'source', 'asOf', 'observedAt', 'delayed'].filter(key => quote[key] != null).map(key => <View key={key}><Label muted>{key}</Label><Label>{formatValue(quote[key])}</Label></View>)}</Panel> : null}
    <Panel><Label large>{t(['سجل الأسعار', 'Recorded price history', 'Historique des prix enregistrés'])}</Label>{chartPoints.length >= 2 ? <><View accessibilityLabel={t(['رسم سجل الأسعار', 'Recorded price history chart', 'Graphique de l’historique des prix enregistrés'])} style={{ height: 140, flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingTop: 8 }}>{chartPoints.map((point, index) => <View key={`${point.observedAt}:${index}`} style={{ flex: 1, minWidth: 2, height: `${high === low ? 50 : 12 + ((point.price - low) / (high - low)) * 88}%`, backgroundColor: '#22d3ee', borderRadius: 2 }} />)}</View><Label muted>{t(['المشاهدات المسجلة', 'Recorded observations', 'Observations enregistrées'])}: {history?.pointCount ?? points.length} · {formatValue(low)} — {formatValue(high)}</Label><Label muted>{[history?.source, history?.generatedAt].filter(Boolean).join(' · ')}</Label></> : <Label muted>{t(['لا يوجد سجل أسعار موثق لهذا الرمز.', 'No verified recorded history is available for this symbol.', 'Aucun historique enregistré vérifié n’est disponible pour ce symbole.'])}</Label>}</Panel>
    <Panel><Label large>{t(['التحليل الفني', 'Technical analysis', 'Analyse technique'])}</Label>{technical?.technicalAvailable ? technicalRows.map(([key, value]) => <View key={key}><Label muted>{key}</Label><Label>{formatValue(value)}</Label></View>) : <Label muted>{t(['مؤشرات التحليل الفني غير متاحة حتى تتوفر مشاهدات موثقة كافية.', 'Technical indicators are unavailable until enough verified observations exist.', 'Les indicateurs techniques sont indisponibles tant que les observations vérifiées sont insuffisantes.'])}</Label>}{technical ? <Label muted>{[technical.source, technical.upstreamProvider, technical.technicalAsOf].filter(Boolean).map(formatValue).join(' · ')}</Label> : null}</Panel>
    <Button label={t(['تحديث السعر', 'Refresh quote', 'Actualiser le cours'])} onPress={() => { void load(); }} disabled={busy} />
  </ScrollView>;
}
