import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { TV_WORLD_SESSIONS } from '../../../src/lib/markets-tv/worldSessions';
import { sessionTimeline, durationClock } from '../../../src/lib/markets-tv/sessionTimeline';
import { receiverText } from '../../../src/lib/markets-tv/receiver';
import type { TvReceiverNewsChannel } from '../../../src/lib/markets-tv/newsReceiver';
import { currentStatus, formatQuotePrice, hasPrice } from './api';
import { quoteLabel, t } from './copy';
import { Label, Panel, usePresentation, kuwaitDate, money } from './presentation';
import { readCatalog, readDirectory, readNews, parsePortfolio, request, directoryLocation } from './receiverApi';
import { useResource } from './useResource';
import { r } from './receiverCopy';
import { TvButton } from './TvControls';

export function Pages({ page, pages, change }: { page: number; pages: number; change: (page: number) => void }) {
  const { language, row } = usePresentation();
  return <View style={[s.row, row]}><TvButton onPress={() => change((page + pages - 1) % pages)}>{r(language, 'previous')}</TvButton>
    <Label>{`${r(language, 'page')} ${page + 1} / ${pages}`}</Label><TvButton onPress={() => change((page + 1) % pages)}>{r(language, 'next')}</TvButton></View>;
}
function Status({ loading, error }: { loading: boolean; error: number | null }) {
  const { language, colors } = usePresentation();
  return loading ? <ActivityIndicator color={colors.border} size="large"/> : error ? <Label>{error === 429 ? r(language, 'limit') : t(language, 'error')}</Label> : null;
}
export function NewsPanel({ channel, page, changePage, revision }: { channel: TvReceiverNewsChannel; page: number; changePage: (page: number) => void; revision: number }) {
  const { language } = usePresentation();
  const load = useCallback((signal: AbortSignal) => readNews(channel, language, signal), [channel, language]);
  const result = useResource(`${channel}:${language}:${revision}`, load, 180_000);
  const data = result.data, pages = Math.max(1, Math.ceil((data?.stories.length || 0) / 2)), current = page % pages;
  return <View style={s.fill}><Status {...result}/><Label muted>{r(language, 'sourceLanguage')}</Label>
    {data?.partial && <Label muted>{receiverText(language, 'partial')}</Label>}
    {data?.stored && <Label muted>{receiverText(language, 'stored')}</Label>}
    <View style={s.stories}>{data?.stories.slice(current * 2, current * 2 + 2).map(story => <Panel key={story.id}>
      <Label large>{story.title}</Label><Label muted>{`${story.source} · ${kuwaitDate(story.publishedAt)}`}</Label>
      {story.screening && <Label muted>{receiverText(language, story.screening)}</Label>}
    </Panel>)}</View>
    {data && !data.stories.length && <Label>{t(language, 'noData')}</Label>}
    <Pages page={current} pages={pages} change={changePage}/>
  </View>;
}
export function PortfolioPanel({ token, page, changePage, revision, revoked }: { token: string | null; page: number; changePage: (page: number) => void; revision: number; revoked: () => Promise<void> }) {
  const { language, row } = usePresentation();
  const load = useCallback(async (signal: AbortSignal) => parsePortfolio(await request('/api/tv/portfolio', signal, token || undefined)), [token]);
  const result = useResource(`${token || 'none'}:${revision}`, load, 15_000, Boolean(token), true);
  useEffect(() => { if (result.error === 401) void revoked().catch(() => {}); }, [result.error, revoked]);
  if (!token) return <Label>{r(language, 'signIn')}</Label>;
  const data = result.data, pages = Math.max(1, Math.ceil((data?.positions.length || 0) / 4)), current = page % pages;
  return <View style={s.fill}><Status {...result}/><Label muted>{r(language, 'recorded')}</Label>
    {data && <><View style={[s.row, row]}><Label large>{`${r(language, 'total')}: ${money(data.totalValue, data.currency)}`}</Label>
      <Label>{`${r(language, 'coverage')} ${data.valueCoverage} / ${data.total}`}</Label></View>
      <View style={[s.grid, row]}>{data.positions.slice(current * 4, current * 4 + 4).map(position => <View key={position.id} style={s.half}><Panel>
        <Label large>{position.name}</Label><Label>{`${position.symbol || ''}  ${money(position.amount, position.currency)}`}</Label>
        <Label muted>{`${r(language, position.freshness === 'recorded' ? 'recordedStatus' : position.freshness === 'stale' ? 'stale' : 'missing')} · ${kuwaitDate(position.valuedAt)}`}</Label>
      </Panel></View>)}</View>
      {!data.positions.length && <Label>{t(language, 'noData')}</Label>}
      <Label muted>{`${r(language, 'sync')}: ${kuwaitDate(data.generatedAt)}`}</Label></>}
    <Pages page={current} pages={pages} change={changePage}/>
  </View>;
}
export function SessionsPanel({ page, changePage }: { page: number; changePage: (page: number) => void }) {
  const { language, row, colors } = usePresentation();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const pages = Math.ceil(TV_WORLD_SESSIONS.length / 9), current = page % pages;
  return <View style={s.fill}><Label muted>{`${r(language, 'schedule')}  ${kuwaitDate(now)}`}</Label>
    <View style={[s.grid, row]}>{TV_WORLD_SESSIONS.slice(current * 9, current * 9 + 9).map(session => {
      const timeline = sessionTimeline(session, now);
      return <View key={session.id} style={[s.session, { backgroundColor: colors.panel, borderColor: timeline.open ? colors.up : colors.muted }]}>
        <Label>{`${session.region} · ${session.names[language === 'ar' ? 0 : language === 'fr' ? 2 : 1]}`}</Label>
        <Label muted>{r(language, timeline.open ? 'open' : 'closed')}</Label><Label large>{durationClock(timeline.remaining)}</Label>
      </View>;
    })}</View><Pages page={current} pages={pages} change={changePage}/>
  </View>;
}
export function StocksPanel({ kuwait, page, changePage, revision }: { kuwait: boolean; page: number; changePage: (page: number) => void; revision: number }) {
  const { language, row } = usePresentation();
  const catalog = useResource('catalog', readCatalog, 3600_000);
  const markets = catalog.data?.filter(m => !kuwait || m.id === 'BOURSA_KUWAIT') || [];
  const location = directoryLocation(markets, page), { market, page: marketPage } = location;
  const load = useCallback((signal: AbortSignal) => market ? readDirectory(market, marketPage, signal) : Promise.reject(new Error('NO_MARKET')), [market, marketPage]);
  const result = useResource(`${market?.id}:${marketPage}:${revision}`, load, 30_000, Boolean(market));
  return <View style={s.fill}><Status loading={catalog.loading || result.loading} error={catalog.error || result.error}/>
    <View style={[s.row, row]}><Label large>{market ? language === 'ar' ? market.labelAr : language === 'fr' ? market.labelFr : market.labelEn : t(language, 'noData')}</Label>
      {!kuwait && <TvButton onPress={() => changePage((location.start + location.pages) % location.total)}>{r(language, 'market')}</TvButton>}</View>
    <View style={[s.grid, row]}>{result.data?.quotes.map(quote => <View key={`${quote.exchange}:${quote.symbol}`} style={s.third}><Panel>
      <Label>{language === 'ar' ? quote.nameAr : quote.name}</Label><Label muted>{quote.symbol}</Label>
      <Label large>{`${formatQuotePrice(quote)} ${quote.currency || ''}`}</Label>
      <Label>{hasPrice(quote) && quote.changePercent !== null ? `${quote.changePercent > 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%` : '—'}</Label>
      <Label muted>{`${quoteLabel(language, quote.issue || currentStatus(quote))} · ${quote.source || '—'}`}</Label>
      <Label muted>{kuwaitDate(quote.observedAt)}</Label>
    </Panel></View>)}</View>
    <Pages page={marketPage} pages={result.data?.pages || location.pages} change={value => changePage(location.start + value)}/>
  </View>;
}
const s = StyleSheet.create({ fill: { flex: 1, gap: 14 }, row: { alignItems: 'center', gap: 24 }, grid: { flex: 1, gap: 18, flexWrap: 'wrap', alignContent: 'flex-start' },
  half: { width: '49%' }, third: { width: '32.5%' }, session: { width: '32.5%', borderRadius: 16, borderWidth: 1, padding: 18, gap: 8 }, stories: { flex: 1, gap: 18 } });
