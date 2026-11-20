import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Image, Linking, Modal, Platform, StyleSheet, TVEventControl, TVFocusGuideView, useTVEventHandler, useWindowDimensions, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SecureStore from 'expo-secure-store';
import { TV_RECEIVER_CHANNELS, isTvReceiverChannel } from '../../src/lib/markets-tv/receiver';
import { tvText } from '../../src/lib/markets-tv/i18n';
import type { TvAtlasRegion } from '../../src/lib/markets-tv/atlas';
import { durationClock } from '../../src/lib/markets-tv/sessionTimeline';
import type { Language } from './src/api';
import { t } from './src/copy';
import { r } from './src/receiverCopy';
import { Label, palette, Presentation } from './src/presentation';
import { NewsPanel, Pages, PortfolioPanel, SessionsPanel, StocksPanel } from './src/ReceiverPanels';
import { TvButton } from './src/TvControls';
import { useDevice } from './src/useDevice';
import { NativeBriefPanel } from './src/NativeBriefPanel';
import { NativeAtlasPanel } from './src/NativeAtlasPanel';
import { NativeAccountPanel } from './src/NativeAccountPanel';
import { featureText } from './src/featureCopy';
import { backNativeNavigation, DEFAULT_NATIVE_NAVIGATION, NATIVE_FEATURES, NATIVE_GUIDE, NATIVE_GUIDE_PAGE_SIZE, NATIVE_GUIDE_PAGES,
  nativeCanRotate, nativeDestinationText, nativeFeatureFromLink, nativeGuidePage, nativeLaunchNavigation, restoreNativePreferences,
  selectNativeDestination, selectNativeRegion, stepNativeChannel, type NativeDestination, type NativeFeature } from './src/nativeNavigation';
import arabicFont from './assets/IBMPlexSansArabic-Regular.ttf';
import appIcon from './assets/icon.png';

