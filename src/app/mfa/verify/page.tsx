'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { normalizeDigits } from '@/lib/locale';
import { syncServerAuthSession } from '@/lib/auth/clientSession';

type Lang = 'ar' | 'en' | 'fr';
type TotpFactor = { id: string; friendly_name?: string | null; status?: string };

const TEXT = {
  ar: {
    title: 'التحقق الثنائي',
    subtitle: 'أدخل رمز تطبيق المصادقة لإكمال الدخول إلى حسابك المالي.',
    code: 'رمز التحقق',
    verify: 'تأكيد الدخول',
    verifying: 'جاري التحقق...',
    invalid: 'رمز المصادقة غير صحيح أو انتهت صلاحيته.',
    noFactor: 'لا يوجد عامل مصادقة مفعّل لهذا الحساب.',
    loadError: 'تعذر تحميل عوامل المصادقة.',
    back: 'العودة لتسجيل الدخول',
  },
  en: {
    title: 'Two-Factor Verification',
    subtitle: 'Enter the authenticator app code to finish signing in to your financial account.',
    code: 'Verification code',
    verify: 'Verify sign in',
    verifying: 'Verifying...',
    invalid: 'The authentication code is invalid or expired.',
    noFactor: 'No verified MFA factor is enabled for this account.',
    loadError: 'Could not load authentication factors.',
    back: 'Back to login',
  },
  fr: {
    title: 'Vérification à deux facteurs',
    subtitle: 'Saisissez le code de l’application d’authentification pour terminer la connexion.',
    code: 'Code de vérification',
    verify: 'Vérifier',
    verifying: 'Vérification...',
    invalid: 'Le code est invalide ou expiré.',
    noFactor: 'Aucun facteur MFA vérifié n’est activé pour ce compte.',
    loadError: 'Impossible de charger les facteurs d’authentification.',
    back: 'Retour à la connexion',
  },
} as const;

function safeInternalPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || decoded.includes('\\')) return '/dashboard';
  } catch {
    return '/dashboard';
  }
  return value;
}

