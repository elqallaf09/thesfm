'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, UserPlus, KeyRound, AlertCircle, User, Languages, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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

const SFMLogo = () => (
  <svg viewBox="0 0 300 300" width="160" height="160" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="authBgG" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#1e1e3f"/>
        <stop offset="100%" stopColor="#0d0d1a"/>
      </radialGradient>
      <linearGradient id="authGG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f0d080"/>
        <stop offset="40%" stopColor="#c4a35a"/>
        <stop offset="70%" stopColor="#e8c870"/>
        <stop offset="100%" stopColor="#9a7a30"/>
      </linearGradient>
      <linearGradient id="authGG2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e8c870"/>
        <stop offset="50%" stopColor="#c4a35a"/>
        <stop offset="100%" stopColor="#f0d080"/>
      </linearGradient>
    </defs>
    <circle cx="150" cy="150" r="140" fill="url(#authBgG)" stroke="url(#authGG)" strokeWidth="1.5"/>
    <circle cx="150" cy="150" r="128" fill="none" stroke="url(#authGG)" strokeWidth="0.4" opacity="0.4"/>
    <g stroke="url(#authGG)" strokeWidth="1" fill="none" opacity="0.7">
      <path d="M 58 58 L 58 72 L 72 72"/><path d="M 242 58 L 242 72 L 228 72"/>
      <path d="M 58 242 L 58 228 L 72 228"/><path d="M 242 242 L 242 228 L 228 228"/>
    </g>
    <g fill="url(#authGG)" opacity="0.8">
      <polygon points="150,38 154,43 150,48 146,43"/><polygon points="150,252 154,257 150,262 146,257"/>
      <polygon points="38,150 43,154 48,150 43,146"/><polygon points="252,150 257,154 262,150 257,146"/>
    </g>
    <text x="74" y="175" fontFamily="Georgia, serif" fontSize="82" fontWeight="700" fill="url(#authGG)" textAnchor="middle">S</text>
    <text x="150" y="175" fontFamily="Georgia, serif" fontSize="82" fontWeight="700" fill="url(#authGG2)" textAnchor="middle">F</text>
    <text x="226" y="175" fontFamily="Georgia, serif" fontSize="82" fontWeight="700" fill="url(#authGG)" textAnchor="middle">M</text>
    <line x1="68" y1="188" x2="232" y2="188" stroke="url(#authGG)" strokeWidth="1" opacity="0.6"/>
    <circle cx="68" cy="188" r="2.5" fill="url(#authGG)" opacity="0.9"/>
    <circle cx="150" cy="188" r="2.5" fill="url(#authGG)" opacity="0.9"/>
    <circle cx="232" cy="188" r="2.5" fill="url(#authGG)" opacity="0.9"/>
    <text x="150" y="212" fontFamily="Georgia, serif" fontSize="10" fill="#c4a35a" textAnchor="middle" letterSpacing="5" opacity="0.8">SINCE 2026</text>
  </svg>
);