const PREFS = 'sfm.tv.preferences.v1';
export default function App() {
  const [fontsLoaded, fontError] = useFonts({ SfmArabic: arabicFont });
  const [language, setLanguage] = useState<Language>('ar'), [light, setLight] = useState(false), [preferencesReady, setPreferencesReady] = useState(false);
  const [navigation, setNavigation] = useState(DEFAULT_NATIVE_NAVIGATION), [page, setPage] = useState(0), [revision, setRevision] = useState(0);
  const [guide, setGuide] = useState(false), [guidePage, setGuidePage] = useState(0), [pairDialog, setPairDialog] = useState(false);
  const [rotation, setRotation] = useState(true), [now, setNow] = useState(Date.now()), [foreground, setForeground] = useState(true);
  const device = useDevice(), activity = useRef(Date.now());
  const cancelPair = device.cancel;
  const { width, height } = useWindowDimensions(), scale = Math.min(width / 1920, height / 1080);
  const colors = palette(light), row = { flexDirection: language === 'ar' ? 'row-reverse' as const : 'row' as const };
  const { destination, region } = navigation;
  const canRotate = nativeCanRotate(destination);
  const destinationText = nativeDestinationText(language, destination);
  const interact = useCallback(() => { activity.current = Date.now(); }, []);
  const choose = useCallback((value: NativeDestination) => {
    interact(); setNavigation(current => selectNativeDestination(current, value)); setPage(0); setNow(Date.now()); setGuide(false);
  }, [interact]);
  const stepChannel = useCallback((step: number) => {
    interact(); setNavigation(current => stepNativeChannel(current, step)); setPage(0); setGuide(false);
  }, [interact]);
  const chooseRegion = (value: TvAtlasRegion) => { interact(); setNavigation(selectNativeRegion(value)); setPage(0); };
  useEffect(() => {
    let stopped = false, restored = false;
    let pendingFeature: NativeFeature | null = null;
    const subscription = Linking.addEventListener('url', event => {
      const feature = nativeFeatureFromLink(event.url);
      if (!feature) return;
      if (!restored) { pendingFeature = feature; return; }
      cancelPair(); setPairDialog(false); choose(feature);
    });
    void Promise.all([SecureStore.getItemAsync(PREFS).catch(() => null), Linking.getInitialURL().catch(() => null)]).then(([raw, url]) => {
      if (stopped) return;
      const value = restoreNativePreferences(raw);
      setLanguage(value.language); setLight(value.light); setRotation(value.rotation);
      setNavigation(nativeLaunchNavigation(value.navigation, url, pendingFeature)); setNow(Date.now());
      restored = true; setPreferencesReady(true);
    });
    return () => { stopped = true; subscription.remove(); };
  }, [cancelPair, choose]);
  useEffect(() => {
    if (preferencesReady) void SecureStore.setItemAsync(PREFS, JSON.stringify({ language, light, rotation, ...navigation })).catch(() => {});
  }, [language, light, rotation, navigation, preferencesReady]);
  const closePair = useCallback(() => { interact(); cancelPair(); setPairDialog(false); }, [interact, cancelPair]);
  const back = useCallback(() => {
    interact();
    if (pairDialog) { closePair(); return true; }
    if (guide) { setGuide(false); return true; }
    const previous = backNativeNavigation(navigation);
    if (previous) { setNavigation(previous); setPage(0); return true; }
    return false;
  }, [interact, pairDialog, closePair, guide, navigation]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    if (Platform.OS === 'ios' && Platform.isTV) {
      if (pairDialog || guide || destination !== 'allStocks' || region) TVEventControl.enableTVMenuKey(); else TVEventControl.disableTVMenuKey();
    }
    return () => { subscription.remove(); if (Platform.OS === 'ios' && Platform.isTV) TVEventControl.disableTVMenuKey(); };
  }, [back, pairDialog, guide, destination, region]);
  useTVEventHandler(event => {
    interact();
    if (event.eventKeyAction === 0) return;
    if (event.eventType === 'menu') { back(); return; }
    if (pairDialog || guide) return;
    if (event.eventType === 'playPause' && canRotate) setRotation(value => !value);
    if (event.eventType === 'channelUp') stepChannel(1);
    if (event.eventType === 'channelDown') stepChannel(-1);
  });
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { setForeground(state === 'active'); interact(); });
    return () => sub.remove();
  }, [interact]);
  useEffect(() => {
    if (!foreground) return;
    const timer = setInterval(() => {
      if (pairDialog || destination === 'map') setNow(Date.now());
      if (!rotation || !canRotate || guide || pairDialog || Date.now() - activity.current < 40_000) return;
      setPage(value => value + 1); activity.current = Date.now();
    }, 1000);
    return () => clearInterval(timer);
  }, [foreground, rotation, canRotate, guide, pairDialog, destination]);
  const changePage = (value: number) => { interact(); setPage(value); };
  const refresh = () => { interact(); setRevision(value => value + 1); };
  const frame = { width: 1920, height: 1080, transform: [{ scale }] };
  if ((!fontsLoaded && !fontError) || !preferencesReady) return <View style={s.loading}><ActivityIndicator size="large" color="#D4AF6A"/></View>;
  return <Presentation.Provider value={{ language, light }}><View style={[s.root, { backgroundColor: colors.bg }]}>
    <View style={[s.screen, frame, { backgroundColor: colors.bg }]}>
      <View style={[s.header, row]}><Image source={appIcon} style={s.logo} alt="THE SFM" accessibilityLabel="THE SFM"/><View style={s.brand}><Label large>THE SFM TV</Label><Label muted>{`${destinationText}${destination === 'allStocks' && region ? ` · ${tvText(language, region)}` : ''}`}</Label></View>
        {NATIVE_FEATURES.map(feature => <TvButton key={feature} selected={destination === feature} style={s.featureButton} onPress={() => choose(feature)}>{nativeDestinationText(language, feature)}</TvButton>)}
        <TvButton onPress={() => { interact(); setLight(value => !value); }}>{r(language, light ? 'night' : 'day')}</TvButton>
        <TvButton onPress={() => { interact(); setLanguage(value => value === 'ar' ? 'en' : value === 'en' ? 'fr' : 'ar'); }}>{language === 'ar' ? 'English' : language === 'en' ? 'Français' : 'العربية'}</TvButton>
      </View>
      <TVFocusGuideView autoFocus style={[s.navigation, row]}>
        <TvButton initial onPress={() => { interact(); setGuidePage(nativeGuidePage(destination)); setGuide(true); }}>{featureText(language, 'menu')}</TvButton>
        <TvButton onPress={() => stepChannel(-1)}>CH−</TvButton><TvButton onPress={() => stepChannel(1)}>CH+</TvButton>
        <TvButton onPress={() => { interact(); setPairDialog(true); }}>{r(language, device.token ? 'linked' : 'pair')}</TvButton>
        <TvButton disabled={!canRotate} onPress={refresh}>{t(language, 'refresh')}</TvButton>
        <TvButton disabled={!canRotate} selected={rotation && canRotate} onPress={() => { interact(); setRotation(value => !value); }}>{r(language, rotation && canRotate ? 'pause' : 'play')}</TvButton>
      </TVFocusGuideView>
      <View style={s.content}>
        {foreground && (destination === 'brief' ? <NativeBriefPanel revision={revision} page={page} changePage={changePage}/>
          : destination === 'map' ? <NativeAtlasPanel suspended={guide || pairDialog || !foreground} autoRotate={rotation} now={now} selected={region} onSelect={chooseRegion}/>
          : destination === 'account' ? <NativeAccountPanel/>
          : destination === 'allStocks' ? <StocksPanel key={`${destination}:${region || 'world'}`} kuwait={false} region={region} page={page} changePage={changePage} revision={revision}/>
          : destination === 'sessions' ? <SessionsPanel page={page} changePage={changePage}/>
          : destination === 'investments' ? <PortfolioPanel token={device.token} page={page} changePage={changePage} revision={revision} revoked={device.forget}/>
          : destination === 'kuwait' && page % 2 === 0 ? <StocksPanel key={destination} kuwait page={Math.floor(page / 2)} changePage={value => changePage(value * 2 + 1)} revision={revision}/>
          : <NewsPanel channel={destination === 'kuwait' ? 'kuwait' : destination} page={page} changePage={changePage} revision={revision}/>)}
      </View>
      <Label muted>{`${isTvReceiverChannel(destination) ? `${TV_RECEIVER_CHANNELS.indexOf(destination) + 1} / ${TV_RECEIVER_CHANNELS.length} · ` : ''}${destinationText}${canRotate ? ` · ${rotation ? '40s' : 'Ⅱ'}` : ''}`}</Label>
    </View>
    <Modal visible={guide || pairDialog} transparent onRequestClose={back} animationType="fade">
      <View style={[s.root, s.backdrop]}><View style={[s.modalFrame, frame]}><TVFocusGuideView autoFocus trapFocusUp trapFocusDown trapFocusLeft trapFocusRight style={[s.dialog, { backgroundColor: colors.panel, borderColor: colors.border }]}>
        <Label large>{guide ? featureText(language, 'menu') : r(language, 'pair')}</Label>
        {guide ? <><View style={s.guide}>{NATIVE_GUIDE.slice(guidePage * NATIVE_GUIDE_PAGE_SIZE, (guidePage + 1) * NATIVE_GUIDE_PAGE_SIZE).map(value => <TvButton key={value} selected={destination === value} onPress={() => choose(value)}>{`${isTvReceiverChannel(value) ? `${String(TV_RECEIVER_CHANNELS.indexOf(value) + 1).padStart(2, '0')}  ` : ''}${nativeDestinationText(language, value)}`}</TvButton>)}</View>
          <Pages page={guidePage} pages={NATIVE_GUIDE_PAGES} change={value => { interact(); setGuidePage(value); }}/></>
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
  screen: { paddingHorizontal: 72, paddingVertical: 48, gap: 22 }, header: { alignItems: 'center', gap: 20 }, brand: { flex: 1, minWidth: 200 }, featureButton: { maxWidth: 280 }, logo: { width: 80, height: 80, resizeMode: 'contain' },
  navigation: { alignItems: 'center', gap: 18 }, content: { flex: 1, minHeight: 0 }, loading: { flex: 1, justifyContent: 'center', backgroundColor: '#06080C' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.85)' }, modalFrame: { alignItems: 'center', justifyContent: 'center' }, dialog: { width: 1320, borderWidth: 2, borderRadius: 24, padding: 44, gap: 22 }, guide: { gap: 12 } });
