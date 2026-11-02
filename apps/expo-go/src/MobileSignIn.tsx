import { useFonts } from 'expo-font';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, ImageBackground, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View, type TextStyle } from 'react-native';
import type { MobileLanguage, PhoneProduct } from '../../../src/lib/mobile/resourceContract';
import { authCopy, authPalettes, authWebsiteUrl } from './authPresentation';
import { startGoogleSignIn } from './oauth';
import { sessionStorage } from './secureStorage';
import { MobileRequestError, PendingMobileMfa, type MobileSessionClient } from './session';
import { darkColors, useUI } from './ui';

type Props = {
  client: MobileSessionClient; product: PhoneProduct; base: string; supabaseUrl: string;
  languageChanged: (language: MobileLanguage) => void; themeChanged: (theme: 'light' | 'dark' | 'system') => void;
  authBrowser: { current: boolean }; googleEnabled: boolean; browse?: () => void;
  mfaRequired: (pending: PendingMobileMfa) => void;
};
/* eslint-disable @typescript-eslint/no-require-imports -- Metro requires static asset paths for native bundling. */
const fonts = {
  // Bundled with the app: no font request or website connection on launch.
  'SFM-Arabic': require('../assets/fonts/IBMPlexSansArabic-Regular.ttf'),
  'SFM-Arabic-Bold': require('../assets/fonts/IBMPlexSansArabic-Bold.ttf'),
};
const logo = require('../assets/sfm-logo.png');
const gradients = { light: require('../assets/auth-gradient-light.png'), dark: require('../assets/auth-gradient-dark.png') };
/* eslint-enable @typescript-eslint/no-require-imports */
const languageOptions = [{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'EN' }, { value: 'fr', label: 'FR' }] as const;

