import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Linking, ScrollView, useWindowDimensions, View } from 'react-native';
import { resourceFor, type MobileLanguage, type PhoneProduct } from '../../../src/lib/mobile/resourceContract';
import { AccountScreen, CatalogScreen, HomeScreen, NotificationChannelsScreen, NotificationsScreen } from './WorkspaceScreens';
import { MarketsScreen, SymbolScreen } from './MarketsScreen';
import { RecordsScreen } from './RecordsScreen';
import { ToolsScreen } from './ToolsScreen';
import { ReportsScreen } from './ReportsScreen';
import { InvestorFeeds } from './InvestorFeeds';
import { TeamsScreen } from './TeamsScreen';
import { MobileDecisionsScreen } from './MobileDecisionsScreen';
import { InvestorAnalysisScreen } from './InvestorAnalysisScreen';
import { completeGoogleSignIn, startGoogleSignIn } from './oauth';
import { MobileRequestError, PendingMobileMfa, type MobileSessionClient } from './session';
import { screenForLink, type Screen } from './navigation';
import { Button, Busy, ErrorNotice, Input, Label, Panel, useUI } from './ui';

type Props = { client: MobileSessionClient; product: PhoneProduct; base: string; supabaseUrl: string; signedIn: boolean; languageChanged: (value: MobileLanguage) => void; themeChanged: (value: 'light' | 'dark' | 'system') => void; authBrowser: { current: boolean }; googleEnabled: boolean; pendingLink: { current: string | null }; mfaRequired: (pending: PendingMobileMfa) => void };
export function MobileWorkspace(props: Props) {
  const { client, product, base, signedIn, languageChanged, themeChanged, mfaRequired, pendingLink } = props;
  const { t, colors, rtl } = useUI(); const { width } = useWindowDimensions(); const wide = width >= 900;
  const [stack, setStack] = useState<Screen[]>(() => {
    const pending = pendingLink.current;
    if (signedIn && pending) { const result = screenForLink(pending, product); pendingLink.current = null; if ('screen' in result) return [result.screen]; }
    return [{ kind: 'home' }];
  }); const screen = stack[stack.length - 1];
  const [guest, setGuest] = useState(false); const [linkError, setLinkError] = useState('');
  const navigate = useCallback((next: Screen) => setStack(previous => [...previous.slice(-29), next]), []);
  const openLink = useCallback((input: string) => {
    if (input.startsWith(`the-sfm-${product}://auth/callback`)) {
      void completeGoogleSignIn(input, product, client).catch(error => {
        if (error instanceof PendingMobileMfa) mfaRequired(error);
        else setLinkError(error.code ?? 'OAUTH_FAILED');
      });
      return;
    }
    const result = screenForLink(input, product);
    if ('external' in result) { void Linking.openURL(result.external).catch(() => setLinkError('LINK_UNAVAILABLE')); return; }
    if (!client.signedIn) pendingLink.current = input;
    navigate(result.screen);
  }, [client, mfaRequired, navigate, pendingLink, product]);
  useEffect(() => {
    void Linking.getInitialURL().then(input => { if (input) openLink(input); });
    const subscription = Linking.addEventListener('url', event => openLink(event.url));
    return () => subscription.remove();
  }, [openLink]);
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { if (stack.length < 2) return false; setStack(previous => previous.slice(0, -1)); return true; });
    return () => handler.remove();
  }, [stack.length]);
  if (!signedIn && !guest) return <SignIn {...props} browse={product === 'investor' ? () => { setGuest(true); setStack([{ kind: 'markets' }]); } : undefined} />;
  const resource = screen.resource ? resourceFor(product, screen.resource) : undefined;
  const tabs = [
    { kind: 'home' as const, label: t(['الرئيسية', 'Home', 'Accueil']) },
    { kind: 'catalog' as const, label: t(product === 'finance' ? ['أموالي', 'My finances', 'Mes finances'] : product === 'investor' ? ['استثماراتي', 'My investments', 'Mes investissements'] : ['إدارة الأعمال', 'Operations', 'Gestion']) },
    ...(product === 'investor' ? [{ kind: 'markets' as const, label: t(['الأسواق', 'Markets', 'Marchés']) }] : []),
    { kind: 'account' as const, label: t(['حسابي', 'Account', 'Compte']) },
  ];
  const nav = <View style={{ flexDirection: wide ? 'column' : rtl ? 'row-reverse' : 'row', gap: 7, padding: 10, borderColor: colors.border, borderTopWidth: wide ? 0 : 1, width: wide ? 210 : '100%' }}>{tabs.map(tab => <View key={tab.kind} style={{ flex: wide ? undefined : 1 }}><Button label={tab.label} selected={screen.kind === tab.kind} onPress={() => { if (!signedIn && tab.kind !== 'markets') { setGuest(false); return; } setStack([{ kind: tab.kind }]); }} /></View>)}</View>;
  let content;
  if (!signedIn && !['markets', 'symbol'].includes(screen.kind)) content = <SignIn {...props} />;
  else if (screen.kind === 'home') content = <HomeScreen client={client} product={product} navigate={navigate} wide={wide} />;
  else if (screen.kind === 'catalog') content = <CatalogScreen product={product} navigate={navigate} />;
  else if (screen.kind === 'records' && resource) content = <RecordsScreen key={resource.id} client={client} product={product} resource={resource} />;
  else if (screen.kind === 'account') content = <AccountScreen client={client} languageChanged={languageChanged} themeChanged={themeChanged} signOut={() => { void client.signOut(); }} />;
  else if (screen.kind === 'markets') content = <MarketsScreen base={base} client={client} navigate={navigate} />;
  else if (screen.kind === 'analysis' && product === 'investor') content = <InvestorAnalysisScreen client={client} />;
  else if (screen.kind === 'symbol' && screen.symbol) content = <SymbolScreen base={base} symbol={screen.symbol} />;
  else if (screen.kind === 'notifications') content = <NotificationsScreen client={client} openLink={openLink} />;
  else if (screen.kind === 'channels') content = <NotificationChannelsScreen client={client} openExternal={openLink} />;
  else if (screen.kind === 'tools') content = <ToolsScreen initialPath={screen.path} />;
  else if (screen.kind === 'reports' && (product === 'finance' || product === 'business')) content = <ReportsScreen client={client} product={product} navigate={navigate} />;
  else if (screen.kind === 'teams' && product === 'business') content = <TeamsScreen client={client} />;
  else if (screen.kind === 'decisions' && product === 'business') content = <MobileDecisionsScreen client={client} />;
  else if (screen.kind === 'news' || screen.kind === 'calendar' || screen.kind === 'screening') content = <InvestorFeeds key={screen.kind} base={base} kind={screen.kind} />;
  else content = <Panel><Label>{t(['هذه الوظيفة لم تكتمل في نسخة التطبيق الحالية.', 'This feature is not complete in this app version.', 'Cette fonction n’est pas encore complète dans cette version.'])}</Label><Button label={t(['فتح الأقسام', 'Open sections', 'Ouvrir les rubriques'])} onPress={() => navigate({ kind: 'catalog' })} /></Panel>;
  return <View style={{ flex: 1 }}><View style={{ minHeight: 66, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border, gap: 8, flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', flexWrap: 'wrap' }}><View style={{ flex: 1 }}><Label large>{`THE SFM ${product === 'finance' ? 'Finance' : product === 'investor' ? 'Investor' : 'Business'}`}</Label></View>{stack.length > 1 ? <Button label={t(['رجوع', 'Back', 'Retour'])} onPress={() => setStack(previous => previous.slice(0, -1))} /> : null}{signedIn && screen.kind === 'notifications' ? <Button label={t(['القنوات', 'Channels', 'Canaux'])} onPress={() => navigate({ kind: 'channels' })} /> : null}{signedIn ? <Button label={t(['الإشعارات', 'Notifications', 'Notifications'])} onPress={() => navigate({ kind: 'notifications' })} /> : null}</View>
    <View style={{ flex: 1, flexDirection: wide ? rtl ? 'row-reverse' : 'row' : 'column' }}>{wide ? nav : null}<View style={{ flex: 1, width: '100%', maxWidth: 1180, alignSelf: 'center', padding: wide ? 22 : 14, gap: 12 }}>{linkError ? <ErrorNotice code={linkError} /> : null}{content}</View>{!wide ? nav : null}</View>
  </View>;
}
function SignIn(props: Props & { browse?: () => void }) {
  const { client, product, supabaseUrl, authBrowser, googleEnabled, browse } = props;
  const { t } = useUI(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function signIn(google = false) {
    setBusy(true); setError('');
    try { if (google) { authBrowser.current = true; await startGoogleSignIn(product, supabaseUrl, client); } else await client.signIn(email, password); setPassword(''); }
    catch (error) { if (error instanceof PendingMobileMfa) props.mfaRequired(error); else setError(error instanceof MobileRequestError ? error.code : 'AUTH_UNAVAILABLE'); }
    finally { setBusy(false); authBrowser.current = false; }
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 18, maxWidth: 560, width: '100%', alignSelf: 'center' }}><Label large>{`THE SFM ${product === 'finance' ? 'Finance' : product === 'investor' ? 'Investor' : 'Business'}`}</Label><Label>{t(['سجّل الدخول بنفس حساب الموقع للوصول إلى بياناتك.', 'Sign in with your website account to access your data.', 'Connectez-vous avec votre compte du site pour accéder à vos données.'])}</Label><Input label={t(['البريد الإلكتروني', 'Email', 'E-mail'])} email value={email} onChange={setEmail} /><Input label={t(['كلمة المرور', 'Password', 'Mot de passe'])} secure value={password} onChange={setPassword} />{error ? <ErrorNotice code={error} /> : null}<Button label={t(['تسجيل الدخول', 'Sign in', 'Connexion'])} disabled={busy || !email.trim() || !password} onPress={() => { void signIn(); }} />{googleEnabled ? <Button label={t(['الدخول بواسطة Google', 'Continue with Google', 'Continuer avec Google'])} disabled={busy} onPress={() => { void signIn(true); }} /> : null}{browse ? <Button label={t(['تصفح الأسواق دون حساب', 'Browse markets without an account', 'Explorer les marchés sans compte'])} onPress={browse} /> : null}{busy ? <Busy /> : null}</ScrollView>;
}
