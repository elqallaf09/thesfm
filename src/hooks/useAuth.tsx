'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  continueAsGuest: () => void;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (username: string, password: string, email: string, age: string, gender?: string, securityQuestion?: string, securityAnswer?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@smart-finance.local`;
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const syncCookies = (nextSession: Session | null, guestMode: boolean) => {
      if (typeof document === 'undefined') return;
      document.cookie = `sfm_auth=${nextSession ? 'true' : ''}; path=/; max-age=${nextSession ? 60 * 60 * 24 * 30 : 0}; SameSite=Lax`;
      document.cookie = `sfm_guest=${guestMode ? 'true' : ''}; path=/; max-age=${guestMode ? 60 * 60 * 24 : 0}; SameSite=Lax`;
    };

    supabase.auth.getSession().then(({ data }) => {
      const guestMode = typeof window !== 'undefined' && localStorage.getItem('sfm_guest_mode') === 'true';
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsGuest(!data.session && guestMode);
      syncCookies(data.session, !data.session && guestMode);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      const guestMode = typeof window !== 'undefined' && localStorage.getItem('sfm_guest_mode') === 'true';
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('sfm_guest_mode', 'true');
        localStorage.setItem('sfm_guest_started_at', new Date().toISOString());
      }
      if (typeof document !== 'undefined') {
        document.cookie = `sfm_guest=true; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        document.cookie = 'sfm_auth=; path=/; max-age=0; SameSite=Lax';
      }
      setSession(null);
      setUser(null);
      setIsGuest(true);
    },
    signIn: async (username: string, password: string) => {
      try {
        if (supabaseConfigError) return { error: new Error(supabaseConfigError) };
        const identifier = username.trim();
        const { error } = await supabase.auth.signInWithPassword({
          email: isEmail(identifier) ? identifier : usernameToEmail(identifier),
          password,
        });

        if (error) {
          if (error.message === 'Email not confirmed') {
            return { error: new Error('الحساب جاهز الآن. أعد الضغط على تسجيل الدخول.') };
          }
          return { error: new Error(error.message) };
        }
        if (typeof window !== 'undefined') localStorage.removeItem('sfm_guest_mode');
        if (typeof document !== 'undefined') {
          document.cookie = `sfm_auth=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
          document.cookie = 'sfm_guest=; path=/; max-age=0; SameSite=Lax';
        }
        setIsGuest(false);
        return { error: null };
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
              security_answer: securityAnswer || null,
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
            security_answer: securityAnswer || null,
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sfm_guest_mode');
        localStorage.removeItem('sfm_guest_started_at');
      }
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