export function MobileSignIn(props: Props) {
  const { client, product, base, supabaseUrl, authBrowser, googleEnabled, browse, languageChanged, themeChanged } = props;
  const { language, colors, rtl } = useUI();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const dark = colors === darkColors;
  const palette = authPalettes[dark ? 'dark' : 'light'];
  const copy = authCopy[language];
  const [loaded] = useFonts(fonts);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const flight = useRef(false);
  const editedEmail = useRef(false);
  const passwordInput = useRef<TextInput>(null);
  const rememberedKey = `sfm-${product}-login-email`;
  useEffect(() => {
    let active = true;
    void sessionStorage.getItem(rememberedKey).then(saved => {
      if (active && saved && !editedEmail.current) setEmail(saved);
    }).catch(() => {});
    return () => { active = false; };
  }, [rememberedKey]);
  const text: TextStyle = { color: palette.text, fontFamily: loaded ? 'SFM-Arabic' : undefined, fontSize: 14, lineHeight: 23, textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' };
  const bold: TextStyle = { fontFamily: loaded ? 'SFM-Arabic-Bold' : undefined, fontWeight: loaded ? undefined : '700' };
  const row = { flexDirection: rtl ? 'row-reverse' as const : 'row' as const };

  async function signIn(google = false) {
    if (flight.current || (!google && (!email.trim() || !password))) return;
    flight.current = true; setBusy(true); setError('');
    try {
      if (google) { authBrowser.current = true; await startGoogleSignIn(product, supabaseUrl, client); }
      else await client.signIn(email, password);
      // Like the website, Remember me saves only the identifier, never a password.
      if (!google) await (remember ? sessionStorage.setItem(rememberedKey, email.trim()) : sessionStorage.removeItem(rememberedKey)).catch(() => {});
      setPassword(''); setVisible(false);
    } catch (reason) {
      if (reason instanceof PendingMobileMfa) { setPassword(''); setVisible(false); props.mfaRequired(reason); }
      else setError(reason instanceof MobileRequestError ? reason.code : 'AUTH_UNAVAILABLE');
    } finally { flight.current = false; setBusy(false); authBrowser.current = false; }
  }
  function openWebsite(action: Parameters<typeof authWebsiteUrl>[2]) {
    void Linking.openURL(authWebsiteUrl(base, product, action, language)).catch(() => setError('LINK_UNAVAILABLE'));
  }
  const productName = product === 'finance' ? 'Finance' : product === 'investor' ? 'Investor' : 'Business';
  const button = (label: string, onPress: () => void, primary = false, disabled = busy, icon?: ReactNode) => <Pressable
    accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy: primary && busy }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, row, { borderColor: primary ? palette.primary : palette.inputBorder, backgroundColor: primary ? palette.primary : palette.surface, opacity: disabled ? .55 : pressed ? .75 : 1 }]}>
    {icon}<Text style={[text, bold, styles.buttonText, { color: primary ? palette.onPrimary : palette.text }]}>{label}</Text>
  </Pressable>;
  const link = (label: string, action: Parameters<typeof authWebsiteUrl>[2]) => <Pressable accessibilityRole="link" accessibilityHint={copy.external} disabled={busy} onPress={() => openWebsite(action)} style={styles.link}><Text style={[text, bold, { color: palette.primary, textAlign: 'center' }]}>{label}</Text></Pressable>;
  const form = <View testID={`auth-${product}`} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }, wide && styles.wideCard]}>
    <View style={[styles.controls, row]}>
      <View accessibilityLabel={copy.language} style={[styles.controlGroup, row, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        {languageOptions.map(option => <Pressable key={option.value} accessibilityRole="button" accessibilityLabel={option.value === 'en' ? 'English' : option.value === 'fr' ? 'Français' : option.label} accessibilityState={{ selected: language === option.value }} onPress={() => languageChanged(option.value)} style={[styles.control, { backgroundColor: language === option.value ? palette.soft : 'transparent' }]}><Text style={[text, language === option.value && bold, { color: language === option.value ? palette.primary : palette.muted }]}>{option.label}</Text></Pressable>)}
      </View>
      <View style={[styles.controlGroup, row, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        {(['light', 'dark'] as const).map(mode => <Pressable key={mode} accessibilityRole="button" accessibilityLabel={copy[mode]} accessibilityState={{ selected: dark === (mode === 'dark') }} onPress={() => themeChanged(mode)} style={[styles.control, { backgroundColor: dark === (mode === 'dark') ? palette.soft : 'transparent' }]}><Text style={{ fontSize: 21, color: dark === (mode === 'dark') ? palette.primary : palette.muted }}>{mode === 'light' ? '☀' : '☾'}</Text></Pressable>)}
      </View>
    </View>
    <View style={styles.brand}>
      <Image source={logo} alt="THE SFM" accessibilityLabel="THE SFM" style={styles.logo} />
      <Text style={[text, bold, styles.product, { color: palette.primary }]}>{`THE SFM ${productName}`}</Text>
      <Text accessibilityRole="header" style={[text, bold, styles.title]}>{copy.title}</Text>
      <Text style={[text, styles.center, { color: palette.muted }]}>{copy.body}</Text>
    </View>
    <View style={styles.field}>
      <Text style={[text, bold]}>{copy.email}</Text>
      <TextInput testID="auth-email" accessibilityLabel={copy.email} placeholder="name@example.com" placeholderTextColor={palette.muted}
        value={email} onChangeText={value => { editedEmail.current = true; setEmail(value); setError(''); }} editable={!busy}
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" autoComplete="username"
        returnKeyType="next" onSubmitEditing={() => passwordInput.current?.focus()} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
        style={[styles.input, text, { textAlign: 'left', writingDirection: 'ltr', borderColor: focused === 'email' ? palette.primary : palette.inputBorder, backgroundColor: palette.surface }]} />
    </View>
    <View style={styles.field}>
      <Text style={[text, bold]}>{copy.password}</Text>
      <View style={[styles.password, row, { borderColor: focused === 'password' ? palette.primary : palette.inputBorder }]}>
        <TextInput ref={passwordInput} testID="auth-password" accessibilityLabel={copy.password} placeholder={copy.passwordHint} placeholderTextColor={palette.muted}
          value={password} onChangeText={value => { setPassword(value); setError(''); }} editable={!busy} secureTextEntry={!visible}
          autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" returnKeyType="go"
          onSubmitEditing={() => { void signIn(); }} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
          style={[styles.passwordInput, text]} />
        <Pressable accessibilityRole="button" accessibilityLabel={visible ? copy.hide : copy.show} accessibilityState={{ expanded: visible }} onPress={() => setVisible(value => !value)} style={styles.reveal}>
          <Text style={[text, { color: palette.primary, fontSize: 13 }]}>{visible ? (language === 'ar' ? 'إخفاء' : language === 'fr' ? 'Masquer' : 'Hide') : (language === 'ar' ? 'إظهار' : language === 'fr' ? 'Afficher' : 'Show')}</Text>
        </Pressable>
      </View>
    </View>
    <View style={[styles.options, row]}>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={copy.remember} accessibilityState={{ checked: remember }} disabled={busy} onPress={() => {
        setRemember(value => !value);
        if (remember) void sessionStorage.removeItem(rememberedKey).catch(() => {});
      }} style={[styles.remember, row]}>
        <View style={[styles.checkbox, { borderColor: remember ? palette.primary : palette.inputBorder, backgroundColor: remember ? palette.primary : palette.surface }]}><Text style={{ color: palette.onPrimary, fontSize: 14 }}>{remember ? '✓' : ''}</Text></View>
        <Text style={[text, { color: palette.muted }]}>{copy.remember}</Text>
      </Pressable>
      {link(copy.forgot, 'forgot')}
    </View>
    {error ? <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.error, { borderColor: palette.danger }]}><Text style={[text, { color: palette.danger }]}>{error === 'INVALID_CREDENTIALS' ? copy.invalid : copy.unavailable}</Text></View> : null}
    {button(busy ? copy.busy : copy.submit, () => { void signIn(); }, true, busy || !email.trim() || !password, busy ? <ActivityIndicator color={palette.onPrimary} /> : undefined)}
    {googleEnabled ? <><View style={styles.divider}><View style={[styles.rule, { backgroundColor: palette.border }]} /><Text style={[text, { color: palette.muted, fontSize: 13 }]}>{copy.divider}</Text><View style={[styles.rule, { backgroundColor: palette.border }]} /></View>{button(copy.google, () => { void signIn(true); }, false, busy, <Text style={{ color: palette.text, fontSize: 22, fontWeight: '700' }}>G</Text>)}</> : null}
    {button(browse ? copy.guest : copy.website, browse ?? (() => openWebsite('explore')))}
    <View style={[styles.create, row]}><Text style={[text, { color: palette.muted }]}>{copy.createLead}</Text>{link(copy.create, 'register')}</View>
    <View style={[styles.footer, { borderColor: palette.border }]}><Text style={[text, styles.center, { color: palette.muted, fontSize: 13 }]}>{copy.oneAccount}</Text><View style={[styles.footerLinks, row]}>{link(copy.privacy, 'privacy')}{link(copy.terms, 'terms')}</View></View>
  </View>;
  const showcase = <ImageBackground source={gradients[dark ? 'dark' : 'light']} imageStyle={styles.showcaseImage} style={[styles.showcase, wide && styles.wideShowcase]}>
    <View style={[styles.showcaseBrand, row]}><Image source={logo} alt="" accessible={false} style={styles.miniLogo} /><Text style={[text, bold, { color: '#FFFFFF', fontSize: 22 }]}>THE SFM</Text></View>
    <Text accessibilityRole="header" style={[text, bold, { color: '#FFFFFF', fontSize: wide ? 40 : 26, lineHeight: wide ? 58 : 40 }]}>{copy.headline}</Text>
    <Text style={[text, { color: '#E5E7FF', fontSize: 16, lineHeight: 28 }]}>{copy.description}</Text>
    <View style={[styles.benefits, row]}>{copy.benefits.map(benefit => <View key={benefit} style={[styles.benefit, row]}><Text style={{ color: '#5EEAD4' }}>✓</Text><Text style={[text, { color: '#FFFFFF', fontSize: 13, flexShrink: 1 }]}>{benefit}</Text></View>)}</View>
    <Pressable accessibilityRole="link" accessibilityHint={copy.external} onPress={() => openWebsite('explore')} style={[styles.showcaseLink, row]}><Text style={[text, bold, { color: '#FFFFFF' }]}>{copy.website}</Text><Text style={{ color: '#FFFFFF' }}>↗</Text></Pressable>
  </ImageBackground>;
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.scroll, { padding: width < 360 ? 10 : wide ? 28 : 16 }]}>
      <View style={[styles.stage, wide && { flexDirection: rtl ? 'row-reverse' : 'row', maxWidth: 1260, alignItems: 'stretch' }]}>{form}{showcase}</View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center' }, stage: { width: '100%', maxWidth: 620, alignSelf: 'center', gap: 16 },
  card: { borderWidth: 1, borderRadius: 24, padding: 20, gap: 14, boxShadow: '0 12px 32px rgba(20, 24, 58, 0.08)' }, wideCard: { width: 470, padding: 30 },
  controls: { justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, controlGroup: { borderRadius: 14, borderWidth: 1, padding: 3, gap: 2 },
  control: { minWidth: 38, minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  brand: { alignItems: 'center', gap: 5, paddingVertical: 8 }, logo: { width: 72, height: 72, borderRadius: 18 }, product: { fontSize: 13, textAlign: 'center', marginTop: 7 },
  title: { fontSize: 27, lineHeight: 42, textAlign: 'center' }, center: { textAlign: 'center' }, field: { gap: 7 },
  input: { borderWidth: 1, borderRadius: 13, minHeight: 54, paddingHorizontal: 15, paddingVertical: 11, fontSize: 16 },
  password: { borderWidth: 1, borderRadius: 13, alignItems: 'center' }, passwordInput: { flex: 1, minWidth: 0, minHeight: 54, paddingHorizontal: 15, paddingVertical: 11, fontSize: 16 },
  reveal: { minHeight: 48, minWidth: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  options: { justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }, remember: { minHeight: 44, gap: 8, alignItems: 'center' },
  checkbox: { borderWidth: 1, width: 21, height: 21, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 },
  button: { minHeight: 54, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }, buttonText: { textAlign: 'center', flexShrink: 1, fontSize: 15 },
  divider: { flexDirection: 'row', gap: 10, alignItems: 'center' }, rule: { height: 1, flex: 1 }, create: { flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 },
  footer: { borderTopWidth: 1, paddingTop: 12 }, footerLinks: { justifyContent: 'center', gap: 20 }, error: { borderWidth: 1, borderRadius: 13, padding: 12 },
  showcase: { padding: 24, gap: 12, borderRadius: 24, overflow: 'hidden', backgroundColor: '#1B1A4A' }, showcaseImage: { borderRadius: 24, width: '100%', height: '100%' }, wideShowcase: { flex: 1, justifyContent: 'center', padding: 38, gap: 24 },
  showcaseBrand: { alignItems: 'center', gap: 12 }, miniLogo: { width: 44, height: 44, borderRadius: 12 },
  benefits: { flexWrap: 'wrap', gap: 10, marginTop: 8 }, benefit: { alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, flexGrow: 1, flexBasis: '44%' },
  showcaseLink: { minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 13, marginTop: 8 },
});
