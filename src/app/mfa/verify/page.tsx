'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { normalizeDigits } from '@/lib/locale';
import { loginHrefForDestination, mergeClientHash } from '@/lib/auth/redirects';
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
    return mergeClientHash(
      searchParams?.get('next'),
      typeof window === 'undefined' ? '' : window.location.hash,
    );
  }, [searchParams]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace(loginHrefForDestination(nextPath));
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
    router.replace(loginHrefForDestination(nextPath));
  }

  return (
    <main className="mfa-page" dir={dir}>
      <section className="mfa-card">
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
          {error && <div className="mfa-error" role="alert">{error}</div>}
          <button className="mfa-primary" disabled={submitting || code.length !== 6 || !selectedFactorId}>
            {submitting ? text.verifying : text.verify}
          </button>
        </form>
        <button type="button" className="mfa-link" onClick={() => void backToLogin()}>{text.back}</button>
      </section>
      <style jsx global>{`
        .mfa-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 20px;
          background: var(--background);
          color: var(--foreground);
          font-family: var(--font-ui);
        }
        .mfa-card {
          width: min(480px, 100%);
          display: grid;
          gap: 16px;
          background: var(--surface-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-panel);
          padding: 24px;
          box-shadow: var(--shadow-lg);
        }
        .mfa-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          border-radius: var(--radius-card);
          background: var(--info-soft);
          color: var(--info);
        }
        .mfa-card h1 { margin: 0; color: var(--foreground); font-size: 28px; line-height: 1.35; font-weight: 600; }
        .mfa-card p { margin: 0; color: var(--foreground-secondary); line-height: 1.75; font-weight: 400; }
        .mfa-card form { display: grid; gap: 14px; }
        .mfa-card label { display: grid; gap: 8px; color: var(--foreground); font-weight: 500; }
        .mfa-input-wrap {
          min-height: var(--control-h-lg);
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-card);
          padding: 0 13px;
          background: var(--surface);
          color: var(--primary);
        }
        .mfa-input-wrap:focus-within,
        .mfa-card select:focus-visible {
          border-color: var(--focus-ring);
          box-shadow: var(--focus-shadow);
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }
        .mfa-card input,
        .mfa-card select {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--foreground);
          font: 600 20px var(--font-data);
          text-align: center;
          letter-spacing: 5px;
        }
        .mfa-card select {
          min-height: var(--control-h-lg);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-control);
          padding: 0 12px;
          background: var(--surface);
          font: 500 14px var(--font-ui);
          text-align: start;
          letter-spacing: 0;
        }
        .mfa-primary {
          min-height: 52px;
          border: 1px solid var(--primary);
          border-radius: var(--radius-card);
          background: var(--primary);
          color: var(--primary-foreground);
          font: 600 14px var(--font-ui);
          cursor: pointer;
          transition: background .18s ease, border-color .18s ease;
        }
        .mfa-primary:hover:not(:disabled) { background: var(--primary-hover); border-color: var(--primary-hover); }
        .mfa-primary:focus-visible,
        .mfa-link:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; box-shadow: var(--focus-shadow); }
        .mfa-primary:disabled { opacity: .58; cursor: not-allowed; }
        .mfa-error {
          border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--border));
          background: var(--danger-soft);
          color: var(--danger);
          border-radius: var(--radius-control);
          padding: 11px 12px;
          font-weight: 500;
          line-height: 1.6;
        }
        .mfa-link {
          min-height: 44px;
          border: 0;
          border-radius: var(--radius-control);
          background: transparent;
          color: var(--primary);
          font: 500 13px var(--font-ui);
          cursor: pointer;
        }
        .mfa-link:hover { background: var(--primary-soft); color: var(--primary-hover); }
        @media(max-width:640px) {
          .mfa-page { align-items: start; padding: 14px; }
          .mfa-card { padding: 20px; }
          .mfa-primary { width: 100%; }
        }
      `}</style>
    </main>
  );
}
