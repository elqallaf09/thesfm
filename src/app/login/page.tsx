'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@smart-finance.local`;

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: 'var(--sfm-light-card)' }} />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, session, continueAsGuest } = useAuth();
  const { dir, t } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'ok'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = useMemo(() => searchParams.get('next') || '/', [searchParams]);

  useEffect(() => {
    if (session) router.replace(nextPath);
  }, [nextPath, router, session]);

  const validate = () => {
    if (!username.trim() || !password.trim()) return t('login_error_empty');
    if (username.trim().length < 3) return t('login_error_short_username');
    if (password.length < 6) return t('login_error_short_password');
    if (mode === 'register' && password !== confirmPassword) return t('login_error_mismatch');
    return '';
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (process.env.NODE_ENV === 'development') console.time('login_submit');
    setMessage(null);
    const validationError = validate();
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      if (process.env.NODE_ENV === 'development') console.timeEnd('login_submit');
      return;
    }

    setSubmitting(true);
    const cleanUsername = username.trim().toLowerCase();

    if (supabaseConfigError) {
      setSubmitting(false);
      setMessage({ type: 'error', text: supabaseConfigError });
      if (process.env.NODE_ENV === 'development') console.timeEnd('login_submit');
      return;
    }

    if (mode === 'login') {
      if (process.env.NODE_ENV === 'development') console.time('auth_sign_in');
      const { error } = await signIn(cleanUsername, password);
      if (process.env.NODE_ENV === 'development') console.timeEnd('auth_sign_in');
      setSubmitting(false);
      if (error) {
        setMessage({ type: 'error', text: t('login_error_failed') });
        if (process.env.NODE_ENV === 'development') console.timeEnd('login_submit');
        return;
      }
      if (process.env.NODE_ENV === 'development') console.time('redirect_after_login');
      router.replace(nextPath);
      if (process.env.NODE_ENV === 'development') {
        requestAnimationFrame(() => {
          console.timeEnd('redirect_after_login');
          console.timeEnd('login_submit');
        });
      }
      return;
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existing) {
      setSubmitting(false);
      setMessage({ type: 'error', text: t('login_error_exists') });
      return;
    }

    const email = usernameToEmail(cleanUsername);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
          display_name: cleanUsername,
        },
      },
    });

    if (error) {
      setSubmitting(false);
      setMessage({ type: 'error', text: error.message || t('login_error_register') });
      return;
    }

    const newUser = data.user ?? (await supabase.auth.getUser()).data.user;
    if (newUser) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: newUser.id,
        username: cleanUsername,
        display_name: cleanUsername,
        email,
      }, { onConflict: 'id' });

      if (profileError) {
        setSubmitting(false);
        setMessage({ type: 'error', text: profileError.message || t('login_error_register') });
        return;
      }
    }

    document.cookie = `sfm_auth=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    document.cookie = 'sfm_guest=; path=/; max-age=0; SameSite=Lax';
    localStorage.removeItem('sfm_guest_mode');
    setSubmitting(false);
    router.replace('/');
    router.refresh();
  };

  const resetPassword = async () => {
    if (supabaseConfigError) {
      setMessage({ type: 'error', text: supabaseConfigError });
      return;
    }
    if (username.trim().length < 3) {
      setMessage({ type: 'error', text: t('login_error_short_username') });
      return;
    }

    await supabase.auth.resetPasswordForEmail(usernameToEmail(username), {
      redirectTo: `${window.location.origin}/login`,
    });
    setMessage({ type: 'ok', text: t('login_reset_sent') });
  };

  const enterGuestMode = () => {
    continueAsGuest();
    router.replace('/');
  };

  return (
    <main className="login-shell" dir={dir}>
      <section className="login-card">
        <div className="language-row">
          <LanguageSwitcher variant="gold" compact />
        </div>

        <div className="brand">
          <Image
            src="/sfm-logo.png"
            alt="THE SFM"
            width={88}
            height={88}
            priority
            className="mark sfm-brand-mark sfm-brand-mark--auth"
          />
          <h1>{t('login_title')}</h1>
          <p>{t('login_subtitle')}</p>
        </div>

        <form onSubmit={submit} className="form">
          <label>
            <span>{t('login_username')}</span>
            <div className="input-wrap">
              <UserRound size={18} />
              <input
                value={username}
                onChange={event => setUsername(event.target.value)}
                placeholder={t('login_username_placeholder')}
                autoComplete="username"
              />
            </div>
          </label>

          <label>
            <span>{t('login_password')}</span>
            <div className="input-wrap">
              <LockKeyhole size={18} />
              <input
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder={t('login_password_placeholder')}
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button type="button" className="icon" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          {mode === 'register' && (
            <label>
              <span>{t('login_confirm_password')}</span>
              <div className="input-wrap">
                <LockKeyhole size={18} />
                <input
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  placeholder={t('login_confirm_password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                />
              </div>
            </label>
          )}

          {message && <div className={message.type === 'ok' ? 'message ok' : 'message'}>{message.text}</div>}

          <button className="primary" disabled={submitting}>
            {submitting ? (
              <span className="loading-label"><span className="spinner" />{mode === 'login' ? t('login_signing_in') : t('saving')}</span>
            ) : mode === 'login' ? t('login_sign_in') : t('login_create_account')}
          </button>
        </form>

        <div className="actions">
          <button type="button" disabled={submitting} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(null); }}>
            {mode === 'login' ? t('login_switch_create') : t('login_switch_login')}
          </button>
          {mode === 'login' && <button type="button" disabled={submitting} onClick={resetPassword}>{t('login_forgot')}</button>}
          <button type="button" disabled={submitting} onClick={enterGuestMode}>{t('login_guest')}</button>
        </div>
      </section>

      <style jsx>{`
        .login-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 20% 10%, rgba(24, 212, 212, 0.16), transparent 30%),
            linear-gradient(180deg, #EEF6FF 0%, #F8FBFF 58%, #FFFFFF 100%);
          display: grid;
          place-items: center;
          padding: 24px;
          font-family: Tajawal, Arial, sans-serif;
          color: #0B172A;
        }
        .login-card {
          width: min(100%, 440px);
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(29, 140, 255, 0.16);
          border-radius: 26px;
          box-shadow: 0 22px 70px rgba(3, 18, 37, 0.14);
          padding: 24px;
          backdrop-filter: blur(18px);
        }
        .language-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 14px;
        }
        .brand {
          text-align: center;
          margin-bottom: 22px;
        }
        .mark {
          margin: 0 auto 12px;
        }
        .brand h1 {
          font-size: 26px;
          margin: 0 0 8px;
          color: #061B33;
        }
        .brand p {
          font-size: 13px;
          color: #475569;
          line-height: 1.7;
          margin: 0;
        }
        .form {
          display: grid;
          gap: 14px;
        }
        label span {
          display: block;
          font-size: 13px;
          font-weight: 800;
          color: #0B2748;
          margin-bottom: 7px;
        }
        .input-wrap {
          height: 52px;
          border: 1.5px solid rgba(29, 140, 255, 0.22);
          background: #FFFFFF;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 13px;
          color: #1D8CFF;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .input-wrap:focus-within {
          border-color: #1D8CFF;
          background: #F8FBFF;
          box-shadow: 0 0 0 4px rgba(29, 140, 255, 0.25);
        }
        input {
          flex: 1;
          border: 0;
          background: transparent;
          outline: 0;
          color: #0B172A;
          font: 700 14px Tajawal, Arial, sans-serif;
          min-width: 0;
        }
        input::placeholder {
          color: #64748B;
          opacity: 1;
        }
        .icon {
          border: 0;
          background: transparent;
          color: #0B2748;
          display: grid;
          place-items: center;
          cursor: pointer;
          border-radius: 999px;
          padding: 4px;
        }
        .icon:hover {
          color: #1D8CFF;
        }
        .icon:focus-visible,
        .primary:focus-visible,
        .actions button:focus-visible {
          outline: 2px solid #18D4D4;
          outline-offset: 3px;
        }
        .primary {
          height: 54px;
          border: 0;
          border-radius: 16px;
          background: linear-gradient(135deg, #061B33 0%, #1D8CFF 54%, #18D4D4 100%);
          color: #FFFFFF;
          font: 900 15px Tajawal, Arial, sans-serif;
          cursor: pointer;
          margin-top: 4px;
          display: grid;
          place-items: center;
          box-shadow: 0 14px 34px rgba(29, 140, 255, 0.28);
        }
        .primary:hover:not(:disabled) {
          filter: saturate(1.08) brightness(1.02);
        }
        .primary:disabled {
          opacity: 0.78;
          cursor: wait;
        }
        .loading-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
        }
        .spinner {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #FFFFFF;
          animation: spin 0.75s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .message {
          background: rgba(239, 68, 68, 0.08);
          color: #B91C1C;
          border: 1px solid rgba(239, 68, 68, 0.18);
          border-radius: 13px;
          padding: 11px 13px;
          font-size: 13px;
          font-weight: 800;
        }
        .message.ok {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.24);
          color: #047857;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          justify-content: center;
          margin-top: 18px;
        }
        .actions button {
          border: 1px solid rgba(29, 140, 255, 0.22);
          background: #FFFFFF;
          color: #0B2748;
          border-radius: 999px;
          padding: 9px 13px;
          font: 800 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
        }
        .actions button:hover:not(:disabled) {
          background: #EEF6FF;
          border-color: rgba(29, 140, 255, 0.34);
          color: #061B33;
        }
        .actions button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        @media (max-width: 480px) {
          .login-shell {
            padding: 16px;
          }
          .login-card {
            padding: 20px;
            border-radius: 22px;
          }
          .language-row {
            justify-content: center;
          }
          .actions button {
            flex: 1 1 100%;
          }
        }
      `}</style>
    </main>
  );
}
