'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (username: string, password: string, email: string, age: string, gender?: string, securityQuestion?: string, securityAnswer?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@smart-finance.local`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    signIn: async (username: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      });

      if (error?.message === 'Email not confirmed') {
        return { error: new Error('الحساب جاهز الآن. أعد الضغط على تسجيل الدخول.') };
      }

      return { error: error as Error | null };
    },
    signUp: async (username: string, password: string, email: string, age: string, gender?: string, securityQuestion?: string, securityAnswer?: string) => {
      const cleanUsername = username.trim().toLowerCase();
      const { error } = await supabase.auth.signUp({
        email: usernameToEmail(cleanUsername),
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          data: {
            username: cleanUsername,
            display_name: username.trim(),
            email,
            age: parseInt(age, 10) || null,
            gender: gender || null,
            security_question: securityQuestion || null,
            security_answer: securityAnswer || null,
          },
        },
      });

      if (!error) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: (await supabase.auth.getUser()).data.user?.id,
          username: cleanUsername,
          display_name: username.trim(),
          email,
          age: parseInt(age, 10) || null,
          gender: gender || null,
          security_question: securityQuestion || null,
          security_answer: securityAnswer || null,
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }

      return { error: error as Error | null };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  }), [loading, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
