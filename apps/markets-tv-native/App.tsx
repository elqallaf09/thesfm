import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Image, Modal, Platform, StyleSheet, TVEventControl, TVFocusGuideView, useTVEventHandler, useWindowDimensions, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SecureStore from 'expo-secure-store';
import { TV_RECEIVER_CHANNELS, isTvReceiverChannel, nextTvReceiverChannel, receiverText, type TvReceiverChannel } from '../../src/lib/markets-tv/receiver';
import { durationClock } from '../../src/lib/markets-tv/sessionTimeline';
import type { Language } from './src/api';
import { t } from './src/copy';
import { r } from './src/receiverCopy';
import { Label, palette, Presentation } from './src/presentation';
import { NewsPanel, Pages, PortfolioPanel, SessionsPanel, StocksPanel } from './src/ReceiverPanels';
import { TvButton } from './src/TvControls';
import { useDevice } from './src/useDevice';
import arabicFont from './assets/IBMPlexSansArabic-Regular.ttf';
import appIcon from './assets/icon.png';

const PREFS = 'sfm.tv.preferences.v1';
export default function App() {
  const [fontsLoaded, fontError] = useFonts({ SfmArabic: arabicFont });
  const [language, setLanguage] = useState<Language>('ar'), [light, setLight] = useState(false), [preferencesReady, setPreferencesReady] = useState(false);
  const [channel, setChannel] = useState<TvReceiverChannel>('allStocks'), [page, setPage] = useState(0), [revision, setRevision] = useState(0);
  const [guide, setGuide] = useState(false), [guidePage, setGuidePage] = useState(0), [pairDialog, setPairDialog] = useState(false);
  const [rotation, setRotation] = useState(true), [now, setNow] = useState(Date.now()), [foreground, setForeground] = useState(true);
  const device = useDevice(), activity = useRef(Date.now());
  const cancelPair = device.cancel;
  const { width, height } = useWindowDimensions(), scale = Math.min(width / 1920, height / 1080);
  const colors = palette(light), row = { flexDirection: language === 'ar' ? 'row-reverse' as const : 'row' as const };
  const interact = useCallback(() => { activity.current = Date.now(); }, []);
  useEffect(() => {
    let stopped = false;
    void SecureStore.getItemAsync(PREFS).then(raw => {
      if (stopped || !raw) return;
      const value = JSON.parse(raw) as Record<string, unknown>;
      if (['ar', 'en', 'fr'].includes(String(value.language))) setLanguage(value.language as Language);
      setLight(value.light === true); setRotation(value.rotation !== false);
      if (isTvReceiverChannel(value.channel)) setChannel(value.channel);
    }).catch(() => {}).finally(() => { if (!stopped) setPreferencesReady(true); });
    return () => { stopped = true; };
  }, []);
  useEffect(() => {
    if (preferencesReady) void SecureStore.setItemAsync(PREFS, JSON.stringify({ language, light, rotation, channel })).catch(() => {});
  }, [language, light, rotation, channel, preferencesReady]);
  const choose = useCallback((value: TvReceiverChannel) => { interact(); setChannel(value); setPage(0); setGuide(false); }, [interact]);
  const closePair = useCallback(() => { interact(); cancelPair(); setPairDialog(false); }, [interact, cancelPair]);
  const back = useCallback(() => {
    interact();
    if (pairDialog) { closePair(); return true; }
    if (guide) { setGuide(false); return true; }
    if (channel !== 'allStocks') { choose('allStocks'); return true; }
    return false;
  }, [interact, pairDialog, closePair, guide, channel, choose]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    if (Platform.OS === 'ios' && Platform.isTV) {
      if (pairDialog || guide || channel !== 'allStocks') TVEventControl.enableTVMenuKey(); else TVEventControl.disableTVMenuKey();
    }
    return () => { subscription.remove(); if (Platform.OS === 'ios' && Platform.isTV) TVEventControl.disableTVMenuKey(); };
  }, [back, pairDialog, guide, channel]);
  useTVEventHandler(event => {
    interact();
    if (event.eventKeyAction === 0) return;
    if (event.eventType === 'menu') back();
    if (pairDialog || guide) return;
    if (event.eventType === 'playPause') setRotation(value => !value);
    if (event.eventType === 'channelUp') choose(nextTvReceiverChannel(channel, 1));
    if (event.eventType === 'channelDown') choose(nextTvReceiverChannel(channel, -1));
  });
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { setForeground(state === 'active'); interact(); });
    return () => sub.remove();
  }, [interact]);
  useEffect(() => {
    if (!foreground) return;
    const timer = setInterval(() => {
      if (pairDialog) setNow(Date.now());
      if (!rotation || guide || pairDialog || Date.now() - activity.current < 40_000) return;
      setPage(value => value + 1); activity.current = Date.now();
    }, 1000);
    return () => clearInterval(timer);
  }, [foreground, rotation, guide, pairDialog]);
  const changePage = (value: number) => { interact(); setPage(value); };
  const refresh = () => { interact(); setRevision(value => value + 1); };
  const frame = { width: 1920, height: 1080, transform: [{ scale }] };
  if ((!fontsLoaded && !fontError) || !preferencesReady) return <View style={s.loading}><ActivityIndicator size="large" color="#D4AF6A"/></View>;
  return <Presentation.Provider value={{ language, light }}><View style={[s.root, { backgroundColor: colors.bg }]}>
    <View style={[s.screen, frame, { backgroundColor: colors.bg }]}>
      <View style={[s.header, row]}><Image source={appIcon} style={s.logo} alt="THE SFM" accessibilityLabel="THE SFM"/><View style={s.brand}><Label large>THE SFM TV</Label><Label muted>{receiverText(language, channel)}</Label></View>
        <TvButton onPress={() => { interact(); setLight(value => !value); }}>{r(language, light ? 'night' : 'day')}</TvButton>
        <TvButton onPress={() => { interact(); setLanguage(value => value === 'ar' ? 'en' : value === 'en' ? 'fr' : 'ar'); }}>{language === 'ar' ? 'English' : language === 'en' ? 'Français' : 'العربية'}</TvButton>
      </View>
      <TVFocusGuideView autoFocus style={[s.navigation, row]}>
        <TvButton initial onPress={() => { interact(); setGuidePage(Math.floor(TV_RECEIVER_CHANNELS.indexOf(channel) / 5)); setGuide(true); }}>{r(language, 'channels')}</TvButton>
        <TvButton onPress={() => choose(nextTvReceiverChannel(channel, -1))}>CH−</TvButton><TvButton onPress={() => choose(nextTvReceiverChannel(channel, 1))}>CH+</TvButton>
        <TvButton onPress={() => { interact(); setPairDialog(true); }}>{r(language, device.token ? 'linked' : 'pair')}</TvButton>
        <TvButton onPress={refresh}>{t(language, 'refresh')}</TvButton>
        <TvButton selected={rotation} onPress={() => { interact(); setRotation(value => !value); }}>{r(language, rotation ? 'pause' : 'play')}</TvButton>
      </TVFocusGuideView>
      <View style={s.content}>
        {foreground && (channel === 'allStocks' ? <StocksPanel key={channel} kuwait={false} page={page} changePage={changePage} revision={revision}/>
          : channel === 'sessions' ? <SessionsPanel page={page} changePage={changePage}/>
          : channel === 'investments' ? <PortfolioPanel token={device.token} page={page} changePage={changePage} revision={revision} revoked={device.forget}/>
          : channel === 'kuwait' && page % 2 === 0 ? <StocksPanel key={channel} kuwait page={Math.floor(page / 2)} changePage={value => changePage(value * 2 + 1)} revision={revision}/>
          : <NewsPanel channel={channel === 'kuwait' ? 'kuwait' : channel} page={page} changePage={changePage} revision={revision}/>)}
      </View>
      <Label muted>{`${TV_RECEIVER_CHANNELS.indexOf(channel) + 1} / ${TV_RECEIVER_CHANNELS.length} · ${receiverText(language, channel)} · ${rotation ? '40s' : 'Ⅱ'}`}</Label>
    </View>
    <Modal visible={guide || pairDialog} transparent onRequestClose={back} animationType="fade">
      <View style={[s.root, s.backdrop]}><View style={[s.modalFrame, frame]}><TVFocusGuideView autoFocus trapFocusUp trapFocusDown trapFocusLeft trapFocusRight style={[s.dialog, { backgroundColor: colors.panel, borderColor: colors.border }]}>
        <Label large>{r(language, guide ? 'channels' : 'pair')}</Label>
        {guide ? <><View style={s.guide}>{TV_RECEIVER_CHANNELS.slice(guidePage * 5, guidePage * 5 + 5).map(value => <TvButton key={value} selected={channel === value} onPress={() => choose(value)}>{`${String(TV_RECEIVER_CHANNELS.indexOf(value) + 1).padStart(2, '0')}  ${receiverText(language, value)}`}</TvButton>)}</View>
          <Pages page={guidePage} pages={5} change={value => { interact(); setGuidePage(value); }}/></>
          : device.token ? <><Label>{r(language, 'linked')}</Label><TvButton disabled={device.busy} onPress={() => { void device.unlink(); }}>{r(language, 'unlink')}</TvButton></>
          : <><Label>{r(language, 'instructions')}</Label>{device.pair ? <><Label large>{device.pair.code}</Label>
            <Label>{`${r(language, 'expiry')} ${durationClock(Date.parse(device.pair.expiresAt) - now)}`}</Label><Label muted>{r(language, 'confirming')}</Label></>
            : <TvButton disabled={device.busy || !device.ready} onPress={() => { void device.create(); }}>{r(language, 'create')}</TvButton>}</>}
        {pairDialog && device.error && <Label>{device.error === 410 ? r(language, 'expired') : device.error === 429 ? r(language, 'limit') : device.error === 500 ? r(language, 'storage') : t(language, 'error')}</Label>}
        {pairDialog && device.busy && <ActivityIndicator color={colors.border}/>}
        <TvButton onPress={() => { if (guide) { interact(); setGuide(false); } else closePair(); }}>{t(language, 'close')}</TvButton>
      </TVFocusGuideView></View></View>
    </Modal>
  </View></Presentation.Provider>;
}
const s = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  screen: { paddingHorizontal: 72, paddingVertical: 48, gap: 22 }, header: { alignItems: 'center', gap: 24 }, brand: { flex: 1 }, logo: { width: 80, height: 80, resizeMode: 'contain' },
  navigation: { alignItems: 'center', gap: 18 }, content: { flex: 1, minHeight: 0 }, loading: { flex: 1, justifyContent: 'center', backgroundColor: '#06080C' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.85)' }, modalFrame: { alignItems: 'center', justifyContent: 'center' }, dialog: { width: 1320, borderWidth: 2, borderRadius: 24, padding: 44, gap: 22 }, guide: { gap: 12 } });
