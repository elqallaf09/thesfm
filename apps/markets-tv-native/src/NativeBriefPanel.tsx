import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TVTextScrollView, View } from 'react-native';
import { briefSummary, obsText, type TvBriefStats } from '../../../src/lib/markets-tv/obsidian';
import { tvQuotePrice, tvQuoteTime, tvText } from '../../../src/lib/markets-tv/i18n';
import { tvQuoteMovement } from '../../../src/lib/markets-tv/quote-presentation';
import { quoteStatus } from '../../../src/lib/markets-tv/quote-status';
import { tvSceneQuoteKey } from '../../../src/lib/markets-tv/scene-quotes';
import { tvSceneQuoteUnit, tvSceneText } from '../../../src/lib/markets-tv/scene-display';
import type { TvQuote } from '../../../src/lib/markets-tv/types';
import { nativeBriefPage, type NativeBriefView } from './briefModel';
import { t } from './copy';
import { Label, usePresentation } from './presentation';
import { r } from './receiverCopy';
import { TvButton } from './TvControls';
import { useSnapshot } from './useSnapshot';

function Action({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const { colors, align } = usePresentation();
  return <TvButton label={label} selected={selected} onPress={onPress}>
    <Text style={[s.actionText, align, { color: colors.text }]}>{label}</Text>
  </TvButton>;
}

function Metrics({ stats }: { stats: TvBriefStats }) {
  const { language, colors, row, align } = usePresentation();
  const average = tvQuoteMovement(stats.average).value;
  const cards = [
    { key: 'average', label: obsText(language, 'average'), value: average,
      detail: stats.basis === '24h' ? tvSceneText(language, 'day') : tvText(language, 'regularSessions') },
    { key: 'breadth', label: obsText(language, 'breadth'), value: stats.comparable ? `${stats.rising} ↑  ${stats.falling} ↓  ${stats.unchanged} =` : '—',
      detail: `${stats.comparable} ${obsText(language, 'comparable')}` },
    { key: 'available', label: obsText(language, 'available'), value: `${stats.available} / ${stats.total}`, detail: obsText(language, 'scope') },
    { key: 'recent', label: obsText(language, 'health'), value: `${stats.recent} / ${stats.total}`,
      detail: obsText(language, !stats.recent ? 'noneRecent' : stats.recent === stats.total ? 'current' : 'partial') },
  ];
  return <View style={[s.metrics, row]}>{cards.map(card => <View key={card.key} style={[s.metric, { backgroundColor: colors.panel }]}>
    <Text style={[s.caption, align, { color: colors.muted }]}>{card.label}</Text>
    <Text style={[s.metricValue, { color: colors.text }]}>{card.value}</Text>
    {card.key === 'breadth' && stats.comparable > 0 && <View style={s.distribution} accessible={false}>
      {stats.rising > 0 && <View style={{ flex: stats.rising, backgroundColor: colors.up }}/>}
      {stats.unchanged > 0 && <View style={{ flex: stats.unchanged, backgroundColor: colors.muted }}/>}
      {stats.falling > 0 && <View style={{ flex: stats.falling, backgroundColor: colors.down }}/>}
    </View>}
    <Text style={[s.note, align, { color: colors.muted }]}>{card.detail}</Text>
  </View>)}</View>;
}

function QuoteCard({ quote, stats, now }: { quote: TvQuote; stats: TvBriefStats; now: number }) {
  const { language, colors, row, align } = usePresentation();
  const comparable = stats.comparableKeys.has(tvSceneQuoteKey(quote));
  const movement = tvQuoteMovement(comparable ? quote.changePercent : null);
  const status = quoteStatus(quote, now);
  const excluded = quote.changeBasis && quote.changeBasis !== stats.basis ? 'differentPeriod'
    : quote.changePercent === null ? 'changeMissing' : 'outsideComparison';
  const trend = movement.trend === 'up' ? colors.up : movement.trend === 'down' ? colors.down : colors.muted;
  return <View style={[s.quote, { backgroundColor: colors.panel }]}>
    <Text style={[s.quoteName, align, { color: colors.text }]}>{language === 'ar' ? quote.nameAr : quote.name}</Text>
    <Text style={[s.caption, align, { color: colors.muted }]}>{[quote.displaySymbol || quote.symbol, quote.exchange, quote.country].filter(Boolean).join(' · ')}</Text>
    <View style={[s.quoteNumbers, row]}>
      <Text style={[s.price, { color: colors.text }]}>{`${tvQuotePrice(quote)} ${tvSceneQuoteUnit(quote, language)}`}</Text>
      <Text style={[s.movement, { color: trend }]}>{movement.value}</Text>
    </View>
    {!comparable && <Text style={[s.note, align, { color: colors.muted }]}>{obsText(language, excluded)}</Text>}
    <Text style={[s.caption, align, { color: colors.muted }]}>{`${quote.source || '—'} · ${tvText(language, status)}`}</Text>
    <Text style={[s.timestamp, { color: colors.muted }]}>{tvQuoteTime(quote.observedAt, language, now, status === 'stale')}</Text>
  </View>;
}

/** Native rendering of the same bounded overview sample used by the web brief. */
export function NativeBriefPanel({ revision, page, changePage }: {
  revision: number; page: number; changePage: (value: number) => void;
}) {
  const { language, colors, row, align } = usePresentation();
  const [requested, setRequested] = useState<NativeBriefView>('highlights');
  const [retry, setRetry] = useState(0), [now, setNow] = useState(Date.now()), [focused, setFocused] = useState(false);
  const result = useSnapshot('overview', revision + retry);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(timer); }, []);
  const model = useMemo(() => nativeBriefPage(result.data, requested, page, now), [result.data, requested, page, now]);
  const { stats, pricesOnly, savedOnly, view } = model;
  const empty = !result.data || !stats.total;
  const headline = empty ? result.loading ? 'loadingBrief' : result.error ? 'unavailableBrief' : 'emptyBrief'
    : savedOnly ? 'savedBrief' : stats.headline;
  const choose = (value: NativeBriefView) => { setRequested(value); changePage(0); };
  const leaderLabel = stats.leaders.length > 1
    ? `${obsText(language, 'jointLeaders')} · ${stats.leaders.length}` : obsText(language, 'largestMove');
  return <View style={s.fill}>
    <View style={[s.heading, row]}>
      <View style={s.headingText}><Label large>{obsText(language, headline)}</Label>
        {!empty && <Text style={[s.caption, align, { color: colors.muted }]}>{pricesOnly
          ? obsText(language, savedOnly ? 'savedBriefNote' : 'pricesOnlyNote') : briefSummary(stats, language)}</Text>}
      </View>
      {result.loading && <ActivityIndicator color={colors.border}/>}
      <Action label={tvText(language, empty || result.error ? 'retry' : 'refresh')} onPress={() => setRetry(value => value + 1)}/>
    </View>
    {result.error && !empty && <Text accessibilityRole="alert" style={[s.caption, align, { color: colors.muted }]}>{t(language, 'error')}</Text>}
    {!empty && <>
      <Metrics stats={stats}/>
      <View style={[s.toolbar, row]}>
        {stats.comparable > 0 && <Action label={obsText(language, 'highlights')} selected={view === 'highlights'} onPress={() => choose('highlights')}/>}
        <Action label={`${obsText(language, 'samplePrices')} · ${stats.available}`} selected={view === 'prices'} onPress={() => choose('prices')}/>
        {stats.leaders.length > 0 && <Action label={leaderLabel} selected={view === 'leaders'} onPress={() => choose('leaders')}/>}
      </View>
      <TVTextScrollView focusable accessibilityLabel={obsText(language, view === 'prices' ? 'samplePrices' : view === 'leaders' ? 'largestMove' : 'highlights')}
        style={[s.results, { borderColor: focused ? colors.border : 'transparent' }]} contentContainerStyle={[s.quoteGrid, row]}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
        {model.rows.map(quote => <QuoteCard key={tvSceneQuoteKey(quote)} quote={quote} stats={stats} now={now}/>)}
        {!model.rows.length && <Label>{view === 'prices' ? t(language, 'noPrice') : obsText(language, stats.comparable ? 'noMoves' : 'noComparable')}</Label>}
      </TVTextScrollView>
      <View style={[s.footer, row]}>
        <Action label={r(language, 'previous')} onPress={() => changePage((model.page + model.pages - 1) % model.pages)}/>
        <Text style={[s.caption, { color: colors.text }]}>{`${r(language, 'page')} ${model.page + 1} / ${model.pages}`}</Text>
        <Action label={r(language, 'next')} onPress={() => changePage((model.page + 1) % model.pages)}/>
        <View style={s.asOf}><Text style={[s.note, align, { color: colors.muted }]}>{obsText(language, 'kuwait')}</Text>
          {result.data?.generatedAt && <Text style={[s.note, align, { color: colors.muted }]}>{`${obsText(language, 'briefAsOf')} ${tvQuoteTime(result.data.generatedAt, language, now)}`}</Text>}
        </View>
      </View>
    </>}
  </View>;
}

