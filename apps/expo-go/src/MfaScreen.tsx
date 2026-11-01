import { useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { MobileRequestError, PendingMobileMfa, type MobileSessionClient } from './session';
import { Button, Busy, ErrorNotice, Input, Label, Panel, useUI } from './ui';

export function MfaScreen({ client, pending, completed, cancelled }: { client: MobileSessionClient; pending: PendingMobileMfa; completed: () => void; cancelled: () => void }) {
  const { t } = useUI(); const [code, setCode] = useState(''); const [sent, setSent] = useState(Boolean(pending.challenge)); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const active = useRef(false);
  const run = async (verify: boolean) => {
    if (active.current) return;
    active.current = true; setBusy(true); setError('');
    try {
      if (verify) { await client.verifyMfa(pending, code); setCode(''); completed(); }
      else { await client.sendMfaEmail(pending); setSent(true); }
    } catch (error) { setError(error instanceof MobileRequestError ? error.code : 'AUTH_UNAVAILABLE'); }
    finally { active.current = false; setBusy(false); }
  };
  const cancel = () => { setBusy(true); void client.cancelMfa(pending).catch(() => {}).finally(() => { setBusy(false); cancelled(); }); };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' }}><Label large>{t(['تحقق إضافي', 'Additional verification', 'Vérification supplémentaire'])}</Label><Panel><Label>{pending.type === 'totp' ? t(['أدخل الرمز من تطبيق المصادقة لإكمال الدخول إلى حسابك.', 'Enter the code from your authenticator app to finish signing in.', 'Saisissez le code de votre application d’authentification pour terminer la connexion.']) : sent ? t(['أدخل الرمز المُرسل إلى بريد حسابك.', 'Enter the code sent to your account email.', 'Saisissez le code envoyé à l’adresse e-mail de votre compte.']) : t(['أرسل رمزًا إلى بريد حسابك لإكمال الدخول.', 'Send a code to your account email to finish signing in.', 'Envoyez un code à votre adresse e-mail pour terminer la connexion.'])}</Label>
      {pending.type === 'email' ? <Button label={t([sent ? 'إعادة إرسال الرمز' : 'إرسال الرمز', sent ? 'Send another code' : 'Send code', sent ? 'Renvoyer le code' : 'Envoyer le code'])} onPress={() => { void run(false); }} disabled={busy} /> : null}
      <Input label={t(['رمز التحقق', 'Verification code', 'Code de vérification'])} value={code} onChange={value => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))} numeric />
      {error ? <ErrorNotice code={error} /> : null}<Button label={t(['تأكيد', 'Verify', 'Vérifier'])} onPress={() => { void run(true); }} disabled={busy || code.length !== 6 || pending.type === 'email' && !sent} />
      <Button label={t(['إلغاء والعودة للدخول', 'Cancel and return to sign in', 'Annuler et revenir à la connexion'])} onPress={cancel} disabled={busy} />{busy ? <Busy /> : null}
    </Panel></ScrollView>;
}
