'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { isEmail } from '@/lib/authSecurity';
import { trackEvent } from '@/lib/analytics';
import { syncServerAuthSession } from '@/lib/auth/clientSession';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  continueAsGuest: () => boolean;
  signIn: (username: string, password: string) => Promise<{
    error: Error | null;
    user?: User | null;
    session?: Session | null;
    code?: 'invalid_credentials' | 'auth_unavailable' | 'rate_limited' | 'mfa_email_required' | 'mfa_totp_required';
    mfaType?: 'email' | 'totp';
  }>;
  signUp: (username: string, password: string, email: string, age: string, gender?: string, securityQuestion?: string, securityAnswer?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const GUEST_MODE_STORAGE_KEY = 'sfm_guest_mode';
const GUEST_STARTED_AT_STORAGE_KEY = 'sfm_guest_started_at';
const GUEST_COOKIE_NAME = 'sfm_guest';

function cleanObject<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function getStoredGuestMode() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage?.getItem(GUEST_MODE_STORAGE_KEY) === 'true') return true;
  } catch {
    // Fall back to the guest cookie when localStorage is unavailable.
  }
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split(';')
    .map(part => part.trim())
    .includes(`${GUEST_COOKIE_NAME}=true`);
}

function setStoredGuestMode() {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage?.setItem(GUEST_MODE_STORAGE_KEY, 'true');
    window.localStorage?.setItem(GUEST_STARTED_AT_STORAGE_KEY, new Date().toISOString());
    return window.localStorage?.getItem(GUEST_MODE_STORAGE_KEY) === 'true';
  } catch {
    // Some embedded or privacy-restricted browsers can block localStorage.
    return false;
  }
}

function clearStoredGuestMode() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.removeItem(GUEST_MODE_STORAGE_KEY);
    window.localStorage?.removeItem(GUEST_STARTED_AT_STORAGE_KEY);
  } catch {
    // Keep auth state usable even when localStorage is unavailable.
  }
}

function syncGuestCookie(guestMode: boolean) {
  if (typeof document === 'undefined') return false;
  try {
    document.cookie = `${GUEST_COOKIE_NAME}=${guestMode ? 'true' : ''}; path=/; max-age=${guestMode ? 60 * 60 * 24 : 0}; SameSite=Lax`;
    return guestMode ? getStoredGuestMode() : !getStoredGuestMode();
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        const guestMode = getStoredGuestMode();
        if (data.session) clearStoredGuestMode();
        const sync = await syncServerAuthSession(data.session);
        if (!mounted) return;
        if (data.session && !sync.ok && sync.code === 'UNAUTHORIZED') {
          await supabase.auth.signOut({ scope: 'local' });
          setSession(null);
          setUser(null);
          setIsGuest(guestMode);
          syncGuestCookie(guestMode);
          return;
        }
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setIsGuest(!data.session && guestMode);
        syncGuestCookie(!data.session && guestMode);
      })
      .catch(error => {
        if (mounted) {
          const guestMode = getStoredGuestMode();
          setSession(null);
          setUser(null);
          setIsGuest(guestMode);
          void syncServerAuthSession(null);
          syncGuestCookie(guestMode);
        }
        if (process.env.NODE_ENV === 'development') {
          console.warn('[auth] failed to load initial session', {
            message: error instanceof Error ? error.message : String(error),
          });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession) clearStoredGuestMode();
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      const guestMode = getStoredGuestMode();
      setIsGuest(!nextSession && guestMode);
      syncGuestCookie(!nextSession && guestMode);
      void syncServerAuthSession(nextSession);
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
      const stored = setStoredGuestMode();
      void syncServerAuthSession(null);
      const cookiesSynced = syncGuestCookie(true);
      if (!stored && !cookiesSynced) {
        throw new Error('Guest mode is unavailable in this browser.');
      }
      setSession(null);
      setUser(null);
      setIsGuest(true);
      return true;
    },
    signIn: async (username: string, password: string) => {
      try {
        if (supabaseConfigError) return { error: new Error(supabaseConfigError) };
        const identifier = username.trim();
        const currentSession = (await supabase.auth.getSession()).data.session;
        if (currentSession) {
          await supabase.auth.signOut({ scope: 'local' });
          await syncServerAuthSession(null);
        }

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password }),
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => null) as {
          ok?: boolean;
          code?: string;
          status?: 'AUTHENTICATED' | 'MFA_REQUIRED';
          mfaType?: 'email' | 'totp';
          accessToken?: string;
          refreshToken?: string;
        } | null;

        if (!response.ok || !payload?.ok) {
          const code = payload?.code === 'RATE_LIMITED'
            ? 'rate_limited'
            : payload?.code === 'INVALID_CREDENTIALS'
              ? 'invalid_credentials'
              : 'auth_unavailable';
          return { error: new Error(code), code };
        }

        if (payload.status === 'MFA_REQUIRED' && payload.mfaType === 'email') {
          setSession(null);
          setUser(null);
          setIsGuest(false);
          return { error: null, code: 'mfa_email_required', mfaType: 'email' };
        }
        if (!payload.accessToken || !payload.refreshToken) {
          return { error: new Error('auth_unavailable'), code: 'auth_unavailable' };
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: payload.accessToken,
          refresh_token: payload.refreshToken,
        });
        if (error || !data.session || !data.user) {
          await syncServerAuthSession(null);
          return { error: new Error('auth_unavailable'), code: 'auth_unavailable' };
        }
        const signedInSession = data.session;
        const signedInUser = data.user;

        clearStoredGuestMode();
        syncGuestCookie(false);
        if (payload.mfaType !== 'totp') await syncServerAuthSession(signedInSession);
        setSession(signedInSession);
        setUser(signedInUser);
        setIsGuest(false);
        void trackEvent('login', { module: 'auth', metadata: { method: identifier.includes('@') ? 'email' : 'username' } });
        return {
          error: null,
          session: signedInSession,
          user: signedInUser,
          code: payload.mfaType === 'totp' ? 'mfa_totp_required' : undefined,
          mfaType: payload.mfaType,
        };
      } catch (err: unknown) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[auth] login request failed', { message: err instanceof Error ? err.message : String(err) });
        }
        return { error: new Error('auth_unavailable'), code: 'auth_unavailable' };
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
            });
            return { error: new Error('Account created, but we could not save your profile details. Please try again.') };
          }
          await syncServerAuthSession(signUpData.session);
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
      syncGuestCookie(false);
      await syncServerAuthSession(null);
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
