import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Linking, View } from 'react-native';
import { publicRequest } from './MarketsScreen';
import { Button, Busy, Empty, ErrorNotice, formatValue, Input, Label, Panel, useUI } from './ui';
import { MobileRequestError } from './session';
type FeedRow = Record<string, unknown>;
const string = (row: FeedRow, ...keys: string[]) => { for (const key of keys) if (typeof row[key] === 'string' && row[key]) return row[key] as string; return ''; };
export function InvestorFeeds({ base, kind }: { base: string; kind: 'news' | 'calendar' | 'screening' }) {
  const { t, language } = useUI(); const [rows, setRows] = useState<FeedRow[]>([]); const [query, setQuery] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [page, setPage] = useState(1); const [more, setMore] = useState(false); const sequence = useRef(0);
  const remoteQuery = kind === 'news' ? query : '';
  const load = useCallback(async (nextPage = 1) => {
    const requestId = ++sequence.current; setBusy(true); setError('');
    const path = kind === 'news' ? `/api/market-news?language=${language}&page=${nextPage}&pageSize=30&q=${encodeURIComponent(remoteQuery)}` : kind === 'calendar' ? '/api/economic-calendar?timezone=Asia%2FKuwait' : '/api/sharia-stocks/screening';
    try {
      const data = await publicRequest<Record<string, unknown>>(base, path);
      if (requestId !== sequence.current) return;
      const items = (Array.isArray(data.items) ? data.items : Array.isArray(data.events) ? data.events : []).filter((row): row is FeedRow => Boolean(row) && typeof row === 'object');
      setRows(previous => nextPage === 1 ? items : [...previous, ...items.filter(row => !previous.some(old => old.id === row.id && row.id != null))]); setPage(nextPage); setMore(kind === 'news' && nextPage < Number(data.totalPages));
    } catch (error) { if (requestId === sequence.current) setError(error instanceof MobileRequestError ? error.code : 'DATA_UNAVAILABLE'); }
    finally { if (requestId === sequence.current) setBusy(false); }
  }, [base, kind, language, remoteQuery]);
  useEffect(() => { const counter = sequence; const timer = setTimeout(() => { void load(); }, 300); return () => { clearTimeout(timer); ++counter.current; }; }, [load]);
  const filtered = kind === 'news' || !query.trim() ? rows : rows.filter(row => Object.values(row).some(value => typeof value === 'string' && value.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
  async function openSource(row: FeedRow) {
    const source = string(row, 'originalUrl', 'canonicalUrl', 'url', 'sourceUrl');
    try { if (new URL(source).protocol === 'https:') await Linking.openURL(source); } catch { setError('LINK_UNAVAILABLE'); }
  }
  return <View style={{ flex: 1, gap: 12 }}><Label large>{t(kind === 'news' ? ['الأخبار المالية', 'Financial news', 'Actualités financières'] : kind === 'calendar' ? ['التقويم الاقتصادي', 'Economic calendar', 'Calendrier économique'] : ['الفحص الشرعي', 'Shariah screening', 'Filtrage charia'])}</Label><Input label={t(['بحث', 'Search', 'Rechercher'])} value={query} onChange={setQuery} />
    {error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}
    <FlatList data={filtered} keyExtractor={(row, index) => String(row.id ?? row.symbol ?? index)} refreshing={busy} onRefresh={() => { void load(); }} contentContainerStyle={{ gap: 12, paddingBottom: 20 }} ListEmptyComponent={busy ? <Busy /> : <Empty />} renderItem={({ item }) => <Panel>
      <Label large>{string(item, 'translatedTitle', 'title', 'eventName', 'name', 'displayName', 'symbol') || '—'}</Label>
      {kind === 'news' ? <><Label>{string(item, 'translatedSummary', 'summary')}</Label><Label muted>{[string(item, 'sourceName', 'providerName'), string(item, 'publishedAt')].filter(Boolean).join(' · ')}</Label></> : null}
      {kind === 'calendar' ? <><Label>{[string(item, 'country'), string(item, 'currency'), string(item, 'dateTimeUtc', 'dateTime')].filter(Boolean).join(' · ')}</Label>{[['actual', ['الفعلي', 'Actual', 'Réel']], ['forecast', ['التوقع', 'Forecast', 'Prévision']], ['previous', ['السابق', 'Previous', 'Précédent']]].map(([key, label]) => <Label key={String(key)}>{t(label as [string, string, string])}: {formatValue(item[String(key)])}</Label>)}<Label muted>{string(item, 'source', 'provider')}</Label></> : null}
      {kind === 'screening' ? <><Label>{string(item, 'symbol', 'displaySymbol')}</Label><Label>{t(item.shariahStatus === 'compliant' ? ['متوافق', 'Compliant', 'Conforme'] : item.shariahStatus === 'non_compliant' ? ['غير متوافق', 'Non-compliant', 'Non conforme'] : item.shariahStatus === 'needs_review' ? ['قيد المراجعة', 'Needs review', 'À vérifier'] : ['غير مصنف', 'Unclassified', 'Non classé'])}</Label><Label muted>{[string(item, 'screeningSource', 'sourceName'), string(item, 'lastScreenedAt')].filter(Boolean).join(' · ')}</Label></> : null}
      {string(item, 'originalUrl', 'canonicalUrl', 'url', 'sourceUrl') ? <Button label={t(['المصدر الأصلي', 'Original source', 'Source originale'])} onPress={() => { void openSource(item); }} /> : null}
    </Panel>} ListFooterComponent={more ? <Button label={t(['تحميل المزيد', 'Load more', 'Charger la suite'])} onPress={() => { void load(page + 1); }} disabled={busy} /> : null} />
  </View>;
}
