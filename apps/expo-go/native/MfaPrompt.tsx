import { useEffect, useRef, useState } from 'react';
import { cancelNativeMfa, message, sendNativeEmailCode, verifyNativeMfa, type PendingNativeMfa } from './api';
import { Button, Copy, ErrorNote, Input, Page, Title } from './ui';

export function MfaPrompt({ pending, onCancel, onDone }: { pending: PendingNativeMfa; onCancel: () => void; onDone?: () => void }) {
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [sent, setSent] = useState(Boolean(pending.challenge));
  const mounted = useRef(true); const running = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; cancelNativeMfa(pending); }; }, [pending]);
  async function run(verify: boolean) {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try {
      if (verify) { await verifyNativeMfa(pending, code); if (mounted.current) { setCode(''); onDone?.(); } }
      else { await sendNativeEmailCode(pending); if (mounted.current) setSent(true); }
    } catch (reason) { if (mounted.current) setError(message(reason)); }
    finally { running.current = false; if (mounted.current) setBusy(false); }
  }
  return <Page><Title>التحقق الإضافي</Title><Copy>{pending.kind === 'totp' ? 'أدخل الرمز من تطبيق المصادقة.' : sent ? 'أدخل الرمز الذي وصلك بالبريد الإلكتروني.' : 'أرسل رمز التحقق إلى بريد حسابك للمتابعة.'}</Copy>
    {pending.kind === 'email' ? <Button title={sent ? 'إعادة إرسال الرمز' : 'إرسال الرمز'} secondary onPress={() => { void run(false); }} disabled={busy} /> : null}
    <Input label="رمز التحقق" numeric value={code} onChange={value => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))} />
    <ErrorNote text={error} /><Button title={busy ? 'جارٍ التحقق…' : 'تأكيد'} onPress={() => { void run(true); }} disabled={busy || code.length !== 6 || (pending.kind === 'email' && !sent)} />
    <Button title="إلغاء والعودة لتسجيل الدخول" secondary onPress={() => { cancelNativeMfa(pending); onCancel(); }} />
  </Page>;
}
