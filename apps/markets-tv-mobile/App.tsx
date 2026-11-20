import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Image, Linking, Pressable, StatusBar, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { classifyLink, HOME_URL, PRESENTATION_BRIDGE, readPresentation, type Presentation } from './src/navigation';
import { messages, palettes } from './src/theme';
import brandImage from './assets/brand.png';

function MarketsPhone() {
  const systemTheme = useColorScheme();
  const [presentation, setPresentation] = useState<Presentation>({ theme: systemTheme === 'light' ? 'light' : 'dark', language: 'ar' });
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [instance, setInstance] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const web = useRef<WebView>(null);
  const failed = useRef(false);
  const currentPage = useRef(HOME_URL);
  const palette = palettes[presentation.theme];
  const t = messages[presentation.language];
  const rtl = presentation.language === 'ar';

  const openExternal = useCallback((url: string) => {
    if (!['internal', 'external'].includes(classifyLink(url))) return;
    void Linking.openURL(url).catch(() => Alert.alert(t.linkError));
  }, [t.linkError]);

  const retry = () => { failed.current = false; setPhase('loading'); web.current?.reload(); };
  const goHome = () => {
    failed.current = false; currentPage.current = HOME_URL;
    setInstance(value => value + 1); setCanGoBack(false); setPhase('loading');
  };
  const showError = () => { failed.current = true; setPhase('error'); };

  useEffect(() => {
    if (phase !== 'loading') return;
    const timeout = setTimeout(() => { failed.current = true; setPhase('error'); }, 30_000);
    return () => clearTimeout(timeout);
  }, [phase, instance]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      web.current?.goBack(); return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.screen, { backgroundColor: palette.background }]}>
    <StatusBar barStyle={presentation.theme === 'dark' ? 'light-content' : 'dark-content'}/>
    <View style={[styles.toolbar, { borderBottomColor: palette.line, flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <Image source={brandImage} style={styles.mark} alt="SFM TV" accessibilityIgnoresInvertColors accessibilityLabel="SFM TV"/>
      <Text style={[styles.title, { color: palette.text }]}>SFM TV</Text>
      {[
        { label: t.back, glyph: rtl ? '›' : '‹', disabled: !canGoBack, action: () => web.current?.goBack() },
        { label: t.home, glyph: '⌂', disabled: false, action: goHome },
        { label: t.refresh, glyph: '↻', disabled: phase === 'loading', action: retry },
      ].map(button => <Pressable key={button.label} accessibilityRole="button" accessibilityLabel={button.label}
        accessibilityState={{ disabled: button.disabled }} disabled={button.disabled} onPress={button.action}
        style={({ pressed }) => [styles.control, { backgroundColor: pressed ? palette.panel : palette.background, opacity: button.disabled ? 0.5 : 1 }]}>
        <Text maxFontSizeMultiplier={1.5} style={[styles.controlGlyph, { color: palette.text }]}>{button.glyph}</Text>
      </Pressable>)}
    </View>
    <View style={styles.content}>
      <WebView key={instance} ref={web} source={{ uri: HOME_URL }} style={{ backgroundColor: palette.background }}
        // All navigation passes through classifyLink, including non-HTTPS schemes.
        originWhitelist={['*']} javaScriptEnabled domStorageEnabled sharedCookiesEnabled
        allowFileAccess={false} allowUniversalAccessFromFileURLs={false} mixedContentMode="never"
        allowsInlineMediaPlayback mediaPlaybackRequiresUserAction allowsBackForwardNavigationGestures
        automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never" webviewDebuggingEnabled={__DEV__}
        injectedJavaScript={PRESENTATION_BRIDGE}
        onShouldStartLoadWithRequest={request => {
          const action = classifyLink(request.url);
          if (action === 'external' && request.isTopFrame !== false) openExternal(request.url);
          return action === 'internal' || action === 'blank';
        }}
        onOpenWindow={event => openExternal(event.nativeEvent.targetUrl)}
        onNavigationStateChange={state => {
          if (classifyLink(state.url) === 'internal') { currentPage.current = state.url; setCanGoBack(state.canGoBack); }
        }}
        onLoadStart={() => { failed.current = false; setPhase('loading'); }}
        onLoad={() => { if (!failed.current) setPhase('ready'); }}
        onError={showError}
        onHttpError={event => { if (event.nativeEvent.url === currentPage.current && event.nativeEvent.statusCode >= 400) showError(); }}
        onContentProcessDidTerminate={showError} onRenderProcessGone={showError}
        onMessage={event => {
          const value = readPresentation(event.nativeEvent.data, event.nativeEvent.url);
          if (value) setPresentation(value);
        }}/>
      {phase !== 'ready' && <View style={[styles.cover, { backgroundColor: palette.background }]} accessibilityLiveRegion="polite">
        <Image source={brandImage} style={styles.heroMark} alt="" accessible={false} accessibilityIgnoresInvertColors/>
        {phase === 'loading' ? <><ActivityIndicator size="large" color={palette.accent}/><Text style={[styles.heading, { color: palette.text }]}>{t.loading}</Text></>
          : <><Text style={[styles.heading, { color: palette.text }]}>{t.error}</Text>
            <Text style={[styles.detail, { color: palette.muted, writingDirection: rtl ? 'rtl' : 'ltr' }]}>{t.detail}</Text>
            <Pressable accessibilityRole="button" onPress={retry} style={[styles.retry, { backgroundColor: palette.panel, borderColor: palette.accent }]}>
              <Text style={[styles.controlText, { color: palette.accent }]}>{t.retry}</Text>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => openExternal(HOME_URL)} style={styles.control}>
              <Text style={{ color: palette.text }}>{t.browser}</Text>
            </Pressable></>}
      </View>}
    </View>
  </SafeAreaView>;
}

export default function App() { return <SafeAreaProvider><MarketsPhone/></SafeAreaProvider>; }

const styles = StyleSheet.create({
  screen: { flex: 1 }, toolbar: { minHeight: 52, alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  mark: { width: 30, height: 30, marginHorizontal: 4 }, title: { flex: 1, fontSize: 15, fontWeight: '700' },
  control: { minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 8 },
  controlText: { fontSize: 14, fontWeight: '600' }, controlGlyph: { fontSize: 25, fontWeight: '500' }, content: { flex: 1 },
  cover: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18 },
  heroMark: { width: 96, height: 96 }, heading: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  detail: { fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 360 },
  retry: { minHeight: 48, minWidth: 160, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderWidth: 1, borderRadius: 12 },
});
