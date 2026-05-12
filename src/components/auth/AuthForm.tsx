'use client';

import { useState } from 'react';
import { Calculator, Lock, UserPlus, KeyRound, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function AuthForm() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');

  const isRegister = mode === 'register';

  const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@smart-finance.local`;

  const handleForgotPassword = async () => {
    if (!username.trim()) {
      setError('أدخل اسم المستخدم أولاً');
      return;
    }
    setLoading(true);
    setError('');

    // البحث عن البريد الإلكتروني الحقيقي المرتبط بحساب المستخدم
    const { data: profileData } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', username.trim().toLowerCase())
      .maybeSingle();

    if (!profileData || !profileData.email) {
      setError('لا يوجد بريد إلكتروني مسجل لهذا الحساب. تواصل مع الدعم.');
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(profileData.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (resetError) {
      setError('حدث خطأ، حاول مرة أخرى');
    } else {
      setForgotPasswordSuccess(`تم إرسال رابط إعادة تعيين كلمة المرور إلى: ${profileData.email}`);
    }
    setLoading(false);
  };

  const validateEmail = (email: string) => {
    return email.includes('@');
  };

  const validateAge = (age: string) => {
    const ageNum = parseInt(age, 10);
    return !isNaN(ageNum) && ageNum >= 10 && ageNum <= 120;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (username.trim().length < 3) {
      setError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (isRegister) {
      if (!email.trim()) {
        setError('البريد الإلكتروني مطلوب');
        return;
      }
      if (!validateEmail(email)) {
        setError('البريد الإلكتروني يجب أن يحتوي على @');
        return;
      }
      if (!age.trim()) {
        setError('العمر مطلوب');
        return;
      }
      if (!validateAge(age)) {
        setError('العمر يجب أن يكون بين 10 و 120');
        return;
      }
      if (password !== confirmPassword) {
        setError('كلمة المرور وتأكيدها غير متطابقين');
        return;
      }
    }

    setLoading(true);
    const result = isRegister ? await signUp(username, password, email, age) : await signIn(username, password);
    if (result.error) setError(result.error.message || 'تعذر تنفيذ العملية');
    setLoading(false);
  };

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#f7faf7_0%,_#eef6ef_42%,_#dfeee7_100%)] px-4 py-10 dark:bg-[linear-gradient(135deg,_#07110d_0%,_#0d1d16_48%,_#111827_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(120deg,rgba(0,96,72,0.10)_0,rgba(0,96,72,0.10)_1px,transparent_1px,transparent_42px),linear-gradient(160deg,rgba(187,151,82,0.12)_0,rgba(187,151,82,0.12)_1px,transparent_1px,transparent_68px)] dark:opacity-20" />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full items-center gap-8 md:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-5 text-center md:text-start">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-900/20">
              <Calculator className="h-8 w-8" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100 md:text-5xl">
                المدير المالي الذكي
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-700 dark:text-slate-300">
                سجّل دخولك لإدارة أنواع دخلك الشهري ثم احصل على توزيع واضح للمصروفات والمدخرات والاستثمار.
              </p>
            </div>
          </section>

          <Card className="border-emerald-900/10 bg-white/85 shadow-[0_24px_80px_rgba(0,66,54,0.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-2xl text-emerald-900 dark:text-emerald-100">
                {isRegister ? <UserPlus className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                {isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
              </CardTitle>
              <CardDescription>
                {isRegister ? 'إن لم يكن لديك حساب، املأ البيانات التالية للبدء.' : 'أدخل اسم المستخدم وكلمة المرور للمتابعة.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}
                {forgotPasswordSuccess && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{forgotPasswordSuccess}</div>}
                <div className="space-y-2">
                  <Label htmlFor="username">اسم المستخدم</Label>
                  <Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="مثال: ahmad" dir="ltr" autoComplete="username" />
                </div>
                {!showForgotPassword ? (
                <>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} dir="ltr" autoComplete={isRegister ? 'new-password' : 'current-password'} />
                </div>
                {!isRegister && (
                  <Button type="button" variant="link" className="p-0 h-auto text-emerald-600 hover:text-emerald-700 text-sm" onClick={() => { setShowForgotPassword(true); setError(''); setForgotPasswordSuccess(''); }}>
                    <KeyRound className="h-4 w-4 ms-1" />
                    نسيت كلمة المرور؟
                  </Button>
                )}
                </>
                ) : null}
                {isRegister && !showForgotPassword && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                      <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} dir="ltr" autoComplete="new-password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@domain.com" dir="ltr" autoComplete="email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">العمر</Label>
                      <Input id="age" type="number" value={age} onChange={(event) => setAge(event.target.value)} placeholder="مثال: 25" dir="ltr" min="10" max="120" />
                    </div>
                  </>
                )}
                <Button type="submit" className="h-12 w-full bg-emerald-700 text-base hover:bg-emerald-800" disabled={loading}>
                  {loading ? 'جار المعالجة...' : isRegister ? 'إنشاء الحساب' : 'تسجيل الدخول'}
                </Button>
                {!showForgotPassword && (
                  <Button type="button" variant="ghost" className="w-full" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}>
                    {isRegister ? 'لديك حساب؟ سجّل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
                  </Button>
                )}
              </form>
              {showForgotPassword && (
                <div className="mt-4 space-y-3">
                  <Button type="button" className="h-10 w-full bg-emerald-600 hover:bg-emerald-700 text-sm" disabled={loading} onClick={handleForgotPassword}>
                    {loading ? 'جار الإرسال...' : 'إرسال رابط إعادة التعيين'}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => { setShowForgotPassword(false); setForgotPasswordSuccess(''); }}>
                    العودة لتسجيل الدخول
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
