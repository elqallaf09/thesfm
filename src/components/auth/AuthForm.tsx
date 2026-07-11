'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { hashSecurityAnswer } from '@/lib/authSecurity';
import { normalizeDigits } from '@/lib/locale';

const SECURITY_QUESTIONS = [
  { id: 'pet_name', questionAr: 'ما اسم حيوانك الأليف؟', questionEn: 'What is your pet name?', questionFr: "Comment s'appelle votre animal de compagnie?" },
  { id: 'school_name', questionAr: 'ما اسم مدرستك الابتدائية؟', questionEn: 'What is your primary school name?', questionFr: "Quel est le nom de votre école primaire?" },
  { id: 'city_born', questionAr: 'في أي مدينة ولدت؟', questionEn: 'In which city were you born?', questionFr: "Dans quelle ville êtes-vous né?" },
  { id: 'father_name', questionAr: 'ما اسم والدك؟', questionEn: "What is your father's name?", questionFr: "Quel est le nom de votre père?" },
  { id: 'mother_name', questionAr: 'ما اسم والدتك؟', questionEn: "What is your mother's name?", questionFr: "Quel est le nom de votre mère?" },
  { id: 'favorite_color', questionAr: 'ما هو لونك المفضل؟', questionEn: 'What is your favorite color?', questionFr: 'Quelle est votre couleur préférée?' },
  { id: 'childhood_friend', questionAr: 'ما اسم صديق طفولتك؟', questionEn: 'What is your childhood friend name?', questionFr: "Quel est le nom de votre ami d'enfance?" },
  { id: 'first_car', questionAr: 'ما نوع أول سيارة امتلكتها؟', questionEn: 'What was your first car?', questionFr: 'Quelle était votre première voiture?' },
  { id: 'favorite_food', questionAr: 'ما هو طعامك المفضل؟', questionEn: 'What is your favorite food?', questionFr: 'Quel est votre plat préféré?' },
];

const FINANCIAL_WISDOM_TIPS = [
  { titleAr: 'ادفع لنفسك أولاً', contentAr: 'ادخر جزءاً من دخلك قبل أي مصروف.', titleEn: 'Pay yourself first', contentEn: 'Save part of your income before spending.', titleFr: "Payez-vous d'abord", contentFr: 'Épargnez une partie de votre revenu avant de dépenser.' },
  { titleAr: 'السلوك أهم من الذكاء', contentAr: 'الصبر والاستمرار يصنعان الفرق المالي.', titleEn: 'Behavior beats intelligence', contentEn: 'Patience and consistency create financial progress.', titleFr: 'Le comportement compte plus', contentFr: 'La patience et la constance créent le progrès financier.' },
  { titleAr: 'تجنب ديون الكماليات', contentAr: 'كل قسط يقلل حريتك المستقبلية.', titleEn: 'Avoid lifestyle debt', contentEn: 'Every installment reduces your future freedom.', titleFr: 'Évitez les dettes de luxe', contentFr: 'Chaque mensualité réduit votre liberté future.' },
  { titleAr: 'استثمر باستمرار', contentAr: 'المبالغ الصغيرة تكبر مع الوقت.', titleEn: 'Invest consistently', contentEn: 'Small amounts can grow over time.', titleFr: 'Investissez régulièrement', contentFr: 'Les petits montants grandissent avec le temps.' },
  { titleAr: 'اصنع صندوق طوارئ', contentAr: 'احتفظ بمبلغ يحميك وقت الأزمات.', titleEn: 'Build an emergency fund', contentEn: 'Keep money that protects you in crises.', titleFr: "Créez un fonds d'urgence", contentFr: 'Gardez une somme qui vous protège en cas de crise.' },
  { titleAr: 'راقب مصروفاتك', contentAr: 'ما لا تقيسه يصعب تحسينه.', titleEn: 'Track your expenses', contentEn: 'What you do not measure is hard to improve.', titleFr: 'Suivez vos dépenses', contentFr: "Ce que vous ne mesurez pas est difficile à améliorer." },
];

