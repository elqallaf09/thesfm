import { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { fetchJson, message, site } from './api';
import { openScreen } from './navigation';
import { Button, Busy, Card, Copy, ErrorNote, Input, Page, Title } from './ui';
import { shariahTag } from '../presentation';

type Instrument = { symbol: string; name: string; displayName?: string; displaySymbol?: string; source?: string; assetType?: string; currency?: string; marketName?: string; shariahStatus?: string };
type Quote = { price?: number | null; available?: boolean; changePercent?: number | null; source?: string; delayed?: boolean; asOf?: string };
type Story = { id: string; title: string; summary?: string; sourceName?: string; publishedAt?: string };
const colors = { success: '#5EEAD4', danger: '#FB7185', warning: '#E9B65B', muted: '#99A4BA' };
export function MarketScreen({ path }: { path: string }) {
  const [items, setItems] = useState<Instrument[]>([]); const [quote, setQuote] = useState<Quote | null>(null); const [news, setNews] = useState<Story[]>([]);
  const [query, setQuery] = useState(''); const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  const symbol = path.startsWith('/symbol-details/') ? decodeURIComponent(path.slice('/symbol-details/'.length)) : '';
  const newsMode = path === '/market-news'; const sharia = path === '/sharia-stocks';
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      if (newsMode) { const body = await fetchJson<{ ok?: boolean; news?: Story[]; items?: Story[]; stories?: Story[] }>(`${site}/api/market-news?limit=30&lang=ar`); if (body.ok === false) throw new Error('الأخبار غير متاحة الآن. أعد المحاولة لاحقاً'); setNews(body.news || body.items || body.stories || []); }
      else {
        const body = await fetchJson<{ markets: Instrument[] }>(`${site}/api/markets?limit=200&quality=complete`); setItems(body.markets || []);
        if (symbol) { const prices = await fetchJson<{ prices: Record<string, Quote> }>(`${site}/api/market-directory/quotes?symbols=${encodeURIComponent(symbol)}`); setQuote(prices.prices?.[symbol] || null); }
      }
    } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  }, [symbol, newsMode]);
  useEffect(() => { void load(); }, [load]);
  const selected = items.find(item => item.symbol === symbol || item.displaySymbol === symbol);
  const filtered = items.filter(item => (!sharia || ['compliant', 'متوافق'].includes((item.shariahStatus || '').toLowerCase())) && (!query || `${item.symbol} ${item.name} ${item.displayName || ''}`.toLowerCase().includes(query.toLowerCase())));
  return <Page><Title>{symbol ? selected?.displayName || selected?.name || symbol : newsMode ? 'أخبار السوق' : sharia ? 'الأدوات المتوافقة حسب المصدر' : 'الأسواق'}</Title><ErrorNote text={error} /><Button title="تحديث" secondary onPress={() => { void load(); }} disabled={busy} />{busy ? <Busy /> : null}
    {symbol ? <><Card><Title>{symbol}</Title><Title>{quote?.available && quote.price != null ? `${quote.price.toLocaleString('en-US')} ${selected?.currency || ''}` : 'السعر غير متاح'}</Title><Copy>{quote?.changePercent == null ? 'التغير: —' : `التغير: ${quote.changePercent.toFixed(2)}%`}</Copy><Copy>{quote?.source || selected?.source || 'المصدر غير متاح'}{quote?.delayed ? ' · بيانات متأخرة' : ''}</Copy>{quote?.asOf ? <Copy>{quote.asOf}</Copy> : null}<Copy>{selected?.marketName || ''}</Copy><Copy>{shariahTag(selected?.shariahStatus, colors)?.label || 'الحالة الشرعية غير متاحة'}</Copy></Card><Button title="إدارة قائمة المتابعة" onPress={() => openScreen('/market-watchlist')} /><Button title="إدارة التنبيهات" secondary onPress={() => openScreen('/alerts')} /></> : newsMode ? news.map((story, i) => <Card key={story.id || String(i)}><Title>{story.title}</Title><Copy>{story.summary || 'لم يوفر المصدر ملخصاً لهذا الخبر.'}</Copy><Copy>{story.sourceName || 'مصدر غير محدد'} · {story.publishedAt ? new Date(story.publishedAt).toLocaleDateString('ar-KW-u-nu-latn') : '—'}</Copy></Card>) : <><Input label="ابحث بالاسم أو الرمز" value={query} onChange={setQuery} /><Copy>عرض {filtered.length} أداة من الدليل المحمّل. الحالة الشرعية حسب المصدر المتاح.</Copy>{filtered.map((item, i) => <Pressable accessibilityRole="button" key={`${item.symbol}-${i}`} onPress={() => openScreen(`/symbol-details/${encodeURIComponent(item.symbol)}`)}><Card><Title>{item.displayName || item.name}</Title><Copy>{item.displaySymbol || item.symbol} · {item.marketName || item.assetType || '—'}</Copy><Copy>{shariahTag(item.shariahStatus, colors)?.label || 'غير مصنف'}</Copy></Card></Pressable>)}</>}
    {!busy && !error && ((newsMode && !news.length) || (!symbol && !newsMode && !filtered.length)) ? <Copy>لا توجد نتائج متاحة الآن.</Copy> : null}
  </Page>;
}
