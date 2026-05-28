'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { hashSecurityAnswer, isEmail } from '@/lib/authSecurity';

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
    const syncCookies = (nextSession: Session | null, guestMode: boolean) => {
      if (typeof document === 'undefined') return;
      const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `sfm_auth=${nextSession ? 'true' : ''}; path=/; max-age=${nextSession ? 60 * 60 * 24 * 30 : 0}; SameSite=Lax`;
      document.cookie = `sfm_access_token=${nextSession?.access_token ?? ''}; path=/; max-age=${nextSession?.access_token ? 60 * 60 * 24 * 7 : 0}; SameSite=Lax${secureFlag}`;
      document.cookie = `sfm_guest=${guestMode ? 'true' : ''}; path=/; max-age=${guestMode ? 60 * 60 * 24 : 0}; SameSite=Lax`;
    };

    supabase.auth.getSession().then(({ data }) => {
      const guestMode = getStoredGuestMode();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsGuest(!data.session && guestMode);
      syncCookies(data.session, !data.session && guestMode);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      const guestMode = getStoredGuestMode();
      setIsGuest(!nextSession && guestMode);
      syncCookies(nextSession, !nextSession && guestMode);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    isGuest,
    continueAsGuest: () => {
      setStoredGuestMode();
      if (typeof document !== 'undefined') {
        document.cookie = `sfm_guest=true; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        document.cookie = 'sfm_auth=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'sfm_access_token=; path=/; max-age=0; SameSite=Lax';
      }
      setSession(null);
      setUser(null);
      setIsGuest(true);
    },
    signIn: async (username: string, password: string) => {
      try {
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
          if (error.message === 'Email not confirmed') {
            return { error: new Error('الحساب جاهز الآن. أعد الضغط على تسجيل الدخول.') };
          }
          const invalidCredentials = /invalid login credentials/i.test(error.message);
          const code = invalidCredentials ? 'invalid_credentials' : 'auth_error';
          return { error: new Error(error.message), code };
        }
        const signedInSession = data.session;
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
        if (typeof document !== 'undefined') {
          document.cookie = `sfm_auth=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
          document.cookie = 'sfm_guest=; path=/; max-age=0; SameSite=Lax';
        }
        setSession(signedInSession);
        setUser(signedInUser);
        setIsGuest(false);
        return { error: null, session: signedInSession, user: signedInUser, email };
      } catch (err: any) {
        return { error: new Error(err.message || 'فشل الاتصال بالخادم') };
      }
    },
    signUp: async (username: string, password: string, email: string, age: string, gender?: string, securityQuestion?: string, securityAnswer?: string) => {
      const cleanUsername = username.trim().toLowerCase();
      try {
        if (supabaseConfigError) return { error: new Error(supabaseConfigError) };
        const cleanEmail = email.trim().toLowerCase();
        if (!isEmail(cleanEmail)) return { error: new Error('Invalid email format') };
        if (password.length < 6) return { error: new Error('Password must be at least 6 characters') };

        const answerHash = securityQuestion && securityAnswer
          ? await hashSecurityAnswer(securityAnswer, cleanEmail)
          : null;

        const { data: signUpData, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
            data: {
              username: cleanUsername,
              display_name: username.trim(),
              email: cleanEmail,
              age: parseInt(age, 10) || null,
              gender: gender || null,
              security_question: securityQuestion || null,
              security_answer_hash: answerHash,
            },
          },
        });

        if (error) {
          return { error: new Error(error.message) };
        }

        const user = signUpData.user ?? (await supabase.auth.getUser()).data.user;
        if (user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: user.id,
            username: cleanUsername,
            display_name: username.trim(),
            email: cleanEmail,
            age: parseInt(age, 10) || null,
            gender: gender || null,
            security_question: securityQuestion || null,
            security_answer: null,
            security_answer_hash: answerHash,
          }, { onConflict: 'id' }).select().single();
          if (profileError) return { error: new Error(profileError.message) };
        }

        return { error: null };
      } catch (err: any) {
        return { error: new Error(err.message || 'فشل الاتصال بالخادم') };
      }
    },
    signOut: async () => {
      await supabase.auth.signOut();
      clearStoredGuestMode();
      if (typeof document !== 'undefined') {
        document.cookie = 'sfm_auth=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'sfm_guest=; path=/; max-age=0; SameSite=Lax';
      }
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