export function AuthForm() {
  const { signIn, signUp, continueAsGuest } = useAuth();
  const router = useRouter();
  const [language, setLanguage] = useState<'ar' | 'en' | 'fr'>('ar');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [securityQuestion2, setSecurityQuestion2] = useState('');
  const [securityAnswer2, setSecurityAnswer2] = useState('');
  const [securityQuestion3, setSecurityQuestion3] = useState('');
  const [securityAnswer3, setSecurityAnswer3] = useState('');
  const [resetStep, setResetStep] = useState<'username' | 'question' | 'reset'>('username');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [storedQuestion, setStoredQuestion] = useState('');
  const [resetUsername, setResetUsername] = useState('');

  const isRegister = mode === 'register';
  const isArabic = language === 'ar';
  const isFrench = language === 'fr';

  const t = {
    title: isArabic ? 'المدير المالي الذكي' : isFrench ? 'Gestionnaire Financier' : 'Smart Financial Manager',
    subtitle: isArabic ? 'سجّل دخولك لإدارة أنواع دخلك الشهري وتوزيعها بذكاء.' : isFrench ? "Connectez-vous pour gérer vos revenus mensuels intelligemment." : 'Sign in to manage your monthly income and distributions.',
    createAccount: isArabic ? 'إنشاء حساب جديد' : isFrench ? 'Créer un compte' : 'Create account',
    login: isArabic ? 'تسجيل الدخول' : isFrench ? 'Connexion' : 'Sign in',
    forgotPassword: isArabic ? 'استعادة كلمة المرور' : isFrench ? 'Récupérer le mot de passe' : 'Recover password',
    username: isArabic ? 'اسم المستخدم' : isFrench ? "Nom d'utilisateur" : 'Username',
    usernameOrEmail: isArabic ? 'اسم المستخدم أو البريد الإلكتروني' : isFrench ? "Nom d'utilisateur ou email" : 'Username or email',
    password: isArabic ? 'كلمة المرور' : isFrench ? 'Mot de passe' : 'Password',
    confirmPassword: isArabic ? 'تأكيد كلمة المرور' : isFrench ? 'Confirmer le mot de passe' : 'Confirm password',
    email: isArabic ? 'البريد الإلكتروني' : isFrench ? 'Email' : 'Email',
    age: isArabic ? 'العمر' : isFrench ? 'Âge' : 'Age',
    gender: isArabic ? 'الجنس' : isFrench ? 'Genre' : 'Gender',
    male: isArabic ? 'ذكر' : isFrench ? 'Homme' : 'Male',
    female: isArabic ? 'أنثى' : isFrench ? 'Femme' : 'Female',
    securityQuestion: isArabic ? 'سؤال الأمان' : isFrench ? 'Question de sécurité' : 'Security question',
    securityAnswer: isArabic ? 'إجابة سؤال الأمان' : isFrench ? 'Réponse de sécurité' : 'Security answer',
    next: isArabic ? 'التالي' : isFrench ? 'Suivant' : 'Next',
    verify: isArabic ? 'التحقق' : isFrench ? 'Vérifier' : 'Verify',
    changePassword: isArabic ? 'تغيير كلمة المرور' : isFrench ? 'Changer le mot de passe' : 'Change password',
    createBtn: isArabic ? 'إنشاء الحساب' : isFrench ? 'Créer le compte' : 'Create account',
    loginBtn: isArabic ? 'تسجيل الدخول' : isFrench ? 'Se connecter' : 'Sign in',
    haveAccount: isArabic ? 'لديك حساب؟' : isFrench ? 'Vous avez un compte?' : 'Have an account?',
    noAccount: isArabic ? 'ليس لديك حساب؟' : isFrench ? "Vous n'avez pas de compte?" : "Don't have an account?",
    createNew: isArabic ? 'إنشاء حساب جديد' : isFrench ? 'Créer un compte' : 'Create new account',
    back: isArabic ? 'العودة لتسجيل الدخول' : isFrench ? 'Retour à la connexion' : 'Back to login',
    selectQuestion: isArabic ? 'اختر سؤالاً للأمان' : isFrench ? 'Choisir une question' : 'Select a security question',
    processing: isArabic ? 'جار المعالجة...' : isFrench ? 'Traitement...' : 'Processing...',
    enterUsername: isArabic ? 'مثال: ahmad' : isFrench ? 'Exemple: jean' : 'Example: john',
    enterUsernameOrEmail: isArabic ? 'مثال: ahmad أو ahmad@email.com' : isFrench ? 'Exemple: jean ou jean@email.com' : 'Example: john or john@email.com',
    newPassword: isArabic ? 'كلمة المرور الجديدة' : isFrench ? 'Nouveau mot de passe' : 'New password',
    passwordMinLength: isArabic ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : isFrench ? 'Le mot de passe doit contenir au moins 6 caractères' : 'Password must be at least 6 characters',
    passwordMismatch: isArabic ? 'كلمة المرور وتأكيدها غير متطابقين' : isFrench ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match',
    usernameMinLength: isArabic ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' : isFrench ? "Le nom d'utilisateur doit contenir au moins 3 caractères" : 'Username must be at least 3 characters',
    emailRequired: isArabic ? 'البريد الإلكتروني مطلوب' : isFrench ? 'Email requis' : 'Email is required',
    invalidEmail: isArabic ? 'البريد الإلكتروني يجب أن يحتوي على @' : isFrench ? "L'email doit contenir @" : 'Email must contain @',
    ageRequired: isArabic ? 'العمر مطلوب' : isFrench ? 'Âge requis' : 'Age is required',
    invalidAge: isArabic ? 'العمر يجب أن يكون بين 10 و 120' : isFrench ? "L'âge doit être entre 10 et 120" : 'Age must be between 10 and 120',
    genderRequired: isArabic ? 'الجنس مطلوب' : isFrench ? 'Genre requis' : 'Gender is required',
    securityQuestionRequired: isArabic ? 'سؤال الأمان مطلوب' : isFrench ? 'Question de sécurité requise' : 'Security question is required',
    securityAnswerRequired: isArabic ? 'إجابة سؤال الأمان مطلوبة' : isFrench ? 'Réponse de sécurité requise' : 'Security answer is required',
    operationFailed: isArabic ? 'حدث خطأ في الاتصال' : isFrench ? 'Erreur de connexion' : 'Connection error',
    guestLogin: isArabic ? 'الدخول بدون تسجيل (ضيف)' : isFrench ? 'Entrer sans inscription (invité)' : 'Continue as Guest',
    enterSecurityAnswer: isArabic ? 'أدخل إجابة سؤال الأمان' : isFrench ? 'Entrez la réponse de sécurité' : 'Enter security answer',
    wrongSecurityAnswer: isArabic ? 'إجابة سؤال الأمان غير صحيحة' : isFrench ? 'Réponse de sécurité incorrecte' : 'Wrong security answer',
    noEmailFound: isArabic ? 'لا يوجد بريد إلكتروني مسجل لهذا الحساب' : isFrench ? "Aucun email trouvé pour ce compte" : 'No email found for this account',
    noSecurityQuestion: isArabic ? 'هذا الحساب ليس لديه سؤال أمان' : isFrench ? "Ce compte n'a pas de question de sécurité" : 'This account has no security question',
    contactSupport: isArabic ? 'تواصل مع الدعم' : isFrench ? 'Contactez le support' : 'Contact support',
    enterUsernameFirst: isArabic ? 'أدخل اسم المستخدم أولاً' : isFrench ? "Entrez d'abord le nom d'utilisateur" : 'Enter username first',
    passwordChanged: isArabic ? 'تم تغيير كلمة المرور بنجاح' : isFrench ? 'Mot de passe changé avec succès' : 'Password changed successfully',
    tryNow: isArabic ? 'يمكنك الآن تسجيل الدخول' : isFrench ? 'Vous pouvez maintenant vous connecter' : 'You can now sign in',
    verificationError: isArabic ? 'حدث خطأ في التحقق' : isFrench ? "Erreur de vérification" : 'Verification error',
    errorOccurred: isArabic ? 'حدث خطأ، حاول مرة أخرى' : isFrench ? 'Une erreur est survenue, réessayez' : 'An error occurred, try again',
  };

  const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@smart-finance.local`;

  const handleGuestLogin = () => {
    if (guestLoading) return;
    setGuestLoading(true);
    setError('');
    try {
      continueAsGuest();
      window.location.href = '/dashboard';
    } catch (err) {
      setGuestLoading(false);
      setError(err instanceof Error ? err.message : t.operationFailed);
    }
  };

  const handleForgotPassword = async () => {

    // ── Step 1: البحث عن المستخدم ──
    if (resetStep === 'username') {
      if (!resetUsername.trim()) { setError(t.enterUsernameFirst); return; }
      setLoading(true); setError('');

      const { data: profile } = await supabase
        .from('profiles')
        .select('email, security_question')
        .eq('username', resetUsername.trim().toLowerCase())
        .maybeSingle();

      if (!profile) {
        setError(isArabic ? 'اسم المستخدم غير موجود. تحقق من الكتابة.' : 'Username not found. Check spelling.');
        setLoading(false); return;
      }

      if (!profile.security_question) {
        // لا توجد أسئلة أمان - أرسل رابط مباشرة
        await sendResetEmail(profile.email);
        setLoading(false); return;
      }

      setStoredQuestion(profile.security_question);
      setResetStep('question');
      setLoading(false); return;
    }

    // ── Step 2: التحقق من سؤال الأمان ──
    if (resetStep === 'question') {
      if (!securityAnswer.trim()) { setError(t.enterSecurityAnswer); return; }
      setLoading(true); setError('');

      const { data: profile } = await supabase
        .from('profiles')
        .select('email, security_answer_hash')
        .eq('username', resetUsername.trim().toLowerCase())
        .maybeSingle();

      if (!profile) { setError(t.errorOccurred); setLoading(false); return; }

      const correct = profile.security_answer_hash
        ? await hashSecurityAnswer(securityAnswer, profile.email || resetUsername.trim().toLowerCase()) === profile.security_answer_hash
        : false;
      if (!correct) {
        setError(isArabic ? 'إجابة خاطئة. حاول مرة أخرى.' : 'Wrong answer. Try again.');
        setLoading(false); return;
      }

      // ✅ الإجابة صحيحة - أرسل رابط الاستعادة
      await sendResetEmail(profile.email);
      setLoading(false); return;
    }
  };

  const sendResetEmail = async (email: string) => {
    if (!email) {
      setError(isArabic ? 'لا يوجد بريد إلكتروني مرتبط بهذا الحساب' : 'No email linked to this account');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined,
    });

    if (error) {
      setError(isArabic ? 'حدث خطأ. تحقق من بريدك الإلكتروني وحاول مرة أخرى.' : 'Error occurred. Check your email and try again.');
    } else {
      setForgotPasswordSuccess(
        isArabic
          ? '📧 تم إرسال رابط الاستعادة! تحقق من بريدك الإلكتروني وافتح الرابط لإنشاء كلمة مرور جديدة.'
          : '📧 Reset link sent! Check your email to create a new password.'
      );
      setResetStep('username');
      setShowForgotPassword(false);
      setSecurityAnswer('');
    }
  };

  const handleSendEmailReset = async () => {
    if (!resetUsername.trim()) { setError(t.enterUsernameFirst); return; }
    setLoading(true); setError('');

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', resetUsername.trim().toLowerCase())
      .maybeSingle();

    if (!profile?.email) {
      setError(isArabic ? 'لم يتم العثور على الحساب' : 'Account not found');
      setLoading(false); return;
    }

    await sendResetEmail(profile.email);
    setLoading(false);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    if (username.trim().length < 3) { setError(t.usernameMinLength); return; }
    if (password.length < 6) { setError(t.passwordMinLength); return; }
    if (isRegister) {
      if (!firstName.trim()) { setError(isArabic ? 'الاسم الأول مطلوب' : 'First name is required'); return; }
      if (!lastName.trim()) { setError(isArabic ? 'اسم العائلة مطلوب' : 'Last name is required'); return; }
      if (!email.trim()) { setError(t.emailRequired); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(t.invalidEmail); return; }
      if (!age.trim()) { setError(t.ageRequired); return; }
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 10 || ageNum > 120) { setError(t.invalidAge); return; }
      if (!gender) { setError(t.genderRequired); return; }
      if (!securityQuestion) { setError(t.securityQuestionRequired); return; }
      if (!securityAnswer.trim()) { setError(t.securityAnswerRequired); return; }
      if (!securityQuestion2) { setError(isArabic ? 'سؤال الأمان الثاني مطلوب' : 'Second security question required'); return; }
      if (!securityAnswer2.trim()) { setError(isArabic ? 'إجابة السؤال الثاني مطلوبة' : 'Second answer required'); return; }
      if (password !== confirmPassword) { setError(t.passwordMismatch); return; }
    }
    setLoading(true);
    if (!isRegister) {
      const loginIdentifier = username.trim();
      const isEmail = loginIdentifier.includes('@');
      if (isEmail) {
        const { error } = await supabase.auth.signInWithPassword({ email: loginIdentifier, password });
        if (error) { setError(error.message || t.operationFailed); setLoading(false); return; }
      } else {
        const { error } = await signIn(loginIdentifier, password);
        if (error) {
          const msg = error.message || '';
          if (msg.includes('Invalid login credentials')) setError('اسم المستخدم أو كلمة المرور غير صحيحة');
          else if (msg.includes('Failed to fetch') || msg.includes('network')) setError('فشل الاتصال بالخادم');
          else setError(msg || 'حدث خطأ غير متوقع');
        }
        setLoading(false); return;
      }
    } else {
      const result = await signUp(username, password, email.trim().toLowerCase(), age, gender, securityQuestion, securityAnswer);
      if (result.error) { setError(result.error.message || t.operationFailed); setLoading(false); return; }
      // Save extra profile data
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        const securityAnswerHash = await hashSecurityAnswer(securityAnswer, email.trim().toLowerCase());
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: newUser.id,
          display_name: `${firstName.trim()} ${lastName.trim()}`,
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          age: parseInt(age, 10) || null,
          gender: gender || null,
          security_question: securityQuestion || null,
          security_answer: null,
          security_answer_hash: securityAnswerHash,
          security_question_2: securityQuestion2,
          security_answer_2: null,
          security_question_3: securityQuestion3 || null,
          security_answer_3: null,
        }, { onConflict: 'id' }).select().single();
        if (profileError) { setError(profileError.message); setLoading(false); return; }
      }
      router.push('/dashboard');
      router.refresh();
      return;
    }
    setLoading(false);
  };

  const getSecurityQuestionText = (questionId: string) => {
    const q = SECURITY_QUESTIONS.find(sq => sq.id === questionId);
    if (!q) return '';
    if (isArabic) return q.questionAr;
    if (isFrench) return q.questionFr;
    return q.questionEn;
  };

  const authStyles = `@keyframes spin{to{transform:rotate(360deg)}}`;



  return (
    <div className="auth-scene" dir={isArabic ? 'rtl' : 'ltr'}>

      {/* Language selector */}
      <div style={{position:'absolute',top:'16px',left:'16px',zIndex:10}}>
        <LanguageSwitcher value={language} onChange={setLanguage} variant="gold" compact />
      </div>

      {/* ── Card ── */}
      <div className="auth-card">

        {/* Brand */}
        <div className="auth-brand">
          <Image src="/sfm-logo.png" alt="THE SFM" width={88} height={88} priority className="auth-logo sfm-brand-mark sfm-brand-mark--auth" />
          <div className="auth-brand-name">{t.title}</div>
          <div className="auth-brand-sub">
            {showForgotPassword
              ? (isArabic ? 'استعادة كلمة المرور' : isFrench ? 'Récupérer le mot de passe' : 'Recover your password')
              : isRegister
              ? (isArabic ? 'إنشاء حساب جديد' : isFrench ? 'Créer un nouveau compte' : 'Create a new account')
              : (isArabic ? 'مرحباً بعودتك — Welcome Back' : isFrench ? 'Bienvenue — Welcome Back' : 'Welcome Back')}
          </div>
        </div>

        <div className="auth-divider" />

        <form onSubmit={submit} style={{display:'flex', flexDirection:'column', gap:'0'}}>

          {/* Error / Success */}
          {error && (
            <div className="auth-error" style={{marginBottom:'16px'}}>
              <span style={{fontSize:'16px'}}>⚠️</span> {error}
            </div>
          )}
          {forgotPasswordSuccess && (
            <div className="auth-success" style={{marginBottom:'16px'}}>
              <span style={{fontSize:'16px'}}>✅</span> {forgotPasswordSuccess}
            </div>
          )}

          {/* ══ FORGOT PASSWORD FLOW ══ */}
          {showForgotPassword && (
            <>
              {/* Steps indicator */}
              <div className="auth-steps" style={{marginBottom:'20px'}}>
                {[
                  {id:'username', label: isArabic ? 'المستخدم' : 'Username'},
                  {id:'question', label: isArabic ? 'التحقق' : 'Verify'},
                ].map((s, i) => {
                  const idx = ['username','question'].indexOf(resetStep);
                  const done = idx > i;
                  const cur  = resetStep === s.id;
                  return (
                    <div key={s.id} className="auth-step">
                      <div className={'auth-step-circle ' + (done ? 'done' : cur ? 'active' : 'idle')}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span className={'auth-step-label ' + (cur ? 'active' : '')}>{s.label}</span>
                      {i < 1 && <div className="auth-step-line" />}
                    </div>
                  );
                })}
              </div>

              {/* Step 1: Username */}
              {resetStep === 'username' && (
                <div className="auth-field">
                  <label className="auth-field-label">{t.username}</label>
                  <div className="auth-input-wrap">
                    <i className="ti ti-user auth-input-icon" aria-hidden="true" />
                    <input className="auth-input" value={resetUsername}
                      onChange={e => setResetUsername(e.target.value)}
                      placeholder={isArabic ? 'مثال: ahmad' : 'e.g. ahmad'}
                      dir="ltr" autoComplete="username" />
                  </div>
                </div>
              )}

              {/* Step 2: Security question */}
              {resetStep === 'question' && storedQuestion && (
                <div className="auth-field">
                  <label className="auth-field-label">
                    {getSecurityQuestionText(storedQuestion)}
                  </label>
                  <div className="auth-input-wrap">
                    <i className="ti ti-shield-check auth-input-icon" aria-hidden="true" />
                    <input className="auth-input" value={securityAnswer}
                      onChange={e => setSecurityAnswer(e.target.value)}
                      placeholder={t.enterSecurityAnswer} />
                  </div>
                </div>
              )}

              {/* Step 3: New password */}
              {resetStep === 'reset' && (
                <>
                  <div className="auth-field">
                    <label className="auth-field-label">{t.newPassword}</label>
                    <div className="auth-input-wrap">
                      <i className="ti ti-lock auth-input-icon" aria-hidden="true" />
                      <input className="auth-input" type={showPassword ? 'text' : 'password'}
                        value={password} onChange={e => setPassword(e.target.value)}
                        dir="ltr" autoComplete="new-password" />
                      <button type="button" className="auth-input-eye"
                        onClick={() => setShowPassword(!showPassword)} aria-label="toggle">
                        <i className={'ti ' + (showPassword ? 'ti-eye-off' : 'ti-eye')} />
                      </button>
                    </div>
                  </div>
                  <div className="auth-field" style={{marginBottom:'20px'}}>
                    <label className="auth-field-label">{t.confirmPassword}</label>
                    <div className="auth-input-wrap">
                      <i className="ti ti-lock auth-input-icon" aria-hidden="true" />
                      <input className="auth-input" type="password"
                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                        dir="ltr" autoComplete="new-password" />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ══ LOGIN FORM ══ */}
          {!showForgotPassword && !isRegister && (
            <>
              <div className="auth-field">
                <label className="auth-field-label">{t.usernameOrEmail}</label>
                <div className="auth-input-wrap">
                  <i className="ti ti-user auth-input-icon" aria-hidden="true" />
                  <input className="auth-input" value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={t.enterUsernameOrEmail}
                    dir="ltr" autoComplete="username" />
                </div>
              </div>
              <div className="auth-field" style={{marginBottom:'6px'}}>
                <label className="auth-field-label">{t.password}</label>
                <div className="auth-input-wrap">
                  <i className="ti ti-lock auth-input-icon" aria-hidden="true" />
                  <input className="auth-input" type={showPassword ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    dir="ltr" autoComplete="current-password" />
                  <button type="button" className="auth-input-eye"
                    onClick={() => setShowPassword(!showPassword)} aria-label="toggle">
                    <i className={'ti ' + (showPassword ? 'ti-eye-off' : 'ti-eye')} />
                  </button>
                </div>
              </div>
              <div style={{textAlign: isArabic ? 'left' : 'right', marginBottom:'20px'}}>
                <button type="button" className="auth-link"
                  style={{fontSize:'13px', color:'var(--sfm-accent)', fontWeight:'600'}}
                  onClick={() => { setShowForgotPassword(true); setError(''); setForgotPasswordSuccess(''); setResetStep('username'); }}>
                  {isArabic ? 'نسيت كلمة المرور؟' : isFrench ? 'Mot de passe oublié?' : 'Forgot password?'}
                </button>
              </div>
            </>
          )}

          {/* ══ REGISTER FORM ══ */}
          {!showForgotPassword && isRegister && (
            <>
              {/* Name row */}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                <div className="auth-field">
                  <label className="auth-field-label">{isArabic ? 'الاسم الأول' : isFrench ? 'Prénom' : 'First name'} <span style={{color:'#EF4444'}}>*</span></label>
                  <input className="auth-input auth-input-no-pad"
                    value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder={isArabic ? 'أدخل الاسم الأول' : isFrench ? 'Entrez le prénom' : 'Enter first name'} />
                </div>
                <div className="auth-field">
                  <label className="auth-field-label">{isArabic ? 'الاسم الأخير' : isFrench ? 'Nom' : 'Last name'} <span style={{color:'#EF4444'}}>*</span></label>
                  <input className="auth-input auth-input-no-pad"
                    value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder={isArabic ? 'أدخل الاسم الأخير' : isFrench ? 'Entrez le nom' : 'Enter last name'} />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-field-label">{t.username} <span style={{color:'#EF4444'}}>*</span></label>
                <div className="auth-input-wrap">
                  <i className="ti ti-user auth-input-icon" aria-hidden="true" />
                  <input className="auth-input" value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={t.enterUsername} dir="ltr" autoComplete="username" />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-field-label">{t.email} <span style={{color:'#EF4444'}}>*</span></label>
                <div className="auth-input-wrap">
                  <i className="ti ti-mail auth-input-icon" aria-hidden="true" />
                  <input className="auth-input" type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@domain.com" dir="ltr" />
                </div>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                <div className="auth-field">
                  <label className="auth-field-label">{t.password} <span style={{color:'#EF4444'}}>*</span></label>
                  <div className="auth-input-wrap">
                    <i className="ti ti-lock auth-input-icon" aria-hidden="true" />
                    <input className="auth-input" type={showPassword ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      dir="ltr" autoComplete="new-password" />
                    <button type="button" className="auth-input-eye"
                      onClick={() => setShowPassword(!showPassword)} aria-label="toggle">
                      <i className={'ti ' + (showPassword ? 'ti-eye-off' : 'ti-eye')} />
                    </button>
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-field-label">{t.confirmPassword} <span style={{color:'#EF4444'}}>*</span></label>
                  <div className="auth-input-wrap">
                    <i className="ti ti-lock auth-input-icon" aria-hidden="true" />
                    <input className="auth-input" type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      dir="ltr" autoComplete="new-password" />
                    <button type="button" className="auth-input-eye"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label="toggle">
                      <i className={'ti ' + (showConfirmPassword ? 'ti-eye-off' : 'ti-eye')} />
                    </button>
                  </div>
                </div>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'4px'}}>
                <div className="auth-field">
                  <label className="auth-field-label">{t.age}</label>
                  <input className="auth-input auth-input-no-pad" type="number"
                    value={age} onChange={e => setAge(normalizeDigits(e.target.value).replace(/\D/g, ''))}
                    placeholder="25" dir="ltr" min="10" max="120" />
                </div>
                <div className="auth-field">
                  <label className="auth-field-label">{t.gender}</label>
                  <div style={{display:'flex', gap:'16px', height:'48px', alignItems:'center'}}>
                    {['male','female'].map(g => (
                      <label key={g} style={{display:'flex', alignItems:'center', gap:'6px', cursor:'pointer',
                        fontSize:'14px', fontWeight:'500', color: gender === g ? 'var(--sfm-foreground)' : 'var(--sfm-muted)',
                        fontFamily:'Tajawal,sans-serif'}}>
                        <input type="radio" name="gender" value={g}
                          checked={gender === g} onChange={() => setGender(g)}
                          style={{accentColor:'var(--sfm-primary)', width:'16px', height:'16px'}} />
                        {g === 'male' ? t.male : t.female}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Security Questions */}
              <div style={{background:'var(--sfm-light-card)', border:'1.5px solid var(--sfm-border)', borderRadius:'var(--r-md)', padding:'16px', marginBottom:'4px'}}>
                <p style={{fontSize:'12.5px', fontWeight:'700', color:'var(--sfm-foreground)', marginBottom:'12px', fontFamily:'Tajawal,sans-serif'}}>
                  🔐 {isArabic ? 'أسئلة الأمان (الأول والثاني إجباري)' : 'Security Questions (1st & 2nd required)'}
                </p>
                {[
                  {q:securityQuestion,  setQ:setSecurityQuestion,  a:securityAnswer,  setA:setSecurityAnswer,  label: isArabic?'السؤال الأول *':'1st Question *',  filter:[] as string[]},
                  {q:securityQuestion2, setQ:setSecurityQuestion2, a:securityAnswer2, setA:setSecurityAnswer2, label: isArabic?'السؤال الثاني *':'2nd Question *', filter:[securityQuestion]},
                  {q:securityQuestion3, setQ:setSecurityQuestion3, a:securityAnswer3, setA:setSecurityAnswer3, label: isArabic?'السؤال الثالث (اختياري)':'3rd Question (optional)', filter:[securityQuestion,securityQuestion2]},
                ].map((sq, idx) => (
                  <div key={idx} style={{marginBottom: idx < 2 ? '12px' : '0'}}>
                    <label style={{fontSize:'12px', fontWeight:'600', color: idx === 2 ? 'var(--sfm-muted)' : 'var(--sfm-muted)', display:'block', marginBottom:'6px', fontFamily:'Tajawal,sans-serif'}}>{sq.label}</label>
                    <Select value={sq.q} onValueChange={sq.setQ}>
                      <SelectTrigger style={{height:'40px', fontSize:'12.5px', borderColor:'var(--sfm-border)', marginBottom:'6px'}}>
                        <SelectValue placeholder={t.selectQuestion} />
                      </SelectTrigger>
                      <SelectContent>
                        {SECURITY_QUESTIONS.filter(question => !sq.filter.includes(question.id)).map(question => (
                          <SelectItem key={question.id} value={question.id}>
                            {isArabic ? question.questionAr : isFrench ? question.questionFr : question.questionEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(sq.q || idx < 2) && (
                      <input className="auth-input auth-input-no-pad"
                        style={{height:'40px', fontSize:'13px'}}
                        value={sq.a} onChange={e => sq.setA(e.target.value)}
                        placeholder={isArabic ? 'الإجابة...' : 'Answer...'} />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ══ PRIMARY BUTTON ══ */}
          <button type="submit" className="auth-btn-primary" style={{marginTop:'20px', marginBottom:'16px'}} disabled={loading || guestLoading}>
            {loading ? (
              <><span style={{display:'inline-block', animation:'spin 1s linear infinite', borderRadius:'50%', border:'2px solid rgba(27,36,48,0.2)', borderTopColor:'var(--sfm-foreground)', width:'18px', height:'18px'}} />{t.processing}</>
            ) : showForgotPassword
              ? (resetStep === 'username' ? (isArabic ? 'التالي ←' : 'Next →') : (isArabic ? 'تحقق وأرسل رابط الاستعادة' : 'Verify & Send Reset'))
              : isRegister ? t.createBtn : t.loginBtn}
          </button>

          {/* ══ LINKS ══ */}
          {!showForgotPassword && (
            <>
              <div className="auth-sep">
                <div className="auth-sep-line" />
                <span className="auth-sep-text">{isArabic ? 'أو' : 'or'}</span>
                <div className="auth-sep-line" />
              </div>
              <div className="auth-links">
                <div className="auth-link-row">
                  <button type="button" className={'auth-link ' + (isRegister ? '' : 'auth-link-primary')}
                    onClick={() => { setMode('login'); setError(''); }}>
                    {isArabic ? 'تسجيل الدخول' : isFrench ? 'Se connecter' : 'Sign in'}
                  </button>
                  <div className="auth-link-dot" />
                  <button type="button" className={'auth-link ' + (isRegister ? 'auth-link-primary' : '')}
                    onClick={() => { setMode('register'); setError(''); }}>
                    {isArabic ? 'إنشاء حساب' : isFrench ? 'Créer un compte' : 'Create account'}
                  </button>
                </div>
                <button type="button" className="auth-btn-secondary"
                  onClick={handleGuestLogin}
                  disabled={guestLoading}
                  aria-busy={guestLoading}>
                  <i className="ti ti-user-circle" style={{fontSize:'18px'}} aria-hidden="true" />
                  {guestLoading ? t.processing : t.guestLogin}
                </button>
              </div>
            </>
          )}

          {showForgotPassword && (
            <button type="button" className="auth-link" style={{textAlign:'center', marginTop:'8px', width:'100%'}}
              onClick={() => { setShowForgotPassword(false); setForgotPasswordSuccess(''); setResetStep('username'); setError(''); }}>
              ← {t.back}
            </button>
          )}

        </form>
      </div>

      {/* Footer */}
      <p style={{position:'absolute', bottom:'16px', left:'50%', transform:'translateX(-50%)',
        fontSize:'11.5px', color:'var(--sfm-muted)', whiteSpace:'nowrap',
        fontFamily:'Tajawal,sans-serif'}}>
        المدير المالي الذكي — SFM © 2026
      </p>

    </div>
  );
}
