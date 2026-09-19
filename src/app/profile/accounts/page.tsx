'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { switchAccount } from '@/lib/auth/accountSwitch';
import { Button } from '@/components/ui/button';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';

const copy = {
  ar: { title: 'تبديل الحساب', note: 'لتبديل الحساب بأمان، سننهي جلسة هذا المتصفح ثم نطلب تسجيل الدخول إلى الحساب الآخر. لن تُحفظ كلمات المرور أو مفاتيح الجلسات لحسابات متعددة.', current: 'الحساب الحالي', action: 'المتابعة إلى الحساب الآخر', error: 'تعذر إنهاء الجلسة بأمان. أعد المحاولة.', loading: 'جارٍ إنهاء الجلسة…', login: 'تسجيل الدخول' },
  en: { title: 'Switch account', note: 'We will end this browser session before asking you to sign in to your other account. Passwords and multiple account session keys are not saved.', current: 'Current account', action: 'Continue to another account', error: 'Could not safely end the session. Please retry.', loading: 'Ending session…', login: 'Sign in' },
  fr: { title: 'Changer de compte', note: 'La session de ce navigateur sera fermée avant la connexion à votre autre compte. Les mots de passe et les clés de plusieurs sessions ne sont pas conservés.', current: 'Compte actuel', action: 'Continuer vers un autre compte', error: 'Impossible de fermer la session. Réessayez.', loading: 'Fermeture de la session…', login: 'Se connecter' },
};

export default function AccountsPage() {
  const { user, loading, signOut } = useAuth();
  const { lang } = useLanguage();
  const text = copy[lang === 'en' || lang === 'fr' ? lang : 'ar'];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function change() {
    setBusy(true); setError(false);
    try { await switchAccount(signOut, url => window.location.replace(url)); }
    catch { setError(true); setBusy(false); }
  }
  return <WorkspacePageContainer variant="reading">
    <h1>{text.title}</h1><p>{text.note}</p>
    {user ? <p>{text.current}: <b dir="auto">{user.email}</b></p> : null}
    {error ? <p role="alert">{text.error}</p> : null}
    <Button disabled={loading || busy} onClick={change}>{busy ? text.loading : user ? text.action : text.login}</Button>
  </WorkspacePageContainer>;
}