const s = StyleSheet.create({
  fill: { flex: 1, minHeight: 0, gap: 14 }, heading: { gap: 20, alignItems: 'center' }, headingText: { flex: 1, gap: 6 },
  metrics: { gap: 16 }, metric: { flex: 1, minWidth: 0, borderRadius: 18, padding: 18, gap: 6 },
  metricValue: { fontFamily: 'SfmArabic', fontSize: 34, fontVariant: ['tabular-nums'], writingDirection: 'ltr', textAlign: 'center' },
  distribution: { height: 7, flexDirection: 'row', borderRadius: 4, overflow: 'hidden' },
  caption: { fontFamily: 'SfmArabic', fontSize: 24, flexShrink: 1 }, note: { fontFamily: 'SfmArabic', fontSize: 21, flexShrink: 1 },
  actionText: { fontFamily: 'SfmArabic', fontSize: 26 }, toolbar: { gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  results: { flex: 1, minHeight: 0, borderWidth: 2, borderRadius: 18 }, quoteGrid: { gap: 18, alignItems: 'flex-start', padding: 6 },
  quote: { flex: 1, minWidth: 0, padding: 22, borderRadius: 18, gap: 8 }, quoteName: { fontFamily: 'SfmArabic', fontSize: 29 },
  quoteNumbers: { alignItems: 'center', justifyContent: 'space-between', gap: 18 },
  price: { fontFamily: 'SfmArabic', fontSize: 36, flexShrink: 1, writingDirection: 'ltr' },
  movement: { fontFamily: 'SfmArabic', fontSize: 32, writingDirection: 'ltr' },
  timestamp: { fontFamily: 'SfmArabic', fontSize: 23, writingDirection: 'ltr' },
  footer: { alignItems: 'center', gap: 18 }, asOf: { flex: 1, gap: 2 },
});
