'use client';

import { useState } from 'react';
import { Calculator, Lock, UserPlus, KeyRound, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const SECURITY_QUESTIONS = [
  { id: 'pet_name', questionAr: 'ما اسم حيوانك الأليف؟', questionEn: 'What is your pet name?' },
  { id: 'school_name', questionAr: 'ما اسم مدرستك الأساسية؟', questionEn: 'What is your primary school name?' },
  { id: 'city_born', questionAr: 'في أي مدينة ولدت؟', questionEn: 'In which city were you born?' },
  { id: 'father_name', questionAr: 'ما اسم والدك الأول؟', questionEn: 'What is your father first name?' },
  { id: 'favorite_color', questionAr: 'ما هو لونك المفضل؟', questionEn: 'What is your favorite color?' },
];

export function AuthForm() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [resetStep, setResetStep] = useState<'username' | 'question' | 'reset'>('username');
  const [storedQuestion, setStoredQuestion] = useState('');
  const [resetUsername, setResetUsername] = useState('');

  const isRegister = mode === 'register';

  const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@smart-finance.local`;

  const handleForgotPassword = async () => {
    if (resetStep === 'username') {
      if (!resetUsername.trim()) {
        setError('أدخل اسم المستخدم أولاً');
        return;
      }
      setLoading(true);
      setError('');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, security_question')
        .eq('username', resetUsername.trim().toLowerCase())
        .maybeSingle();

      if (!profileData || !profileData.email) {
        setError('لا يوجد بريد إلكتروني مسجل لهذا الحساب. تواصل مع الدعم.');
        setLoading(false);
        return;
      }

      if (!profileData.security_question) {
        setError('هذا الحساب ليس لديه سؤال أمان. تواصل مع الدعم لإعادة تعيين كلمة المرور.');
        setLoading(false);
        return;
      }

      setStoredQuestion(profileData.security_question);
      setResetStep('question');
      setLoading(false);
      return;
    }

    if (resetStep === 'question') {
      if (!securityAnswer.trim()) {
        setError('أدخل إجابة سؤال الأمان');
        return;
      }
      setLoading(true);
      setError('');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('security_answer')
        .eq('username', resetUsername.trim().toLowerCase())
        .maybeSingle();

      if (!profileData || profileData.security_answer?.toLowerCase() !== securityAnswer.trim().toLowerCase()) {
        setError('إجابة سؤال الأمان غير صحيحة');
        setLoading(false);
        return;
      }

      setResetStep('reset');
      setLoading(false);
      return;
    }

    if (resetStep === 'reset') {
      if (password.length < 6) {
        setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
      }
      if (password !== confirmPassword) {
        setError('كلمة المرور وتأكيدها غير متطابقين');
        return;
      }
      setLoading(true);
      setError('');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', resetUsername.trim().toLowerCase())
        .maybeSingle();

      if (!profileData || !profileData.email) {
        setError('حدث خطأ، حاول مرة أخرى');
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profileData.email,
        password: securityAnswer,
      });

      if (signInError) {
        setError('حدث خطأ في التحقق، حاول مرة أخرى');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError('حدث خطأ في تحديث كلمة المرور');
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
      setForgotPasswordSuccess('تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.');
      setResetStep('username');
      setShowForgotPassword(false);
      setLoading(false);
    }
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
      if (!gender) {
        setError('الجنس مطلوب');
        return;
      }
      if (!securityQuestion) {
        setError('سؤال الأمان مطلوب');
        return;
      }
      if (!securityAnswer.trim()) {
        setError('إجابة سؤال الأمان مطلوبة');
        return;
      }
      if (password !== confirmPassword) {
        setError('كلمة المرور وتأكيدها غير متطابقين');
        return;
      }
    }

    setLoading(true);

    if (!isRegister) {
      const loginIdentifier = username.trim();
      const isEmail = loginIdentifier.includes('@');

      if (isEmail) {
        const { error } = await supabase.auth.signInWithPassword({
          email: loginIdentifier,
          password,
        });
        if (error) {
          setError(error.message || 'تعذر تنفيذ العملية');
          setLoading(false);
          return;
        }
      } else {
        const { error } = await signIn(loginIdentifier, password);
        if (error) setError(error.message || 'تعذر تنفيذ العملية');
        setLoading(false);
        return;
      }
    } else {
      const result = await signUp(username, password, email, age, gender, securityQuestion, securityAnswer);
      if (result.error) setError(result.error.message || 'تعذر تنفيذ العملية');
    }
    setLoading(false);
  };

  const getSecurityQuestionText = (questionId: string, isArabic: boolean) => {
    const q = SECURITY_QUESTIONS.find(sq => sq.id === questionId);
    return q ? (isArabic ? q.questionAr : q.questionEn) : '';
  };

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#f7faf7_0%,_#eef6ef_42%,_#dfeee7_100%)] px-4 py-10 dark:bg-[linear-gradient(135deg,_#07110d_0%,_#0d1d16_48%,_#111827_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(120deg,rgba(0,96,72,0.10)_0,rgba(0,96,72,0.10)_1px,transparent_1px,transparent_42px),linear-gradient(160deg,rgba(187,151,82,0.12)_0,rgba(187,151,82,0.12)_1px,transparent_1px,transparent_68px)] dark:opacity-20" />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full items-center gap-8 md:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-5 text-center md:text-start">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden shadow-lg shadow-emerald-900/20">
              <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=100&h=100&fit=crop" alt="Calculator" className="w-full h-full object-cover" />
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
                {isRegister ? 'إنشاء حساب جديد' : showForgotPassword ? 'استعادة كلمة المرور' : 'تسجيل الدخول'}
              </CardTitle>
              <CardDescription>
                {isRegister ? 'إن لم يكن لديك حساب، املأ البيانات التالية للبدء.' : showForgotPassword ? '' : 'أدخل اسم المستخدم أو البريد الإلكتروني وكلمة المرور للمتابعة.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}
                {forgotPasswordSuccess && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{forgotPasswordSuccess}</div>}

                {!showForgotPassword ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="username">{isRegister ? 'اسم المستخدم' : 'اسم المستخدم أو البريد الإلكتروني'}</Label>
                      <Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={isRegister ? "مثال: ahmad" : "مثال: ahmad أو ahmad@email.com"} dir="ltr" autoComplete="username" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">{isRegister ? 'كلمة المرور' : 'كلمة المرور'}</Label>
                      <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} dir="ltr" autoComplete={isRegister ? 'new-password' : 'current-password'} />
                    </div>
                    {!isRegister && (
                      <Button type="button" variant="link" className="p-0 h-auto text-emerald-600 hover:text-emerald-700 text-sm" onClick={() => { setShowForgotPassword(true); setError(''); setForgotPasswordSuccess(''); setResetStep('username'); }}>
                        <KeyRound className="h-4 w-4 ms-1" />
                        نسيت كلمة المرور؟
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {resetStep === 'username' && (
                      <div className="space-y-2">
                        <Label htmlFor="reset-username">اسم المستخدم</Label>
                        <Input id="reset-username" value={resetUsername} onChange={(e) => setResetUsername(e.target.value)} placeholder="مثال: ahmad" dir="ltr" autoComplete="username" />
                      </div>
                    )}
                    {resetStep === 'question' && (
                      <div className="space-y-4">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <p className="text-sm font-medium">{getSecurityQuestionText(storedQuestion, true)}</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="security-answer">إجابة سؤال الأمان</Label>
                          <Input id="security-answer" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} dir="rtl" />
                        </div>
                      </div>
                    )}
                    {resetStep === 'reset' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                          <Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} dir="ltr" autoComplete="new-password" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                          <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} dir="ltr" autoComplete="new-password" />
                        </div>
                      </div>
                    )}
                  </>
                )}

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
                    <div className="space-y-2">
                      <Label>الجنس</Label>
                      <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="male" id="male" />
                          <Label htmlFor="male" className="cursor-pointer">ذكر</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="female" id="female" />
                          <Label htmlFor="female" className="cursor-pointer">أنثى</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label>سؤال الأمان</Label>
                      <Select value={securityQuestion} onValueChange={setSecurityQuestion}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر سؤالاً للأمان" />
                        </SelectTrigger>
                        <SelectContent>
                          {SECURITY_QUESTIONS.map((q) => (
                            <SelectItem key={q.id} value={q.id}>{q.questionAr}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="security-answer">إجابة سؤال الأمان</Label>
                      <Input id="security-answer" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder="أدخل إجابتك" />
                    </div>
                  </>
                )}

                <Button type="submit" className="h-12 w-full bg-emerald-700 text-base hover:bg-emerald-800" disabled={loading}>
                  {loading ? 'جار المعالجة...' : isRegister ? 'إنشاء الحساب' : showForgotPassword ? (resetStep === 'username' ? 'التالي' : resetStep === 'question' ? 'التحقق' : 'تغيير كلمة المرور') : 'تسجيل الدخول'}
                </Button>

                {!showForgotPassword && (
                  <Button type="button" variant="ghost" className="w-full" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}>
                    {isRegister ? 'لديك حساب؟ سجّل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
                  </Button>
                )}
              </form>
              {showForgotPassword && (
                <div className="mt-4 space-y-3">
                  <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => { setShowForgotPassword(false); setForgotPasswordSuccess(''); setResetStep('username'); }}>
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