export function AuthForm() {
  const { signIn, signUp } = useAuth();
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [securityQuestion2, setSecurityQuestion2] = useState('');
  const [securityAnswer2, setSecurityAnswer2] = useState('');
  const [securityQuestion3, setSecurityQuestion3] = useState('');
  const [securityAnswer3, setSecurityAnswer3] = useState('');
  const [resetStep, setResetStep] = useState<'username' | 'question' | 'reset'>('username');
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
        .select('email, security_answer')
        .eq('username', resetUsername.trim().toLowerCase())
        .maybeSingle();

      if (!profile) { setError(t.errorOccurred); setLoading(false); return; }

      const correct = (profile.security_answer || '').toLowerCase().trim() === securityAnswer.trim().toLowerCase();
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
        ? `${window.location.origin}/?reset=true`
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
      if (!email.includes('@')) { setError(t.invalidEmail); return; }
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
      const result = await signUp(username, password, email, age, gender, securityQuestion, securityAnswer);
      if (result.error) { setError(result.error.message || t.operationFailed); setLoading(false); return; }
      // Save extra profile data
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        await supabase.from('profiles').upsert({
          id: newUser.id,
          display_name: `${firstName.trim()} ${lastName.trim()}`,
          security_question_2: securityQuestion2,
          security_answer_2: securityAnswer2,
          security_question_3: securityQuestion3 || null,
          security_answer_3: securityAnswer3 || null,
        });
      }
      router.push('/'); return;
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

  const goldBtn = {background: '#c4a35a', color: '#1a0f00', fontWeight: '600'};
  const goldBorder = {borderColor: 'rgba(196,163,90,0.5)', color: '#7a5c1a'};

  return (
    <>
    <style>{`
      @keyframes wisdom-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      .wisdom-animate { animation: wisdom-scroll 52s linear infinite; display: flex; width: max-content; }
    `}</style>
    <main dir={isArabic ? 'rtl' : 'ltr'} className="relative min-h-screen overflow-hidden px-4 py-10" style={{background: 'linear-gradient(135deg, #fffdf5 0%, #fef9e7 50%, #fdf5d0 100%)'}}>
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{backgroundImage: 'linear-gradient(120deg,rgba(196,163,90,0.15) 0,rgba(196,163,90,0.15) 1px,transparent 1px,transparent 42px)'}} />
      <div className="pointer-events-none absolute -right-24 top-0 h-[34rem] w-[34rem] rounded-full blur-3xl" style={{background: 'rgba(196,163,90,0.2)'}} />

      {/* Wisdom ticker */}
      <div className="absolute left-4 right-4 top-4 z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="order-2 min-w-0 flex-1 overflow-hidden rounded-xl py-1.5 px-3 sm:order-1" style={{border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(255,253,245,0.9)'}}>
          <div className="wisdom-animate items-center gap-4 whitespace-nowrap text-xs">
            {[...FINANCIAL_WISDOM_TIPS, ...FINANCIAL_WISDOM_TIPS].map((tip, index) => {
              const title = isArabic ? tip.titleAr : isFrench ? tip.titleFr : tip.titleEn;
              const content = isArabic ? tip.contentAr : isFrench ? tip.contentFr : tip.contentEn;
              return (
                <span key={`${title}-${index}`} className="inline-flex items-center gap-2" style={{color: '#7a5c1a'}}>
                  <span style={{color: '#c4a35a'}}>✦</span>
                  <strong>{title}</strong>
                  <span style={{color: 'rgba(122,92,26,0.6)'}}>{content}</span>
                </span>
              );
            })}
          </div>
        </div>
        <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
          <SelectTrigger className="order-1 w-[140px] sm:order-2" style={{background: 'rgba(255,253,245,0.9)', borderColor: 'rgba(196,163,90,0.4)', color: '#7a5c1a'}}>
            <Languages className="h-4 w-4 me-2" style={{color: '#c4a35a'}} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ar">العربية</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-12 md:grid-cols-[1.2fr_0.8fr]">

          {/* Left side - Logo & info */}
          <section className="space-y-6 text-center md:text-start">
            <div className="flex justify-center md:justify-start">
              <SFMLogo />
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl font-bold tracking-tight md:text-6xl" style={{color: '#7a5c1a'}}>{t.title}</h1>
              <p className="max-w-xl text-xl leading-relaxed" style={{color: 'rgba(122,92,26,0.7)'}}>{t.subtitle}</p>
            </div>
          </section>

          {/* Right side - Form */}
          <Card style={{border: '1px solid rgba(196,163,90,0.4)', background: 'rgba(255,253,245,0.98)', boxShadow: '0 20px_80px rgba(196,163,90,0.2)'}}>
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-2xl" style={{color: '#7a5c1a'}}>
                {isRegister ? <UserPlus className="h-6 w-6" style={{color: '#c4a35a'}} /> : <Lock className="h-6 w-6" style={{color: '#c4a35a'}} />}
                {showForgotPassword ? t.forgotPassword : isRegister ? t.createAccount : t.login}
              </CardTitle>
              <CardDescription style={{color: 'rgba(122,92,26,0.6)'}}>
                {isRegister ? (isArabic ? 'إن لم يكن لديك حساب، املأ البيانات التالية للبدء.' : isFrench ? "Remplissez les informations suivantes pour commencer." : 'Fill in the following information to get started.') : showForgotPassword ? '' : (isArabic ? 'أدخل اسم المستخدم وكلمة المرور للمتابعة.' : isFrench ? "Entrez votre nom d'utilisateur et mot de passe pour continuer." : 'Enter your username and password to continue.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                {error && <div className="rounded-xl p-3 text-sm flex items-center gap-2" style={{border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(196,163,90,0.08)', color: '#7a5c1a'}}><AlertCircle className="h-4 w-4" style={{color: '#c4a35a'}} />{error}</div>}
                {forgotPasswordSuccess && <div className="rounded-xl p-3 text-sm flex items-center gap-2" style={{border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(196,163,90,0.08)', color: '#7a5c1a'}}><AlertCircle className="h-4 w-4" />{forgotPasswordSuccess}</div>}

                {!showForgotPassword ? (
                  <>
                    <div className="space-y-2">
                      <Label style={{color: '#7a5c1a'}}>{isRegister ? t.username : t.usernameOrEmail}</Label>
                      <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={isRegister ? t.enterUsername : t.enterUsernameOrEmail} dir="ltr" autoComplete="username" style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                    </div>
                    <div className="space-y-2">
                      <Label style={{color: '#7a5c1a'}}>{t.password}</Label>
                      <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" autoComplete={isRegister ? 'new-password' : 'current-password'} style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                    </div>
                    {!isRegister && (
                      <Button type="button" variant="link" className="p-0 h-auto text-sm" style={{color: '#c4a35a'}} onClick={() => { setShowForgotPassword(true); setError(''); setForgotPasswordSuccess(''); setResetStep('username'); }}>
                        <KeyRound className="h-4 w-4 ms-1" />{isArabic ? 'نسيت كلمة المرور؟' : isFrench ? 'Mot de passe oublié?' : 'Forgot password?'}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {/* Step 1: اسم المستخدم */}
                    {resetStep === 'username' && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label style={{color:'#7a5c1a'}}>{t.username}</Label>
                          <Input value={resetUsername} onChange={e => setResetUsername(e.target.value)}
                            placeholder={isArabic ? 'مثال: ahmad' : 'e.g. ahmad'}
                            dir="ltr" style={{borderColor:'rgba(196,163,90,0.4)',fontSize:'16px'}} />
                        </div>
                        <p className="text-xs" style={{color:'rgba(122,92,26,0.5)'}}>
                          💡 {isArabic ? 'سنتحقق من هويتك عبر سؤال الأمان ثم نرسل رابط الاستعادة لبريدك الإلكتروني.' : 'We verify via security question, then send a reset link to your email.'}
                        </p>
                      </div>
                    )}

                    {/* Step 2: سؤال الأمان */}
                    {resetStep === 'question' && (
                      <div className="space-y-4">
                        <div className="p-3 rounded-xl text-sm" style={{background:'rgba(196,163,90,0.07)',border:'1px solid rgba(196,163,90,0.2)'}}>
                          <p style={{color:'rgba(122,92,26,0.6)'}}>{isArabic?'المستخدم: ':'User: '}
                            <span className="font-bold" style={{color:'#7a5c1a'}}>{resetUsername}</span>
                          </p>
                        </div>
                        {storedQuestion && (
                          <div className="space-y-2">
                            <Label style={{color:'#7a5c1a'}}>{t.securityQuestion}</Label>
                            <div className="p-3 rounded-lg" style={{background:'rgba(196,163,90,0.08)',border:'1px solid rgba(196,163,90,0.25)'}}>
                              <p className="text-sm font-medium" style={{color:'#7a5c1a'}}>{getSecurityQuestionText(storedQuestion)}</p>
                            </div>
                            <Input value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)}
                              placeholder={isArabic?'اكتب إجابتك...':'Type your answer...'}
                              style={{borderColor:'rgba(196,163,90,0.4)',fontSize:'16px'}} />
                          </div>
                        )}
                        <div className="relative flex items-center gap-3">
                          <div className="flex-1 h-px" style={{background:'rgba(196,163,90,0.2)'}}/>
                          <span className="text-xs shrink-0" style={{color:'rgba(122,92,26,0.45)'}}>{isArabic?'ناسي الإجابة؟':'Forgot answer?'}</span>
                          <div className="flex-1 h-px" style={{background:'rgba(196,163,90,0.2)'}}/>
                        </div>
                        <button type="button" onClick={handleSendEmailReset} disabled={loading}
                          className="w-full text-sm py-2.5 px-4 rounded-xl transition-all"
                          style={{border:'1px solid rgba(196,163,90,0.35)',color:'#c4a35a',background:'rgba(196,163,90,0.04)'}}>
                          📧 {isArabic?'أرسل رابط الاستعادة على بريدي الإلكتروني':'Send reset link to my email'}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {isRegister && !showForgotPassword && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label style={{color: '#7a5c1a'}}>{isArabic ? 'الاسم الأول' : isFrench ? 'Prénom' : 'First name'} <span className="text-red-400">*</span></Label>
                        <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={isArabic ? 'محمد' : 'John'} style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                      </div>
                      <div className="space-y-2">
                        <Label style={{color: '#7a5c1a'}}>{isArabic ? 'اسم العائلة' : isFrench ? 'Nom' : 'Last name'} <span className="text-red-400">*</span></Label>
                        <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder={isArabic ? 'القلاف' : 'Smith'} style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                      </div>
                    </div>
                    <div className="space-y-2"><Label style={{color: '#7a5c1a'}}>{t.confirmPassword}</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} dir="ltr" autoComplete="new-password" style={{borderColor: 'rgba(196,163,90,0.4)'}} /></div>
                    <div className="space-y-2"><Label style={{color: '#7a5c1a'}}>{t.email}</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@domain.com" dir="ltr" style={{borderColor: 'rgba(196,163,90,0.4)'}} /></div>
                    <div className="space-y-2"><Label style={{color: '#7a5c1a'}}>{t.age}</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" dir="ltr" min="10" max="120" style={{borderColor: 'rgba(196,163,90,0.4)'}} /></div>
                    <div className="space-y-2"><Label style={{color: '#7a5c1a'}}>{t.gender}</Label><RadioGroup value={gender} onValueChange={setGender} className="flex gap-6"><div className="flex items-center gap-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male" className="cursor-pointer" style={{color: '#7a5c1a'}}>{t.male}</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female" className="cursor-pointer" style={{color: '#7a5c1a'}}>{t.female}</Label></div></RadioGroup></div>

                    {/* Security Questions - 3 with 2 mandatory */}
                    <div className="space-y-3 rounded-xl p-3" style={{background: 'rgba(196,163,90,0.06)', border: '1px solid rgba(196,163,90,0.2)'}}>
                      <p className="text-xs font-bold" style={{color: '#7a5c1a'}}>{isArabic ? '🔐 أسئلة الأمان (الأول والثاني إجباري)' : '🔐 Security Questions (1st & 2nd required)'}</p>

                      <div className="space-y-1.5">
                        <Label style={{color: '#7a5c1a', fontSize: '12px'}}>{isArabic ? 'السؤال الأول *' : '1st Question *'}</Label>
                        <Select value={securityQuestion} onValueChange={setSecurityQuestion}><SelectTrigger style={{borderColor: 'rgba(196,163,90,0.4)', fontSize: '12px'}}><SelectValue placeholder={t.selectQuestion} /></SelectTrigger><SelectContent>{SECURITY_QUESTIONS.map((q) => (<SelectItem key={q.id} value={q.id}>{isArabic ? q.questionAr : isFrench ? q.questionFr : q.questionEn}</SelectItem>))}</SelectContent></Select>
                        <Input value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder={isArabic ? 'الإجابة...' : 'Answer...'} style={{borderColor: 'rgba(196,163,90,0.4)', fontSize: '12px'}} />
                      </div>

                      <div className="space-y-1.5">
                        <Label style={{color: '#7a5c1a', fontSize: '12px'}}>{isArabic ? 'السؤال الثاني *' : '2nd Question *'}</Label>
                        <Select value={securityQuestion2} onValueChange={setSecurityQuestion2}><SelectTrigger style={{borderColor: 'rgba(196,163,90,0.4)', fontSize: '12px'}}><SelectValue placeholder={t.selectQuestion} /></SelectTrigger><SelectContent>{SECURITY_QUESTIONS.filter(q => q.id !== securityQuestion).map((q) => (<SelectItem key={q.id} value={q.id}>{isArabic ? q.questionAr : isFrench ? q.questionFr : q.questionEn}</SelectItem>))}</SelectContent></Select>
                        <Input value={securityAnswer2} onChange={(e) => setSecurityAnswer2(e.target.value)} placeholder={isArabic ? 'الإجابة...' : 'Answer...'} style={{borderColor: 'rgba(196,163,90,0.4)', fontSize: '12px'}} />
                      </div>

                      <div className="space-y-1.5">
                        <Label style={{color: 'rgba(122,92,26,0.7)', fontSize: '12px'}}>{isArabic ? 'السؤال الثالث (اختياري)' : '3rd Question (optional)'}</Label>
                        <Select value={securityQuestion3} onValueChange={setSecurityQuestion3}><SelectTrigger style={{borderColor: 'rgba(196,163,90,0.3)', fontSize: '12px'}}><SelectValue placeholder={t.selectQuestion} /></SelectTrigger><SelectContent>{SECURITY_QUESTIONS.filter(q => q.id !== securityQuestion && q.id !== securityQuestion2).map((q) => (<SelectItem key={q.id} value={q.id}>{isArabic ? q.questionAr : isFrench ? q.questionFr : q.questionEn}</SelectItem>))}</SelectContent></Select>
                        {securityQuestion3 && <Input value={securityAnswer3} onChange={(e) => setSecurityAnswer3(e.target.value)} placeholder={isArabic ? 'الإجابة...' : 'Answer...'} style={{borderColor: 'rgba(196,163,90,0.3)', fontSize: '12px'}} />}
                      </div>
                    </div>
                  </>
                )}

                {/* Progress Steps Indicator */}
                {showForgotPassword && (
                  <div className="flex items-center gap-2 mb-2">
                    {['username','question','reset'].map((s,i) => (
                      <div key={s} className="flex items-center gap-2 flex-1">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{background: resetStep===s?'#7f5c48':['username','question','reset'].indexOf(resetStep)>i?'#2d8a4e':'rgba(196,163,90,0.2)',color:['username','question','reset'].indexOf(resetStep)>=i?'white':'rgba(122,92,26,0.4)'}}>
                          {['username','question','reset'].indexOf(resetStep)>i?'✓':i+1}
                        </div>
                        <span className="text-xs hidden md:block" style={{color:resetStep===s?'#7a5c1a':'rgba(122,92,26,0.4)'}}>
                          {i===0?(isArabic?'المستخدم':'Username'):i===1?(isArabic?'التحقق':'Verify'):(isArabic?'كلمة المرور':'Password')}
                        </span>
                        {i<2&&<div className="flex-1 h-px" style={{background:'rgba(196,163,90,0.25)'}}/>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Progress - 2 Steps */}
                {showForgotPassword && (
                  <div className="flex items-center gap-2">
                    {[{id:'username',label:isArabic?'المستخدم':'Username'},{id:'question',label:isArabic?'التحقق':'Verify'}].map((s,i)=>{
                      const idx = ['username','question'].indexOf(resetStep);
                      const done = idx > i; const cur = resetStep === s.id;
                      return (
                        <div key={s.id} className="flex items-center gap-2 flex-1">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{background:done?'#2d8a4e':cur?'#7f5c48':'rgba(196,163,90,0.2)',color:done||cur?'white':'rgba(122,92,26,0.4)'}}>
                            {done?'✓':i+1}
                          </div>
                          <span className="text-xs" style={{color:cur?'#7a5c1a':'rgba(122,92,26,0.4)'}}>{s.label}</span>
                          {i<1&&<div className="flex-1 h-px mx-1" style={{background:'rgba(196,163,90,0.25)'}}/>}
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button type="submit" className="h-12 w-full text-base" style={goldBtn} disabled={loading}>
                  {loading ? t.processing : showForgotPassword
                    ? (resetStep === 'username'
                        ? (isArabic ? 'التالي ←' : 'Next ←')
                        : (isArabic ? '✅ تحقق وأرسل رابط الاستعادة' : '✅ Verify & Send Reset Link'))
                    : isRegister ? t.createBtn : t.loginBtn}
                </Button>

                {!showForgotPassword && (
                  <Button type="button" variant="ghost" className="w-full" style={{color: '#7a5c1a'}} onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}>
                    {isRegister ? t.haveAccount : t.noAccount} {isRegister ? t.login : t.createNew}
                  </Button>
                )}

                {!showForgotPassword && (
                  <>
                    <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" style={{borderColor: 'rgba(196,163,90,0.3)'}} /></div><div className="relative flex justify-center text-xs uppercase"><span className="px-2" style={{background: 'rgba(255,253,245,0.98)', color: 'rgba(122,92,26,0.5)'}}>أو</span></div></div>
                    <Button type="button" variant="outline" className="w-full" style={goldBorder} onClick={() => { window.location.href = '/guest'; }}>
                      <User className="h-4 w-4 ms-2" />{t.guestLogin}
                    </Button>
                  </>
                )}
              </form>
              {showForgotPassword && (
                <div className="mt-4">
                  <Button type="button" variant="ghost" className="w-full text-sm" style={{color: '#c4a35a'}} onClick={() => { setShowForgotPassword(false); setForgotPasswordSuccess(''); setResetStep('username'); }}>{t.back}</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
    </>
  );
}
