import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { accountSummary, activeSession, message, signIn as authenticate, signOut as logout, type Session } from './api';
import { onDataChanged } from './navigation';

export function useAccountSummary<T>() {
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const mounted = useRef(false);
  const busy = useRef(false);
  const loadSummary = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true); setError(null);
    try {
      const active = await activeSession();
      const body = await accountSummary<T>();
      if (!body?.ok || !body.summary) throw new Error('تعذر تحميل الملخص');
      if (mounted.current) { setSession(active); setSummary(body.summary); setLastUpdatedAt(new Date()); }
    } catch (reason) {
      if (mounted.current) setError(message(reason));
    } finally { busy.current = false; if (mounted.current) setLoading(false); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void activeSession().then(active => {
      if (mounted.current) { setSession(active); void loadSummary(); }
    }).catch(reason => {
      // Network failure must not erase a valid refresh token. Retry is available
      // on the landing screen; invalid credentials still require sign-in.
      if (mounted.current) { if (!(reason instanceof Error && reason.message === 'SESSION_EXPIRED')) setError(message(reason)); setLoading(false); }
    });
    return () => { mounted.current = false; };
  }, [loadSummary]);
  useEffect(() => onDataChanged(() => { if (session) void loadSummary(); }), [session, loadSummary]);
  const signIn = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError(null);
    try { await authenticate(email, password); if (mounted.current) setPassword(''); }
    catch (reason) { if (mounted.current) Alert.alert('تعذر تسجيل الدخول', message(reason)); }
    finally { busy.current = false; if (mounted.current) setLoading(false); }
  }, [email, password]);
  const signOut = useCallback(async () => {
    const revoked = await logout();
    if (!revoked) Alert.alert('تم تسجيل الخروج من التطبيق', 'تعذر تأكيد إلغاء الجلسة على الخادم. اتصل بالإنترنت وسجّل الدخول لإلغائها من جميع الأجهزة.');
  }, []);
  return { session, summary, loading, error, lastUpdatedAt, email, password, setEmail, setPassword, signIn, signOut, loadSummary };
}
