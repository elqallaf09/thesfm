'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { isEmail } from '@/lib/authSecurity';
import { trackEvent } from '@/lib/analytics';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  continueAsGuest: () => void;
  signIn: (username: string, password: string) => Promise<{
    error: Error | null;
    user?: User | null;
    session?: Session | null;
    email?: string;
    code?: 'username_not_found' | 'profile_email_missing' | 'profile_missing' | 'invalid_credentials' | 'auth_error';
  }>;
  signUp: (username: string, password: string, email: string, age: string, gender?: string, securityQuestion?: string, securityAnswer?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function cleanObject<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function getStoredGuestMode() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage?.getItem('sfm_guest_mode') === 'true';
  } catch {
    return false;
  }
}

function setStoredGuestMode() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem('sfm_guest_mode', 'true');
    window.localStorage?.setItem('sfm_guest_started_at', new Date().toISOString());
  } catch {
    // Some embedded or privacy-restricted browsers can block localStorage.
  }
}

function clearStoredGuestMode() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.removeItem('sfm_guest_mode');
    window.localStorage?.removeItem('sfm_guest_started_at');
  } catch {
    // Keep auth state usable even when localStorage is unavailable.
  }
}

function isConfirmedAuthEmail(user: User | null) {
  return Boolean(user?.email && (user.email_confirmed_at || user.confirmed_at));
}

function syncAuthCookies(nextSession: Session | null, guestMode: boolean) {
  if (typeof document === 'undefined') return;
  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `sfm_auth=${nextSession ? 'true' : ''}; path=/; max-age=${nextSession ? 60 * 60 * 24 * 30 : 0}; SameSite=Lax`;
  document.cookie = `sfm_access_token=${nextSession?.access_token ?? ''}; path=/; max-age=${nextSession?.access_token ? 60 * 60 * 24 * 7 : 0}; SameSite=Lax${secureFlag}`;
  document.cookie = `sfm_guest=${guestMode ? 'true' : ''}; path=/; max-age=${guestMode ? 60 * 60 * 24 : 0}; SameSite=Lax`;
}

function normalizeLoginEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const guestMode = getStoredGuestMode();
        if (data.session) clearStoredGuestMode();
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setIsGuest(!data.session && guestMode);
        syncAuthCookies(data.session, !data.session && guestMode);
      })
      .catch(error => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[auth] failed to load initial session', {
            message: error instanceof Error ? error.message : String(error),
          });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.debug('[auth] auth state changed', { event, userId: nextSession?.user?.id ?? null, hasSession: Boolean(nextSession) });
      if (nextSession) clearStoredGuestMode();
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      const guestMode = getStoredGuestMode();
      setIsGuest(!nextSession && guestMode);
      syncAuthCookies(nextSession, !nextSession && guestMode);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    isGuest,
    continueAsGuest: () => {
      setStoredGuestMode();
      syncAuthCookies(null, true);
      setSession(null);
      setUser(null);
      setIsGuest(true);
    },
    signIn: async (username: string, password: string) => {
      try {
        console.debug('[auth] login started');
        if (supabaseConfigError) return { error: new Error(supabaseConfigError) };
        const identifier = username.trim();
        const identifierIsEmail = identifier.includes('@');
        const normalizedUsername = normalizeUsername(identifier);
        let email = identifierIsEmail ? normalizeLoginEmail(identifier) : '';
        if (!identifierIsEmail) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, email')
            .ilike('username', normalizedUsername)
            .maybeSingle();

          if (profile) {
            if (!profile.email || !isEmail(profile.email)) {
              return { error: new Error('Profile email missing'), code: 'profile_email_missing' };
            }
            email = normalizeLoginEmail(profile.email);
          } else {
            try {
              const response = await fetch('/api/auth/resolve-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: normalizedUsername }),
              });
              if (!response.ok) {
                return { error: new Error('Username lookup failed'), code: 'auth_error' };
              }
              const resolved = await response.json() as { success?: boolean; exists?: boolean; email?: string };
              if (!resolved.success) {
                return { error: new Error('Username lookup failed'), code: 'auth_error' };
              }
              if (!resolved.exists) {
                return { error: new Error('Username not found'), code: 'username_not_found' };
              }
              if (!resolved.email || !isEmail(resolved.email)) {
                return { error: new Error('Profile email missing'), code: 'profile_email_missing' };
              }
              email = normalizeLoginEmail(resolved.email);
            } catch {
              return { error: new Error('Username lookup failed'), code: 'auth_error' };
            }
          }
        }

        if (!email) {
          return { error: new Error('Username not found'), code: 'username_not_found' };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('[auth] login error', error);
          if (error.message === 'Email not confirmed') {
            return { error: new Error('الحساب جاهز الآن. أعد الضغط على تسجيل الدخول.') };
          }
          const invalidCredentials = /invalid login credentials/i.test(error.message);
          const code = invalidCredentials ? 'invalid_credentials' : 'auth_error';
          return { error: new Error(error.message), code };
        }
        const currentSession = data.session ?? (await supabase.auth.getSession()).data.session;
        if (!currentSession?.access_token) {
          return { error: new Error('Session missing'), code: 'auth_error' };
        }
        const signedInSession = currentSession;
        const signedInUser = data.user ?? signedInSession?.user ?? null;
        if (!signedInUser?.id) return { error: new Error('Profile missing'), code: 'profile_missing' };

        const { data: profileAfterLogin, error: profileAfterLoginError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('id', signedInUser.id)
          .maybeSingle();

        if (profileAfterLoginError) return { error: new Error(profileAfterLoginError.message), code: 'auth_error' };
        if (!profileAfterLogin) return { error: new Error('Profile missing'), code: 'profile_missing' };

        const confirmedEmail = isConfirmedAuthEmail(signedInUser) ? signedInUser.email?.trim().toLowerCase() : null;
        const profileEmail = profileAfterLogin.email?.trim().toLowerCase() || null;
        if (confirmedEmail && profileEmail !== confirmedEmail) {
          await supabase
            .from('profiles')
            .update({ email: confirmedEmail })
            .eq('id', signedInUser.id);
        }

        clearStoredGuestMode();
        syncAuthCookies(signedInSession, false);
        setSession(signedInSession);
        setUser(signedInUser);
        setIsGuest(false);
        void trackEvent('login', { module: 'auth', metadata: { method: identifierIsEmail ? 'email' : 'username' } });
        console.debug('[auth] login success', { userId: signedInUser.id, hasSession: Boolean(signedInSession) });
        console.debug('[auth] session returned', { hasAccessToken: Boolean(signedInSession?.access_token), expiresAt: signedInSession?.expires_at ?? null });
        return { error: null, session: signedInSession, user: signedInUser, email };
      } catch (err: any) {
        console.error('[auth] login error', err);
        return { error: new Error(err.message || 'فشل الاتصال بالخادم') };
      }
    },
    signUp: async (username: string, password: string, email: string, age: string, gender?: string, securityQuestion?: string, securityAnswer?: string) => {
      const cleanUsername = username.trim().toLowerCase();
      try {
        if (supabaseConfigError) return { error: new Error(supabaseConfigError) };
        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();
        if (!isEmail(cleanEmail)) return { error: new Error('Invalid email format') };
        if (cleanPassword.length < 6) return { error: new Error('Password must be at least 6 characters') };

        const { data: signUpData, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
            data: {
              username: cleanUsername,
              display_name: username.trim(),
              email: cleanEmail,
              age: parseInt(age, 10) || null,
              gender: gender || null,
            },
          },
        });

        if (error) {
          const lowerMessage = error.message.toLowerCase();
          const friendlyPasswordError =
            lowerMessage.includes('password should contain') ||
            lowerMessage.includes('password must contain') ||
            lowerMessage.includes('password should be') ||
            lowerMessage.includes('password must be');
          return { error: new Error(friendlyPasswordError ? 'Password must be at least 6 characters' : error.message) };
        }

        const user = signUpData.user ?? (await supabase.auth.getUser()).data.user;
        if (user && signUpData.session) {
          const cleanSecurityQuestion = securityQuestion?.trim() || '';
          const cleanSecurityAnswer = securityAnswer?.trim() || '';
          const shouldSaveSecurityQuestion = Boolean(cleanSecurityQuestion && cleanSecurityAnswer);
          const profilePayload = cleanObject({
            id: user.id,
            username: cleanUsername,
            display_name: username.trim(),
            email: cleanEmail,
            age: parseInt(age, 10) || null,
            gender: gender || null,
            preferred_lang: 'ar',
            language: 'ar',
            preferred_currency: 'KWD',
            default_currency: 'KWD',
            currency: 'KWD',
            preferred_theme: 'light',
            theme: 'light',
            view_mode: 'simple',
            onboarding_completed: false,
            security_question_2: shouldSaveSecurityQuestion ? cleanSecurityQuestion : null,
            security_answer_2: shouldSaveSecurityQuestion ? cleanSecurityAnswer : null,
            updated_at: new Date().toISOString(),
          });
          const { error: profileError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
          if (profileError) {
            console.error('[Signup] Profile creation failed', {
              code: profileError.code,
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint,
              payload: profilePayload,
            });
            return { error: new Error('Account created, but we could not save your profile details. Please try again.') };
          }
        }

        void trackEvent('account_created', { page_path: '/login', module: 'auth', section_name: 'auth', metadata: { method: 'email' } });
        return { error: null };
      } catch (err: any) {
        return { error: new Error(err.message || 'فشل الاتصال بالخادم') };
      }
    },
    signOut: async () => {
      void trackEvent('logout', { module: 'auth' });
      await supabase.auth.signOut();
      clearStoredGuestMode();
      syncAuthCookies(null, false);
      setSession(null);
      setUser(null);
      setIsGuest(false);
    },
  }), [isGuest, loading, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
