import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, ScrollView, View } from 'react-native';
import { type MobileRecord, type MobilePage } from '../../../src/lib/mobile/resourceContract';
import type { Screen } from './navigation';
import { MobileRequestError, type MobileSessionClient } from './session';
import { Button, Busy, Empty, ErrorNotice, formatValue, Input, Label, Panel, useUI } from './ui';
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
export function MarketsScreen({ base, client, navigate }: { base: string; client: MobileSessionClient; navigate: (screen: Screen) => void }) {
  const { t } = useUI();
  const [items, setItems] = useState<Instrument[]>([]); const [watchlist, setWatchlist] = useState<MobileRecord[]>([]);
  const [query, setQuery] = useState(''); const [category, setCategory] = useState('all'); const [market, setMarket] = useState('');
  const [page, setPage] = useState(1); const [more, setMore] = useState(false); const [busy, setBusy] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const sequence = useRef(0);
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
  useEffect(() => {
    if (!client.signedIn) { setWatchlist([]); return; }
    let mounted = true;
    async function readAll() {
      const rows: MobileRecord[] = []; let cursor: string | null = null;
      do { const data: MobilePage = await client.request(`/api/mobile/investor/records/watchlist?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`); rows.push(...data.records); cursor = data.nextCursor; } while (cursor && mounted);
      if (mounted) setWatchlist(rows);
    }
    void readAll().catch(error => { if (mounted) setError(error.code ?? 'LOAD_UNAVAILABLE'); });
    return () => { mounted = false; };
  }, [client, client.generation]);
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
  const { t } = useUI(); const [quote, setQuote] = useState<Record<string, unknown> | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setBusy(true); setError(''); try { const data = await publicRequest<{ quote: Record<string, unknown> }>(base, `/api/sfm-market/v1/quote/${encodeURIComponent(symbol)}`); setQuote(data.quote); } catch (error) { setError(error instanceof MobileRequestError ? error.code : 'DATA_UNAVAILABLE'); } finally { setBusy(false); } }, [base, symbol]);
  useEffect(() => { void load(); }, [load]);
  return <ScrollView contentContainerStyle={{ gap: 15 }}><Label large>{symbol}</Label>{busy ? <Busy /> : null}{error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}{quote ? <Panel>{['price', 'currency', 'change', 'changePercent', 'source', 'asOf', 'observedAt', 'delayed'].filter(key => quote[key] != null).map(key => <View key={key}><Label muted>{key}</Label><Label>{formatValue(quote[key])}</Label></View>)}</Panel> : null}<Button label={t(['تحديث السعر', 'Refresh quote', 'Actualiser le cours'])} onPress={() => { void load(); }} disabled={busy} /></ScrollView>;
}
