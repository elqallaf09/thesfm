import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';
import { PendingNativeMfa, message, request, signIn, signOut, user } from './api';
import { MfaPrompt } from './MfaPrompt';
import type { Row } from './catalog';
import { dataChanged } from './navigation';
import { Button, Busy, Card, Copy, ErrorNote, Input, Page, Title } from './ui';

export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ready' | 'login' | 'error'>('loading');
  const [error, setError] = useState('');
  const check = useCallback(async () => {
    setState('loading');
    try { await user(); setState('ready'); }
    catch (reason) { setError(message(reason)); setState(reason instanceof Error && ['SESSION_EXPIRED','MFA_REQUIRED'].includes(reason.message) ? 'login' : 'error'); }
  }, []);
  useEffect(() => { void check(); }, [check]);
  if (state === 'loading') return <Busy />;
  if (state === 'login') return <SignInScreen onDone={() => { setState('ready'); }} />;
  if (state === 'error') return <Page><ErrorNote text={error} /><Button title="إعادة المحاولة" onPress={() => { void check(); }} /></Page>;
  return children;
}
function SignInScreen({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [pending, setPending] = useState<PendingNativeMfa | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit() {
    if (busy || !email.trim() || !password) return;
    setBusy(true); setError('');
    try { await signIn(email, password); setPassword(''); onDone(); }
    catch (reason) { if (reason instanceof PendingNativeMfa) { setPassword(''); setPending(reason); } else setError(message(reason)); } finally { setBusy(false); }
  }
  if (pending) return <MfaPrompt pending={pending} onCancel={() => setPending(null)} onDone={onDone} />;
  return <Page><Title>تسجيل الدخول</Title><Copy>استخدم حساب THE SFM لعرض سجلاتك وإدارتها داخل التطبيق.</Copy><Input label="البريد الإلكتروني" email value={email} onChange={setEmail} /><Input label="كلمة المرور" secret value={password} onChange={setPassword} /><ErrorNote text={error} /><Button title={busy ? 'جارٍ الدخول…' : 'دخول'} onPress={() => { void submit(); }} disabled={busy || !email.trim() || !password} /></Page>;
}
export function AccountScreen({ security = false, onSignOut }: { security?: boolean; onSignOut: () => void }) {
  const [profile, setProfile] = useState<Row>({}); const [email, setEmail] = useState('');
  const [name, setName] = useState(''); const [currency, setCurrency] = useState(''); const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState(''); const [busy, setBusy] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try { const account = await user(); setEmail(account.email || ''); const rows = await request<Row[]>(`/rest/v1/profiles?select=id,display_name,default_currency&id=eq.${encodeURIComponent(account.id)}`); const row = rows[0] || { id: account.id }; setProfile(row); setName(String(row.display_name || '')); setCurrency(String(row.default_currency || 'KWD')); }
    catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function save() {
    setError(''); setNotice('');
    if (security && (password.length < 8 || password !== confirmation)) { setError('استخدم كلمة مرور من 8 أحرف على الأقل وأدخل نفس الكلمة للتأكيد'); return; }
    if (!security && !/^[A-Za-z]{3}$/.test(currency)) { setError('أدخل رمز عملة مثل KWD'); return; }
    setBusy(true);
    try {
      if (security) { await request('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password }) }); setPassword(''); setConfirmation(''); }
      else { const account = await user(); const rows = await request<Row[]>(`/rest/v1/profiles?id=eq.${encodeURIComponent(account.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ display_name: name.trim(), default_currency: currency.toUpperCase() }) }); if (!rows?.length) throw new Error('تعذر حفظ الملف الشخصي'); }
      setNotice('تم الحفظ'); dataChanged();
    } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  }
  function signOutAll() { Alert.alert('تسجيل الخروج من جميع الأجهزة؟', 'تحتاج تسجيل الدخول مجدداً على أجهزتك.', [{ text: 'إلغاء', style: 'cancel' }, { text: 'تسجيل الخروج', style: 'destructive', onPress: async () => {
    setBusy(true);
    try { const revoked = await signOut('global'); onSignOut(); if (!revoked) Alert.alert('تم مسح جلسة هذا التطبيق', 'تعذر تأكيد تسجيل الخروج من جميع الأجهزة. حاول مجدداً عند توفر الاتصال.'); }
    catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  } }]); }
  return <Page><Title>{security ? 'الأمان' : 'الملف الشخصي'}</Title><Copy>{email}</Copy><ErrorNote text={error} />{busy ? <Busy /> : null}{notice ? <Card><Copy>{notice}</Copy></Card> : null}
    {security ? <><Input label="كلمة المرور الجديدة" value={password} onChange={setPassword} secret /><Input label="تأكيد كلمة المرور" value={confirmation} onChange={setConfirmation} secret /><Button title="تحديث كلمة المرور" onPress={() => { void save(); }} disabled={busy} /><Button title="تسجيل الخروج من جميع الأجهزة" danger onPress={signOutAll} disabled={busy} /></> : <><Input label="الاسم الظاهر" value={name} onChange={setName} /><Input label="العملة الافتراضية" value={currency} onChange={setCurrency} /><Button title="حفظ التغييرات" onPress={() => { void save(); }} disabled={busy || !profile.id} /></>}
    <Button title="تسجيل الخروج من هذا الجهاز" secondary onPress={() => { void signOut().then(revoked => { onSignOut(); if (!revoked) Alert.alert('تم مسح جلسة هذا التطبيق', 'تعذر تأكيد إلغاء الجلسة على الخادم.'); }).catch(reason => setError(message(reason))); }} disabled={busy} />
    {error ? <Button title="إعادة التحميل" secondary onPress={() => { void load(); }} disabled={busy} /> : null}
  </Page>;
}