export default function MfaVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading, signOut } = useAuth();
  const { lang, dir } = useLanguage();
  const text = TEXT[(lang as Lang) || 'ar'];
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const nextPath = useMemo(() => {
    return safeInternalPath(searchParams?.get('next'));
  }, [searchParams]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    let cancelled = false;
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(async ({ data }) => {
      if (cancelled) return;
      if (data?.currentLevel === 'aal2') {
        const synced = await syncServerAuthSession(session);
        if (cancelled) return;
        if (!synced.ok) {
          setError(text.loadError);
          return;
        }
        router.replace(nextPath);
        router.refresh();
      }
    });
    supabase.auth.mfa.listFactors().then(({ data, error: factorsError }) => {
      if (cancelled) return;
      if (factorsError) {
        console.error('[mfa] Failed to load factors', factorsError);
        setError(text.loadError);
        return;
      }
      const verified = ((data?.totp || []) as TotpFactor[]).filter(factor => factor.status === 'verified');
      setFactors(verified);
      setSelectedFactorId(verified[0]?.id || '');
      if (!verified.length) setError(text.noFactor);
    });
    return () => {
      cancelled = true;
    };
  }, [loading, nextPath, router, session, text.loadError, text.noFactor]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFactorId || code.length !== 6 || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: selectedFactorId });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({
        factorId: selectedFactorId,
        challengeId: challenge.data.id,
        code,
      });
      if (verify.error) throw verify.error;
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('Session unavailable after MFA verification');
      const synced = await syncServerAuthSession(data.session);
      if (!synced.ok) throw new Error('Server rejected the MFA session');
      router.replace(nextPath);
      router.refresh();
    } catch (verifyError) {
      console.error('[mfa] Verification failed', verifyError);
      setError(text.invalid);
    } finally {
      setSubmitting(false);
    }
  }

  async function backToLogin() {
    await signOut();
    router.replace('/login');
  }

  return (
    <main className="mfa-page" dir={dir}>
      <section className="mfa-card">
        <div className="mfa-top">
          <LanguageSwitcher />
        </div>
        <div className="mfa-icon"><ShieldCheck size={28} /></div>
        <h1>{text.title}</h1>
        <p>{text.subtitle}</p>
        <form onSubmit={submit}>
          {factors.length > 1 && (
            <label>
              <span>{text.title}</span>
              <select value={selectedFactorId} onChange={event => setSelectedFactorId(event.target.value)}>
                {factors.map(factor => <option key={factor.id} value={factor.id}>{factor.friendly_name || 'THE SFM'}</option>)}
              </select>
            </label>
          )}
          <label>
            <span>{text.code}</span>
            <div className="mfa-input-wrap">
              <KeyRound size={18} />
              <input
                value={code}
                onChange={event => setCode(normalizeDigits(event.target.value).replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                autoFocus
              />
            </div>
          </label>
          {error && <div className="mfa-error">{error}</div>}
          <button className="mfa-primary" disabled={submitting || code.length !== 6 || !selectedFactorId}>
            {submitting ? text.verifying : text.verify}
          </button>
        </form>
        <button type="button" className="mfa-link" onClick={() => void backToLogin()}>{text.back}</button>
      </section>
      <style jsx global>{`
        .mfa-page{min-height:100vh;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at 18% 10%,rgba(34,211,238,.16),transparent 34%),linear-gradient(160deg,#061A2E,#071B2F);font-family:Tajawal,Arial,sans-serif}.mfa-card{width:min(480px,100%);display:grid;gap:16px;background:rgba(255,255,255,.96);border:1px solid rgba(34,211,238,.18);border-radius:var(--r-2xl);padding:24px;box-shadow:0 28px 90px rgba(3,18,37,.36)}.mfa-top{display:flex;justify-content:flex-end}.mfa-icon{width:58px;height:58px;display:grid;place-items:center;border-radius:var(--r-xl);background:rgba(34,211,238,.12);color:#0891B2}.mfa-card h1{margin:0;color:#061A2E;font-size:28px}.mfa-card p{margin:0;color:#475569;line-height:1.75;font-weight:800}.mfa-card form{display:grid;gap:14px}.mfa-card label{display:grid;gap:8px;color:#0B2748;font-weight:950}.mfa-input-wrap{height:var(--control-h-lg);display:flex;align-items:center;gap:10px;border:1.5px solid rgba(29,140,255,.22);border-radius:var(--r-lg);padding:0 13px;background:#fff;color:#1D8CFF}.mfa-input-wrap:focus-within{border-color:#22D3EE;box-shadow:0 0 0 4px rgba(34,211,238,.16)}.mfa-card input,.mfa-card select{width:100%;border:0;outline:0;background:transparent;color:#0B172A;font:950 20px Tajawal,Arial,sans-serif;text-align:center;letter-spacing:5px}.mfa-card select{height:var(--control-h-lg);border:1.5px solid rgba(29,140,255,.18);border-radius:var(--r-md);padding:0 12px;text-align:start;letter-spacing:0}.mfa-primary{height:52px;border:0;border-radius:var(--r-lg);background:linear-gradient(135deg,#061A2E,#1D8CFF,#18D4D4);color:#fff;font:950 14px Tajawal,Arial,sans-serif;cursor:pointer}.mfa-primary:disabled{opacity:.6;cursor:not-allowed}.mfa-error{border:1px solid rgba(239,68,68,.22);background:#FEF2F2;color:#B91C1C;border-radius:var(--r-md);padding:11px 12px;font-weight:900;line-height:1.6}.mfa-link{border:0;background:transparent;color:#1D8CFF;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer}.dark .mfa-card{background:#0B1F35;border-color:rgba(255,255,255,.10)}.dark .mfa-card h1,.dark .mfa-card label{color:#F8FAFC}.dark .mfa-card p{color:#CBD5E1}.dark .mfa-input-wrap,.dark .mfa-card select{background:#0F2942;border-color:rgba(255,255,255,.12);color:#38BDF8}.dark .mfa-card input,.dark .mfa-card select{color:#F8FAFC}@media(max-width:640px){.mfa-page{align-items:start;padding:14px}.mfa-card{padding:20px;border-radius:var(--r-2xl)}.mfa-primary{width:100%}}
      `}</style>
    </main>
  );
}
