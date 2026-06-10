'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, ShieldAlert } from 'lucide-react';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

type Status = 'checking' | 'ready' | 'invalid' | 'success';
type Strength = 'weak' | 'medium' | 'strong';

const TEXT = {
  ar: {
    title: 'تغيير كلمة المرور',
    subtitle: 'أدخل كلمة مرور جديدة لحسابك في THE SFM.',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور الجديدة',
    save: 'حفظ كلمة المرور',
    saving: 'جاري الحفظ...',
    success: 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.',
    backLogin: 'العودة إلى تسجيل الدخول',
    invalid: 'رابط الاستعادة غير صالح أو منتهي. اطلب رابطاً جديداً.',
    requestNew: 'طلب رابط جديد',
    short: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
    mismatch: 'كلمتا المرور غير متطابقتين.',
    failed: 'تعذر تغيير كلمة المرور حالياً. حاول مرة أخرى.',
    checking: 'جاري التحقق من رابط الاستعادة...',
    weak: 'ضعيفة',
    medium: 'متوسطة',
    strong: 'قوية',
    recommended: 'استخدم حرفاً ورقماً ورمزاً خاصاً لكلمة مرور أقوى.',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
  },
  en: {
    title: 'Reset Password',
    subtitle: 'Enter a new password for your THE SFM account.',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    save: 'Save password',
    saving: 'Saving...',
    success: 'Password updated successfully. You can sign in now.',
    backLogin: 'Return to login',
    invalid: 'The reset link is invalid or expired. Please request a new one.',
    requestNew: 'Request a new link',
    short: 'Password must be at least 8 characters.',
    mismatch: 'Passwords do not match.',
    failed: 'Could not update the password right now. Please try again.',
    checking: 'Checking reset link...',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    recommended: 'Use a letter, number, and symbol for a stronger password.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  fr: {
    title: 'Réinitialiser le mot de passe',
    subtitle: 'Entrez un nouveau mot de passe pour votre compte THE SFM.',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le nouveau mot de passe',
    save: 'Enregistrer le mot de passe',
    saving: 'Enregistrement...',
    success: 'Mot de passe mis à jour avec succès. Vous pouvez vous connecter.',
    backLogin: 'Retour à la connexion',
    invalid: 'Le lien de réinitialisation est invalide ou expiré. Veuillez en demander un nouveau.',
    requestNew: 'Demander un nouveau lien',
    short: 'Le mot de passe doit contenir au moins 8 caractères.',
    mismatch: 'Les mots de passe ne correspondent pas.',
    failed: 'Impossible de mettre à jour le mot de passe pour le moment. Réessayez.',
    checking: 'Vérification du lien de réinitialisation...',
    weak: 'Faible',
    medium: 'Moyen',
    strong: 'Fort',
    recommended: 'Utilisez une lettre, un chiffre et un symbole pour un mot de passe plus fort.',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
  },
} as const;

