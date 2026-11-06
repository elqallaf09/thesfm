import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Image, Modal, Platform, ScrollView, StyleSheet, Text, TVEventControl, TVFocusGuideView, useTVEventHandler, View } from 'react-native';
import { useFonts } from 'expo-font';
import { currentStatus, hasPrice, sampleMetrics, SCENES, type Language, type Quote, type Scene } from './src/api';
import { quoteLabel, t } from './src/copy';
import { useSnapshot } from './src/useSnapshot';
import { Metric, styles as controlStyles, TvButton } from './src/TvControls';
import arabicFont from './assets/IBMPlexSansArabic-Regular.ttf';
import appIcon from './assets/icon.png';

const percent = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
const date = (value: string | null) => value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Kuwait' }) : '—';
export default function App() {
  const [fontsLoaded, fontError] = useFonts({ SfmArabic: arabicFont });
  const [language, setLanguage] = useState<Language>('ar');
  const [scene, setScene] = useState<Scene>('overview'), [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState<Quote | null>(null), [brief, setBrief] = useState(false), [rotation, setRotation] = useState(false);
  const activity = useRef(Date.now());
  const interact = useCallback(() => { activity.current = Date.now(); }, []);
  const choose = (next: Scene) => { interact(); setScene(next); setBrief(false); };
  const back = useCallback(() => {
    interact();
    if (detail) { setDetail(null); return true; }
    if (brief) { setBrief(false); return true; }
    if (scene !== 'overview') { setScene('overview'); return true; }
    return false;
  }, [detail, brief, scene, interact]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    if (Platform.OS === 'ios' && Platform.isTV) {
      if (detail || brief || scene !== 'overview') TVEventControl.enableTVMenuKey(); else TVEventControl.disableTVMenuKey();
    }
    return () => { subscription.remove(); if (Platform.OS === 'ios' && Platform.isTV) TVEventControl.disableTVMenuKey(); };
  }, [back, detail, brief, scene]);
  useTVEventHandler(event => {
    interact();
    if (event.eventType === 'playPause' && event.eventKeyAction !== 0 && !detail) setRotation(value => !value);
  });
  useEffect(() => {
    if (!rotation || detail || brief) return;
    const timer = setInterval(() => {
      if (AppState.currentState !== 'active' || Date.now() - activity.current < 30_000) return;
      setScene(value => SCENES[(SCENES.indexOf(value) + 1) % SCENES.length]); activity.current = Date.now();
    }, 1000);
    return () => clearInterval(timer);
  }, [rotation, detail, brief]);
  const resource = useSnapshot(scene, revision), rtl = language === 'ar';
  const direction = { flexDirection: rtl ? 'row-reverse' as const : 'row' as const };
  const align = { textAlign: rtl ? 'right' as const : 'left' as const };
  const quotes = resource.data ? [...resource.data.summary, ...resource.data.quotes] : [];
  const stats = sampleMetrics(quotes);
  const refresh = () => { interact(); setRevision(value => value + 1); };
  if (!fontsLoaded && !fontError) return <View style={s.loading}><ActivityIndicator size="large" color="#D4AF6A"/></View>;
  function evidence(quote: Quote) {
    return <><Text style={[s.evidence, align]}>{quoteLabel(language, quote.issue || currentStatus(quote))} · {quote.source || '—'}</Text>
      <Text style={[s.evidence, align]}>{date(quote.observedAt)}</Text></>;
  }
  return <View style={s.screen}>
    <View style={[s.header, direction]}><Image source={appIcon} alt="THE SFM" style={s.logo}/><View style={s.brand}><Text style={s.title}>THE SFM</Text><Text style={s.evidence}>MARKETS TV</Text></View>
      <TvButton onPress={() => { interact(); setLanguage(value => value === 'ar' ? 'en' : value === 'en' ? 'fr' : 'ar'); }}>{language === 'ar' ? 'English' : language === 'en' ? 'Français' : 'العربية'}</TvButton>
      <TvButton onPress={refresh}>{t(language, 'refresh')}</TvButton></View>
    <TVFocusGuideView autoFocus style={[s.navigation, direction]}>
      {SCENES.map(value => <TvButton key={value} initial={value === 'overview'} selected={!brief && scene === value} onPress={() => choose(value)}>{t(language, value)}</TvButton>)}
      <TvButton selected={brief} onPress={() => { interact(); setBrief(value => !value); }}>{t(language, 'brief')}</TvButton>
      <TvButton selected={rotation} onPress={() => { interact(); setRotation(value => !value); }}>{`${rotation ? '⏸' : '▶'} ${t(language, 'rotation')}`}</TvButton>
    </TVFocusGuideView>
    {resource.error && <Text accessibilityRole="alert" style={[s.notice, align]}>{t(language, 'error')}</Text>}
    {!resource.data ? <View style={s.loading}>{resource.loading && <ActivityIndicator size="large" color="#D4AF6A"/>}<Text style={s.body}>{t(language, resource.loading ? 'loading' : 'error')}</Text><TvButton onPress={refresh}>{t(language, 'refresh')}</TvButton></View>
      : brief ? <View style={s.brief}><Text style={[s.body, align]}>{t(language, 'scope')}</Text><View style={[s.metrics, direction]}>
        <Metric label={t(language, 'prices')} value={`${stats.available} / ${stats.total}`}/><Metric label={t(language, 'rising')} value={String(stats.rising)}/>
        <Metric label={t(language, 'falling')} value={String(stats.falling)}/><Metric label={t(language, 'average')} value={percent(stats.average)}/>
      </View></View> : <ScrollView contentContainerStyle={s.content}>
        <TVFocusGuideView autoFocus style={[s.grid, direction]}>
          {quotes.map(quote => <TvButton key={quote.symbol} style={s.card} onPress={() => { interact(); setDetail(quote); }} label={`${language === 'ar' ? quote.nameAr : quote.name}, ${hasPrice(quote) ? quote.price : t(language, 'noPrice')}`}>
            <View style={s.cardContent}><Text numberOfLines={1} style={[s.cardName, align]}>{language === 'ar' ? quote.nameAr : quote.name}</Text><Text style={[s.symbol, align]}>{quote.symbol}</Text>
              <View style={[s.priceRow, direction]}><Text style={s.price}>{hasPrice(quote) ? quote.price!.toLocaleString('en-US', { maximumFractionDigits: 3 }) : '—'}</Text><Text style={s.body}>{quote.currency || ''}</Text><Text style={[s.change, { color: (quote.changePercent || 0) < 0 ? '#F19B9B' : '#86D7B6' }]}>{hasPrice(quote) ? percent(quote.changePercent) : '—'}</Text></View>
              {evidence(quote)}</View>
          </TvButton>)}
        </TVFocusGuideView>{!quotes.length && <Text style={s.body}>{t(language, 'noData')}</Text>}
      </ScrollView>}
    <Text style={[s.footer, align]}>{t(language, 'scope')}{resource.data ? ` · ${stats.available} / ${stats.total}` : ''}</Text>
    <Modal visible={detail !== null} transparent onRequestClose={() => { interact(); setDetail(null); }} animationType="fade">
      <View style={s.backdrop}><TVFocusGuideView autoFocus trapFocusUp trapFocusDown trapFocusLeft trapFocusRight style={s.dialog}>
        <Text style={[s.title, align]}>{detail && (language === 'ar' ? detail.nameAr : detail.name)}</Text><Text style={[s.symbol, align]}>{detail?.symbol}</Text>
        <Text style={s.price}>{detail && hasPrice(detail) ? `${detail.price} ${detail.currency || ''}` : t(language, 'noPrice')}</Text>
        {detail && evidence(detail)}<Text style={[s.evidence, align]}>{t(language, 'back')}</Text>
        <TvButton onPress={() => { interact(); setDetail(null); }}>{t(language, 'close')}</TvButton>
      </TVFocusGuideView></View>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06080C', paddingHorizontal: 48, paddingVertical: 30, gap: 20 },
  header: { alignItems: 'center', gap: 18 }, logo: { width: 54, height: 54, resizeMode: 'contain' }, brand: { flex: 1 },
  title: { color: '#F0F2F5', fontSize: 30, fontFamily: 'SfmArabic' }, body: { ...controlStyles.label, fontSize: 22 },
  navigation: { gap: 10, flexWrap: 'wrap' }, content: { padding: 6, paddingBottom: 24 },
  grid: { gap: 18, flexWrap: 'wrap' }, card: { width: '31.8%', minHeight: 190, padding: 18 }, cardContent: { gap: 8 },
  cardName: { color: '#F0F2F5', fontSize: 24, fontFamily: 'SfmArabic' }, symbol: { color: '#B7C1D0', fontSize: 18, writingDirection: 'ltr' },
  priceRow: { alignItems: 'center', gap: 12, flexWrap: 'wrap' }, price: { color: '#F0F2F5', fontSize: 36, fontVariant: ['tabular-nums'], writingDirection: 'ltr' },
  change: { fontSize: 22, fontVariant: ['tabular-nums'], writingDirection: 'ltr' }, evidence: { color: '#B7C1D0', fontSize: 17, fontFamily: 'SfmArabic' },
  notice: { color: '#F2D18E', fontSize: 20, fontFamily: 'SfmArabic' }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, backgroundColor: '#06080C' },
  brief: { flex: 1, gap: 24, justifyContent: 'center' }, metrics: { gap: 18 }, footer: { color: '#9BA8BA', fontSize: 16, fontFamily: 'SfmArabic' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 50 },
  dialog: { width: '65%', backgroundColor: '#101822', padding: 36, borderRadius: 20, gap: 20, borderWidth: 2, borderColor: '#D4AF6A' },
});
