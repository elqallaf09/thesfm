import { createContext, useContext, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { localized, type LocalizedLabel, type MobileLanguage } from '../../../src/lib/mobile/resourceContract';
export const darkColors = { bg: '#0B0D12', surface: '#12151C', raised: '#181C24', border: '#343B48', text: '#EAF1FB', muted: '#A8B4CA', accent: '#5EEAD4', danger: '#FDA4AF' };
export const lightColors = { bg: '#F4F6FA', surface: '#FFFFFF', raised: '#E9EFF5', border: '#C6D1DE', text: '#101828', muted: '#475569', accent: '#087F75', danger: '#B42338' };
export const UIContext = createContext({ language: 'ar' as MobileLanguage, colors: darkColors });
export function useUI() {
  const ui = useContext(UIContext);
  return { ...ui, rtl: ui.language === 'ar', t: (label: LocalizedLabel) => localized(label, ui.language) };
}
export function Label({ children, muted = false, large = false }: { children: ReactNode; muted?: boolean; large?: boolean }) {
  const { colors, rtl } = useUI();
  return <Text style={{ color: muted ? colors.muted : colors.text, textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr', fontSize: large ? 23 : 15, fontWeight: large ? '800' : '500', lineHeight: large ? 33 : 23 }}>{children}</Text>;
}
export function Panel({ children }: { children: ReactNode }) {
  const { colors } = useUI();
  return <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>;
}
export function Button({ label, onPress, disabled = false, danger = false, selected = false }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean; selected?: boolean }) {
  const { colors } = useUI();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { borderColor: danger ? colors.danger : selected ? colors.accent : colors.border, backgroundColor: selected ? colors.raised : colors.surface, opacity: disabled ? .5 : pressed ? .7 : 1 }]}><Text style={{ color: danger ? colors.danger : selected ? colors.accent : colors.text, textAlign: 'center', fontWeight: '700', fontSize: 14 }}>{label}</Text></Pressable>;
}
export function Input({ label, value, onChange, secure = false, numeric = false, email = false }: { label: string; value: string; onChange: (value: string) => void; secure?: boolean; numeric?: boolean; email?: boolean }) {
  const { colors, rtl } = useUI();
  return <View style={{ gap: 5 }}><Label>{label}</Label><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} secureTextEntry={secure} autoCapitalize={email || secure ? 'none' : 'sentences'} autoCorrect={!email && !secure} keyboardType={numeric ? 'decimal-pad' : email ? 'email-address' : 'default'} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg, textAlign: email || numeric ? 'left' : rtl ? 'right' : 'left' }]} /></View>;
}
export function Busy() { const { colors, t } = useUI(); return <ActivityIndicator accessibilityLabel={t(['جارٍ التحميل', 'Loading', 'Chargement'])} color={colors.accent} style={{ padding: 24 }} />; }
export function ErrorNotice({ code, retry }: { code: string; retry?: () => void }) {
  const { t, colors } = useUI();
  const message = code === 'MFA_REQUIRED' ? t(['حسابك يتطلب التحقق بخطوتين. يلزم إكمال التحقق قبل عرض البيانات.', 'Your account requires two-step verification before data can be displayed.', 'Votre compte exige une vérification en deux étapes avant d’afficher les données.'])
    : code === 'FORBIDDEN' ? t(['ليست لديك صلاحية لهذه العملية.', 'You do not have permission for this action.', 'Vous n’avez pas les droits pour cette action.'])
      : code === 'INVALID_CREDENTIALS' ? t(['البريد أو كلمة المرور غير صحيحة.', 'Incorrect email or password.', 'E-mail ou mot de passe incorrect.'])
        : code === 'AUTH_NOT_CONFIGURED' ? t(['تسجيل الدخول غير متاح في إعداد هذا الإصدار.', 'Sign-in is unavailable in this build configuration.', 'La connexion est indisponible dans cette configuration.'])
          : code === 'INVALID_RECORD' ? t(['تحقق من الحقول المطلوبة وصيغة القيم.', 'Check required fields and value formats.', 'Vérifiez les champs obligatoires et les formats.'])
            : t(['تعذر إكمال الطلب. تحقق من الاتصال وأعد المحاولة.', 'Unable to complete the request. Check your connection and retry.', 'Impossible de terminer. Vérifiez votre connexion et réessayez.']);
  return <View accessibilityRole="alert" style={{ borderColor: colors.danger, borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 }}><Label>{message}</Label>{retry ? <Button label={t(['إعادة المحاولة', 'Retry', 'Réessayer'])} onPress={retry} /> : null}</View>;
}
export function Empty() { const { t } = useUI(); return <Panel><Label>{t(['لا توجد سجلات حتى الآن.', 'No records yet.', 'Aucun enregistrement.'])}</Label></Panel>; }
export function formatValue(value: unknown) { return typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 3 }) : value == null ? '—' : String(value); }
const styles = StyleSheet.create({ panel: { borderWidth: 1, borderRadius: 18, padding: 17, gap: 12 }, button: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center' }, input: { minHeight: 48, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 } });
