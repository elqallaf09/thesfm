import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState, Platform, SafeAreaView, useColorScheme, View } from 'react-native';
import type { MobileLanguage, PhoneProduct } from '../../src/lib/mobile/resourceContract';
import { MobileWorkspace } from './src/MobileWorkspace';
import { MobileSessionClient } from './src/session';
import { sessionStorage } from './src/secureStorage';
import { Button, Busy, darkColors, ErrorNotice, Label, lightColors, UIContext, useUI } from './src/ui';

const extra = Constants.expoConfig?.extra ?? {};
const product = (['finance', 'investor', 'business'].includes(String(extra.sfmProduct)) ? extra.sfmProduct : 'finance') as PhoneProduct;
const apiBaseUrl = String(extra.apiBaseUrl ?? 'https://www.the-sfm.com').replace(/\/$/, '');
const supabaseUrl = String(extra.supabaseUrl ?? '').replace(/\/$/, '');
const client = new MobileSessionClient({ product, apiBaseUrl, supabaseUrl, publicKey: String(extra.supabaseAnonKey ?? ''), storage: sessionStorage });

export default function App() {
  const [, update] = useReducer(value => value + 1, 0);
  const [ready, setReady] = useState(false);
  const [language, setLanguage] = useState<MobileLanguage>('ar');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [locked, setLocked] = useState(false);
  const [background, setBackground] = useState(false);
  const [error, setError] = useState('');
  const deviceTheme = useColorScheme();
  const authBrowser = useRef(false);
  const pendingLink = useRef<string | null>(null);
  useEffect(() => client.subscribe(update), []);
  useEffect(() => {
    let mounted = true;
    void Promise.all([client.restore(), sessionStorage.getItem(`sfm-${product}-preferences`).then(raw => {
      if (!raw || !mounted) return;
      try {
        const saved = JSON.parse(raw);
        if (['ar', 'en', 'fr'].includes(saved.language)) setLanguage(saved.language);
        if (['system', 'light', 'dark'].includes(saved.theme)) setTheme(saved.theme);
      } catch { /* retain device defaults */ }
    })]).then(() => {
      if (mounted) { setLocked(client.signedIn && Platform.OS !== 'web'); setReady(true); }
    }).catch(() => { if (mounted) { setError('STORAGE_UNAVAILABLE'); setReady(true); } });
    return () => { mounted = false; };
  }, []);
  const signedIn = client.signedIn;
  const generation = client.generation;
  useEffect(() => {
    if (!signedIn) { setLocked(false); return; }
    let mounted = true;
    void client.request<{ profile: { preferred_lang?: MobileLanguage; preferred_theme?: 'light' | 'dark' | 'system' } | null }>('/api/mobile/account', {}, 15_000).then(data => {
      if (!mounted) return;
      if (data.profile?.preferred_lang && ['ar', 'en', 'fr'].includes(data.profile.preferred_lang)) setLanguage(data.profile.preferred_lang);
      if (data.profile?.preferred_theme && ['light', 'dark', 'system'].includes(data.profile.preferred_theme)) setTheme(data.profile.preferred_theme);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [signedIn, generation]);
  useEffect(() => {
    if (!ready) return;
    void sessionStorage.setItem(`sfm-${product}-preferences`, JSON.stringify({ language, theme })).catch(() => setError('STORAGE_UNAVAILABLE'));
  }, [language, theme, ready]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setBackground(state !== 'active');
      if (state !== 'active' && client.signedIn && !authBrowser.current && Platform.OS !== 'web') setLocked(true);
      if (state === 'active') client.clearCache();
    });
    return () => subscription.remove();
  }, []);
  const colors = theme === 'dark' || theme === 'system' && deviceTheme === 'dark' ? darkColors : lightColors;
  const context = useMemo(() => ({ language, colors }), [language, colors]);
  return <UIContext.Provider value={context}><SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}><StatusBar style={colors === darkColors ? 'light' : 'dark'} />
    {!ready ? <Busy /> : background && signedIn ? <View style={{ flex: 1, backgroundColor: colors.bg }} /> : locked && signedIn ? <Unlock onUnlock={() => setLocked(false)} /> : <MobileWorkspace key={generation} client={client} product={product} base={apiBaseUrl} supabaseUrl={supabaseUrl} signedIn={signedIn} languageChanged={setLanguage} themeChanged={setTheme} authBrowser={authBrowser} googleEnabled={extra.googleSignInEnabled === true} pendingLink={pendingLink} />}
    {error ? <ErrorNotice code={error} /> : null}
  </SafeAreaView></UIContext.Provider>;
}
function Unlock({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useUI(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function unlock() {
    setBusy(true); setError('');
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: t(['فتح THE SFM', 'Unlock THE SFM', 'Déverrouiller THE SFM']), disableDeviceFallback: false });
      if (result.success) onUnlock(); else setError('DEVICE_LOCKED');
    } catch { setError('DEVICE_LOCKED'); } finally { setBusy(false); }
  }
  return <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}><Label large>{t(['حسابك محمي', 'Your account is protected', 'Votre compte est protégé'])}</Label><Button label={t(['فتح بقفل الجهاز', 'Unlock with device security', 'Déverrouiller avec l’appareil'])} onPress={() => { void unlock(); }} disabled={busy} />{error ? <ErrorNotice code={error} /> : null}<Button label={t(['تسجيل الخروج', 'Sign out', 'Déconnexion'])} onPress={() => { void client.signOut(); }} /></View>;
}