const RECOVERY_STORAGE_KEY = 'sfm_password_recovery_active';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: '#EEF6FF' }} />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function scorePassword(password: string) {
  return [
    password.length >= 8,
    /[A-Za-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
}

function strengthFor(password: string): Strength {
  const score = scorePassword(password);
  if (score <= 2) return 'weak';
  if (score === 3) return 'medium';
  return 'strong';
}

function ResetPasswordContent() {
  const { lang, dir } = useLanguage();
  const text = TEXT[lang] as typeof TEXT.ar;
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'ok'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const strength = useMemo(() => strengthFor(password), [password]);
  const score = useMemo(() => scorePassword(password), [password]);

  useEffect(() => {
    let cancelled = false;

    async function checkRecoverySession() {
      if (supabaseConfigError) {
        setMessage({ type: 'error', text: supabaseConfigError });
        setStatus('invalid');
        return;
      }

      const currentUrl = new URL(window.location.href);
      const code = currentUrl.searchParams.get('code');
      const hasRecoveryMarker =
        Boolean(code) ||
        currentUrl.hash.includes('type=recovery') ||
        currentUrl.searchParams.get('type') === 'recovery' ||
        sessionStorage.getItem(RECOVERY_STORAGE_KEY) === 'true';
      let recoveryReady = hasRecoveryMarker;
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        recoveryReady = !error;
        if (!error) {
          sessionStorage.setItem(RECOVERY_STORAGE_KEY, 'true');
          currentUrl.searchParams.delete('code');
          window.history.replaceState({}, document.title, currentUrl.pathname + currentUrl.search + currentUrl.hash);
        }
      } else if (hasRecoveryMarker) {
        sessionStorage.setItem(RECOVERY_STORAGE_KEY, 'true');
      }

      const { data } = await supabase.auth.getSession();
      if (!cancelled) setStatus(data.session && recoveryReady ? 'ready' : 'invalid');
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        sessionStorage.setItem(RECOVERY_STORAGE_KEY, 'true');
        setStatus('ready');
      }
    });

    void checkRecoverySession();
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setMessage(null);
    if (password.length < 8) {
      setMessage({ type: 'error', text: text.short });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: text.mismatch });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setMessage({ type: 'error', text: text.failed });
      return;
    }
    await supabase.auth.signOut();
    sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
    setStatus('success');
    setMessage({ type: 'ok', text: text.success });
    setPassword('');
    setConfirmPassword('');
  }

  return (
    <main className="reset-shell" dir={dir}>
      <section className="reset-card">
        <div className="language-row">
          <LanguageSwitcher variant="gold" compact />
        </div>
        <div className="brand">
          <Image src="/sfm-logo.png" alt="THE SFM" width={88} height={88} priority className="mark sfm-brand-mark sfm-brand-mark--auth" />
          <h1>{text.title}</h1>
          <p>{status === 'checking' ? text.checking : status === 'invalid' ? text.invalid : text.subtitle}</p>
        </div>

        {status === 'ready' && (
          <form className="form" onSubmit={submit}>
            <PasswordField
              label={text.newPassword}
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword(value => !value)}
              ariaLabel={showPassword ? text.hidePassword : text.showPassword}
            />
            <PasswordField
              label={text.confirmPassword}
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPassword}
              onToggle={() => setShowConfirmPassword(value => !value)}
              ariaLabel={showConfirmPassword ? text.hidePassword : text.showPassword}
            />
            <PasswordMeter strength={strength} score={score} text={text} />
            {message && <div className={message.type === 'ok' ? 'message ok' : 'message'} role="status">{message.text}</div>}
            <button className="primary" disabled={submitting}>{submitting ? text.saving : text.save}</button>
          </form>
        )}

        {status === 'checking' && <div className="state-card">{text.checking}</div>}

        {status === 'invalid' && (
          <div className="state-card invalid">
            <ShieldAlert size={20} aria-hidden="true" />
            <p>{text.invalid}</p>
            <Link href="/login?mode=forgot-password">{text.requestNew}</Link>
          </div>
        )}

        {status === 'success' && (
          <div className="state-card success">
            <p>{text.success}</p>
            <Link href="/login">{text.backLogin}</Link>
          </div>
        )}
      </section>

      <style jsx global>{`
        .reset-shell{min-height:100vh;background:radial-gradient(circle at 20% 10%,rgba(24,212,212,.16),transparent 30%),linear-gradient(180deg,#EEF6FF 0%,#F8FBFF 58%,#FFFFFF 100%);display:grid;place-items:center;padding:24px;font-family:Tajawal,Arial,sans-serif;color:#0B172A;overflow-x:hidden}
        .reset-shell .reset-card{width:min(100%,460px);background:rgba(255,255,255,.95);border:1px solid rgba(29,140,255,.16);border-radius:28px;box-shadow:0 22px 70px rgba(3,18,37,.14);padding:24px;backdrop-filter:blur(18px);min-width:0}
        .reset-shell .language-row{display:flex;justify-content:flex-end;margin-bottom:14px}.reset-shell .brand{text-align:center;margin-bottom:22px}.reset-shell .mark{margin:0 auto 12px}.reset-shell .brand h1{font-size:clamp(24px,4vw,30px);margin:0 0 8px;color:#061B33}.reset-shell .brand p{font-size:13px;color:#475569;line-height:1.7;margin:0}
        .reset-shell .form{display:grid;gap:14px}.reset-shell .auth-field{display:grid;gap:7px;min-width:0}.reset-shell .auth-field>span{font-size:13px;font-weight:900;color:#0B2748}.reset-shell .input-wrap{min-height:52px;border:1.5px solid rgba(29,140,255,.22);background:#FFFFFF;border-radius:14px;display:flex;align-items:center;gap:10px;padding:0 13px;color:#1D8CFF;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}.reset-shell .input-wrap:focus-within{border-color:#1D8CFF;background:#F8FBFF;box-shadow:0 0 0 4px rgba(29,140,255,.25)}
        .reset-shell input{flex:1;border:0;background:transparent;outline:0;color:#0B172A;font:800 14px Tajawal,Arial,sans-serif;min-width:0;width:100%}.reset-shell .icon{border:0;background:transparent;color:#0B2748;display:grid;place-items:center;cursor:pointer;border-radius:999px;padding:4px}.reset-shell .icon:hover{color:#1D8CFF}.reset-shell .icon:focus-visible,.reset-shell .primary:focus-visible,.reset-shell .state-card a:focus-visible{outline:3px solid rgba(24,212,212,.35);outline-offset:3px}
        .reset-shell .password-meter{display:grid;gap:8px}.reset-shell .meter-top{display:flex;justify-content:space-between;gap:12px;color:#334155;font-size:12px;font-weight:900}.reset-shell .meter-top strong.weak{color:#B91C1C}.reset-shell .meter-top strong.medium{color:#B45309}.reset-shell .meter-top strong.strong{color:#047857}.reset-shell .meter-bars{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.reset-shell .meter-bars span{height:7px;border-radius:999px;background:rgba(100,116,139,.16)}.reset-shell .meter-bars span.on.weak{background:#EF4444}.reset-shell .meter-bars span.on.medium{background:#F59E0B}.reset-shell .meter-bars span.on.strong{background:#10B981}.reset-shell .password-meter p{margin:0;color:#64748B;font-size:12px;font-weight:800}
        .reset-shell .primary,.reset-shell .state-card a{min-height:54px;border-radius:16px;padding:0 18px;font:950 14px Tajawal,Arial,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease;background:linear-gradient(135deg,#061B33 0%,#1D8CFF 54%,#18D4D4 100%);border:0;color:#FFFFFF;text-decoration:none;box-shadow:0 14px 34px rgba(29,140,255,.28)}.reset-shell .primary:hover:not(:disabled),.reset-shell .state-card a:hover{transform:translateY(-2px);filter:saturate(1.08) brightness(1.02);box-shadow:0 16px 38px rgba(24,212,212,.22)}.reset-shell .primary:disabled{opacity:.72;cursor:not-allowed;transform:none;box-shadow:none}
        .reset-shell .message{background:rgba(239,68,68,.08);color:#B91C1C;border:1px solid rgba(239,68,68,.18);border-radius:13px;padding:11px 13px;font-size:13px;font-weight:850;line-height:1.6}.reset-shell .message.ok{background:rgba(16,185,129,.10);border-color:rgba(16,185,129,.24);color:#047857}
        .reset-shell .state-card{border:1px solid rgba(29,140,255,.16);background:#F8FBFF;border-radius:18px;padding:16px;display:grid;gap:12px;text-align:center;color:#334155;font-weight:850;line-height:1.7}.reset-shell .state-card svg{margin:auto;color:#B45309}.reset-shell .state-card p{margin:0}.reset-shell .state-card.success{background:#ECFDF5;border-color:rgba(16,185,129,.22);color:#047857}
        @media(max-width:640px){.reset-shell{padding:16px;align-items:start}.reset-shell .reset-card{padding:20px;border-radius:22px;width:100%}.reset-shell .language-row{justify-content:center}.reset-shell .primary,.reset-shell .state-card a{width:100%}.reset-shell .brand{margin-bottom:18px}}
      `}</style>
    </main>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  ariaLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="input-wrap">
        <LockKeyhole size={18} aria-hidden="true" />
        <input value={value} onChange={event => onChange(event.target.value)} type={show ? 'text' : 'password'} autoComplete="new-password" dir="ltr" />
        <button type="button" className="icon" onClick={onToggle} aria-label={ariaLabel}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </label>
  );
}

function PasswordMeter({
  strength,
  score,
  text,
}: {
  strength: Strength;
  score: number;
  text: typeof TEXT.ar;
}) {
  const label = strength === 'weak' ? text.weak : strength === 'medium' ? text.medium : text.strong;
  return (
    <div className="password-meter" aria-live="polite">
      <div className="meter-top">
        <span>{text.newPassword}</span>
        <strong className={strength}>{label}</strong>
      </div>
      <div className="meter-bars" aria-hidden="true">
        {[1, 2, 3, 4].map(item => <span key={item} className={item <= score ? `on ${strength}` : ''} />)}
      </div>
      {strength !== 'strong' && <p>{text.recommended}</p>}
    </div>
  );
}
