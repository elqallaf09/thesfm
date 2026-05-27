'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AtSign,
  ChevronLeft,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { CurrencySelect } from '@/components/CurrencySelect';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { hashSecurityAnswer, isEmail } from '@/lib/authSecurity';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset' | 'twoFactor';
type Message = { type: 'error' | 'ok'; text: string } | null;
type PasswordStrength = 'weak' | 'medium' | 'strong';
type TwoFactorChallenge = {
  email: string;
};

const COUNTRY_OPTIONS = [
  { value: 'Kuwait', ar: 'الكويت', en: 'Kuwait', fr: 'Koweït' },
  { value: 'Saudi Arabia', ar: 'السعودية', en: 'Saudi Arabia', fr: 'Arabie saoudite' },
  { value: 'United Arab Emirates', ar: 'الإمارات', en: 'UAE', fr: 'Émirats arabes unis' },
  { value: 'Qatar', ar: 'قطر', en: 'Qatar', fr: 'Qatar' },
  { value: 'Bahrain', ar: 'البحرين', en: 'Bahrain', fr: 'Bahreïn' },
  { value: 'Oman', ar: 'عُمان', en: 'Oman', fr: 'Oman' },
  { value: 'Other', ar: 'أخرى', en: 'Other', fr: 'Autre' },
] as const;

const QUESTION_OPTIONS = {
  ar: [
    'ما اسم أول مدينة عشت فيها؟',
    'ما اسم أول مدرسة درست فيها؟',
    'ما اسم شخص تثق به؟',
    'ما اسم أول مشروع عملت عليه؟',
  ],
  en: [
    'What was the first city you lived in?',
    'What was the name of your first school?',
    'What is the name of someone you trust?',
    'What was the name of your first project?',
  ],
  fr: [
    'Quelle est la première ville où vous avez vécu ?',
    'Quel était le nom de votre première école ?',
    'Quel est le nom d’une personne de confiance ?',
    'Quel était le nom de votre premier projet ?',
  ],
} as const;

const TEXT = {
  ar: {
    title: 'المدير المالي الذكي',
    subtitle: 'ادخل إلى لوحة THE SFM لإدارة دخلك ومصروفاتك وأهدافك بوضوح.',
    login: 'تسجيل الدخول',
    create: 'إنشاء حساب',
    forgot: 'استعادة كلمة المرور',
    reset: 'تعيين كلمة مرور جديدة',
    usernameOrEmail: 'اسم المستخدم أو البريد الإلكتروني',
    username: 'اسم المستخدم',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    defaultCurrency: 'العملة الافتراضية',
    country: 'الدولة',
    securityQuestion: 'سؤال الأمان',
    customQuestion: 'سؤال مخصص',
    customQuestionPlaceholder: 'اكتب سؤال الأمان الخاص بك',
    securityAnswer: 'إجابة سؤال الأمان',
    securityOptional: 'سؤال الأمان اختياري ويستخدم كطبقة تحقق إضافية فقط، وليس بديلاً عن البريد الإلكتروني.',
    termsPrefix: 'أوافق على',
    terms: 'الشروط',
    privacy: 'سياسة الخصوصية',
    and: 'و',
    accountDetails: 'بيانات الحساب',
    preferencesSecurity: 'التفضيلات والأمان',
    continue: 'متابعة',
    back: 'السابق',
    signIn: 'تسجيل الدخول',
    createAccount: 'إنشاء الحساب',
    signingIn: 'جاري تسجيل الدخول...',
    saving: 'جاري إنشاء الحساب...',
    sendReset: 'إرسال رابط الاستعادة',
    sendResetBody: 'أدخل بريدك الإلكتروني لإرسال رابط استعادة كلمة المرور.',
    resetSent: 'إذا كان البريد مسجلاً، سيتم إرسال رابط استعادة كلمة المرور.',
    resetSendError: 'تعذر إرسال رابط الاستعادة حالياً. حاول مرة أخرى.',
    resetSuccess: 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.',
    switchCreate: 'إنشاء حساب جديد',
    switchLogin: 'لدي حساب بالفعل',
    forgotLink: 'نسيت كلمة المرور؟',
    guest: 'متابعة كضيف',
    weak: 'ضعيفة',
    medium: 'متوسطة',
    strong: 'قوية',
    recommended: 'الرمز الخاص يقوي كلمة المرور.',
    optional: 'اختياري',
    required: 'مطلوب',
    emailPlaceholder: 'name@example.com',
    usernamePlaceholder: 'اختر اسم مستخدم',
    loginPlaceholder: 'اسم المستخدم أو البريد الإلكتروني',
    passwordPlaceholder: 'أدخل كلمة المرور',
    recoveryQuestionTitle: 'تحقق إضافي',
    recoveryQuestionHelp: 'تم التحقق من البريد. أجب عن سؤال الأمان لإكمال إعادة التعيين.',
    hidePassword: 'إخفاء كلمة المرور',
    showPassword: 'إظهار كلمة المرور',
    errorEmpty: 'أكمل كل الحقول المطلوبة.',
    errorUsername: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل.',
    errorEmail: 'الرجاء إدخال بريد إلكتروني صحيح.',
    errorPasswordLength: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
    errorPasswordContent: 'كلمة المرور يجب أن تحتوي على حرف ورقم على الأقل.',
    errorMismatch: 'كلمتا المرور غير متطابقتين.',
    errorTerms: 'يجب الموافقة على الشروط وسياسة الخصوصية.',
    errorExists: 'اسم المستخدم مستخدم بالفعل.',
    errorRegister: 'تعذر إنشاء الحساب. حاول مرة أخرى.',
    errorLogin: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
    errorSecurityPair: 'أكمل سؤال الأمان وإجابته أو اتركهما فارغين.',
    errorSecurityAnswer: 'إجابة سؤال الأمان غير صحيحة.',
    errorSecurityLocked: 'تم تجاوز عدد المحاولات. استخدم رابط البريد الإلكتروني لاحقاً.',
    checkEmail: 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب إذا كان التحقق مفعلاً.',
    noReveal: 'لن نكشف ما إذا كان البريد مسجلاً لحماية الحسابات.',
    twoFactorTitle: 'التحقق عبر البريد الإلكتروني',
    twoFactorBody: 'أدخل رمز التحقق المرسل إلى بريدك الإلكتروني قبل الدخول إلى الحساب.',
    twoFactorSent: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.',
    twoFactorSendError: 'تعذر إرسال رمز التحقق حالياً. حاول مرة أخرى.',
    verificationCode: 'رمز التحقق',
    verifyCode: 'تحقق',
    verifyingCode: 'جاري التحقق...',
    resendCode: 'إعادة إرسال الرمز',
    invalidCode: 'رمز التحقق غير صحيح.',
    codeExpired: 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.',
    codeInvalidOrExpired: 'رمز التحقق غير صحيح أو منتهي الصلاحية.',
    twoFactorNoEmail: 'لا يمكن إكمال المصادقة الثنائية بدون بريد إلكتروني صالح.',
  },
  en: {
    title: 'Smart Financial Manager',
    subtitle: 'Sign in to THE SFM dashboard to manage income, expenses, and goals clearly.',
    login: 'Sign in',
    create: 'Create account',
    forgot: 'Recover password',
    reset: 'Set a new password',
    usernameOrEmail: 'Username or email',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    defaultCurrency: 'Default currency',
    country: 'Country',
    securityQuestion: 'Security question',
    customQuestion: 'Custom question',
    customQuestionPlaceholder: 'Write your own security question',
    securityAnswer: 'Security answer',
    securityOptional: 'The security question is optional and used only as an additional verification layer, not as a replacement for email recovery.',
    termsPrefix: 'I agree to the',
    terms: 'Terms',
    privacy: 'Privacy Policy',
    and: 'and',
    accountDetails: 'Account details',
    preferencesSecurity: 'Preferences and security',
    continue: 'Continue',
    back: 'Back',
    signIn: 'Sign in',
    createAccount: 'Create account',
    signingIn: 'Signing in...',
    saving: 'Creating account...',
    sendReset: 'Send reset link',
    sendResetBody: 'Enter your email to send a password recovery link.',
    resetSent: 'If the email is registered, a password reset link will be sent.',
    resetSendError: 'Could not send the reset link right now. Please try again.',
    resetSuccess: 'Password changed successfully. You can sign in now.',
    switchCreate: 'Create new account',
    switchLogin: 'I already have an account',
    forgotLink: 'Forgot password?',
    guest: 'Continue as guest',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    recommended: 'A symbol makes the password stronger.',
    optional: 'Optional',
    required: 'Required',
    emailPlaceholder: 'name@example.com',
    usernamePlaceholder: 'Choose a username',
    loginPlaceholder: 'Username or email',
    passwordPlaceholder: 'Enter password',
    recoveryQuestionTitle: 'Additional verification',
    recoveryQuestionHelp: 'Email was verified. Answer your security question to complete the reset.',
    hidePassword: 'Hide password',
    showPassword: 'Show password',
    errorEmpty: 'Complete all required fields.',
    errorUsername: 'Username must be at least 3 characters.',
    errorEmail: 'Please enter a valid email address.',
    errorPasswordLength: 'Password must be at least 8 characters.',
    errorPasswordContent: 'Password must contain at least one letter and one number.',
    errorMismatch: 'Passwords do not match.',
    errorTerms: 'You must accept the terms and privacy policy.',
    errorExists: 'This username is already taken.',
    errorRegister: 'Could not create the account. Try again.',
    errorLogin: 'Username or password is incorrect.',
    errorSecurityPair: 'Complete both security question and answer, or leave both blank.',
    errorSecurityAnswer: 'The security answer is incorrect.',
    errorSecurityLocked: 'Too many attempts. Use the email recovery link again later.',
    checkEmail: 'Account created. Check your email to verify the account if verification is enabled.',
    noReveal: 'We do not reveal whether an email is registered to protect accounts.',
    twoFactorTitle: 'Email Two-Factor Authentication',
    twoFactorBody: 'Enter the verification code sent to your email before account access.',
    twoFactorSent: 'A verification code has been sent to your email.',
    twoFactorSendError: 'Could not send the verification code right now. Please try again.',
    verificationCode: 'Verification Code',
    verifyCode: 'Verify',
    verifyingCode: 'Verifying...',
    resendCode: 'Resend Code',
    invalidCode: 'The verification code is incorrect.',
    codeExpired: 'The code has expired. Request a new code.',
    codeInvalidOrExpired: 'The verification code is incorrect or expired.',
    twoFactorNoEmail: 'Two-factor authentication requires a valid email address.',
  },
  fr: {
    title: 'Gestionnaire financier intelligent',
    subtitle: 'Connectez-vous au tableau THE SFM pour gérer revenus, dépenses et objectifs.',
    login: 'Connexion',
    create: 'Créer un compte',
    forgot: 'Récupérer le mot de passe',
    reset: 'Définir un nouveau mot de passe',
    usernameOrEmail: 'Nom d’utilisateur ou email',
    username: 'Nom d’utilisateur',
    email: 'Email',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    defaultCurrency: 'Devise par défaut',
    country: 'Pays',
    securityQuestion: 'Question de sécurité',
    customQuestion: 'Question personnalisée',
    customQuestionPlaceholder: 'Écrivez votre question de sécurité',
    securityAnswer: 'Réponse de sécurité',
    securityOptional: 'La question de sécurité est facultative et sert uniquement de couche de vérification supplémentaire, pas de remplacement à la récupération par email.',
    termsPrefix: 'J’accepte les',
    terms: 'Conditions',
    privacy: 'Politique de confidentialité',
    and: 'et la',
    accountDetails: 'Détails du compte',
    preferencesSecurity: 'Préférences et sécurité',
    continue: 'Continuer',
    back: 'Retour',
    signIn: 'Connexion',
    createAccount: 'Créer le compte',
    signingIn: 'Connexion en cours...',
    saving: 'Création du compte...',
    sendReset: 'Envoyer le lien',
    sendResetBody: 'Entrez votre email pour envoyer un lien de récupération du mot de passe.',
    resetSent: 'Si l’e-mail est enregistré, un lien de réinitialisation sera envoyé.',
    resetSendError: 'Impossible d’envoyer le lien de réinitialisation pour le moment. Réessayez.',
    resetSuccess: 'Mot de passe changé avec succès. Vous pouvez vous connecter.',
    switchCreate: 'Créer un nouveau compte',
    switchLogin: 'J’ai déjà un compte',
    forgotLink: 'Mot de passe oublié ?',
    guest: 'Continuer en invité',
    weak: 'Faible',
    medium: 'Moyen',
    strong: 'Fort',
    recommended: 'Un symbole rend le mot de passe plus fort.',
    optional: 'Facultatif',
    required: 'Requis',
    emailPlaceholder: 'nom@example.com',
    usernamePlaceholder: 'Choisissez un nom d’utilisateur',
    loginPlaceholder: 'Nom d’utilisateur ou email',
    passwordPlaceholder: 'Entrez le mot de passe',
    recoveryQuestionTitle: 'Vérification supplémentaire',
    recoveryQuestionHelp: 'L’email a été vérifié. Répondez à la question de sécurité pour terminer.',
    hidePassword: 'Masquer le mot de passe',
    showPassword: 'Afficher le mot de passe',
    errorEmpty: 'Complétez tous les champs requis.',
    errorUsername: 'Le nom d’utilisateur doit contenir au moins 3 caractères.',
    errorEmail: 'Veuillez entrer une adresse email valide.',
    errorPasswordLength: 'Le mot de passe doit contenir au moins 8 caractères.',
    errorPasswordContent: 'Le mot de passe doit contenir au moins une lettre et un chiffre.',
    errorMismatch: 'Les mots de passe ne correspondent pas.',
    errorTerms: 'Vous devez accepter les conditions et la politique de confidentialité.',
    errorExists: 'Ce nom d’utilisateur est déjà utilisé.',
    errorRegister: 'Impossible de créer le compte. Réessayez.',
    errorLogin: 'Nom d’utilisateur ou mot de passe incorrect.',
    errorSecurityPair: 'Complétez la question et la réponse de sécurité, ou laissez les deux vides.',
    errorSecurityAnswer: 'La réponse de sécurité est incorrecte.',
    errorSecurityLocked: 'Trop de tentatives. Réutilisez le lien email plus tard.',
    checkEmail: 'Compte créé. Vérifiez votre email si la confirmation est activée.',
    noReveal: 'Nous ne révélons pas si un email est enregistré afin de protéger les comptes.',
    twoFactorTitle: 'Authentification à deux facteurs par e-mail',
    twoFactorBody: 'Saisissez le code de vérification envoyé à votre e-mail avant l’accès au compte.',
    twoFactorSent: 'Un code de vérification a été envoyé à votre e-mail.',
    twoFactorSendError: 'Impossible d’envoyer le code de vérification pour le moment. Réessayez.',
    verificationCode: 'Code de vérification',
    verifyCode: 'Vérifier',
    verifyingCode: 'Vérification...',
    resendCode: 'Renvoyer le code',
    invalidCode: 'Le code de vérification est incorrect.',
    codeExpired: 'Le code a expiré. Demandez un nouveau code.',
    codeInvalidOrExpired: 'Le code de vérification est incorrect ou expiré.',
    twoFactorNoEmail: 'L’authentification à deux facteurs nécessite une adresse e-mail valide.',
  },
} as const;

type AuthCopy = Record<keyof typeof TEXT.ar, string>;

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: 'var(--sfm-light-card)' }} />}>
      <LoginContent />
    </Suspense>
  );
}

function scorePassword(password: string) {
  const checks = [
    password.length >= 8,
    /[A-Za-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  return checks.filter(Boolean).length;
}

function strengthFor(password: string): PasswordStrength {
  const score = scorePassword(password);
  if (score <= 2) return 'weak';
  if (score === 3) return 'medium';
  return 'strong';
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signOut, session, user, continueAsGuest } = useAuth();
  const { dir, lang } = useLanguage();
  const text = TEXT[lang];
  const questionOptions = QUESTION_OPTIONS[lang];

  const queryMode = searchParams.get('mode');
  const initialMode: AuthMode = queryMode === 'register' || queryMode === 'forgot' || queryMode === 'forgot-password'
    ? (queryMode === 'forgot-password' ? 'forgot' : queryMode)
    : 'login';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('KWD');
  const [country, setCountry] = useState('Kuwait');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [customSecurityQuestion, setCustomSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryQuestion, setRecoveryQuestion] = useState<string | null>(null);
  const [recoveryHash, setRecoveryHash] = useState<string | null>(null);
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [securityAttempts, setSecurityAttempts] = useState(0);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const nextPath = useMemo(() => searchParams.get('next') || '/dashboard', [searchParams]);
  const passwordStrength = useMemo(() => strengthFor(password), [password]);
  const passwordScore = useMemo(() => scorePassword(password), [password]);

  useEffect(() => {
    if (queryMode === 'register' || queryMode === 'forgot' || queryMode === 'forgot-password') {
      setMode(queryMode === 'forgot-password' ? 'forgot' : queryMode);
    }
  }, [queryMode]);

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const search = typeof window !== 'undefined' ? window.location.search : '';
    if (queryMode === 'reset' || hash.includes('type=recovery') || search.includes('type=recovery')) {
      router.replace(`/reset-password${hash || ''}`);
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') router.replace('/reset-password');
    });
    return () => subscription.unsubscribe();
  }, [queryMode, router]);

  useEffect(() => {
    if (session && mode !== 'reset' && mode !== 'twoFactor' && !submitting && !twoFactorChallenge) router.replace(nextPath);
  }, [mode, nextPath, router, session, submitting, twoFactorChallenge]);

  useEffect(() => {
    if (mode !== 'reset' || !user) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('security_question, security_answer_hash')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setRecoveryQuestion(data?.security_question || null);
        setRecoveryHash(data?.security_answer_hash || null);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, user]);

  function setAuthMode(nextMode: AuthMode) {
    setMode(nextMode);
    setSignupStep(1);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
    setRecoveryAnswer('');
    setTwoFactorCode('');
    if (nextMode !== 'twoFactor') setTwoFactorChallenge(null);
  }

  function validatePassword(value: string) {
    if (value.length < 8) return text.errorPasswordLength;
    if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return text.errorPasswordContent;
    return '';
  }

  function resolvedSecurityQuestion() {
    return securityQuestion === '__custom__' ? customSecurityQuestion.trim() : securityQuestion.trim();
  }

  function validateAccountStep() {
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) return text.errorEmpty;
    if (username.trim().length < 3) return text.errorUsername;
    if (!isEmail(email)) return text.errorEmail;
    const passwordError = validatePassword(password);
    if (passwordError) return passwordError;
    if (password !== confirmPassword) return text.errorMismatch;
    return '';
  }

  async function sendLoginTwoFactorCode(emailAddress: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email: emailAddress,
      options: { shouldCreateUser: false },
    });
    return error;
  }

  async function handleLogin() {
    if (!username.trim() || !password.trim()) return text.errorEmpty;
    const { error } = await signIn(username.trim(), password);
    if (error) return text.errorLogin;
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData.user;
    if (!authUser?.id) return text.errorLogin;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email_2fa_enabled')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profile?.email_2fa_enabled) {
      const authEmail = authUser.email?.trim().toLowerCase() || '';
      if (!isEmail(authEmail) || authEmail.endsWith('@smart-finance.local')) {
        await signOut();
        return text.twoFactorNoEmail;
      }

      const otpError = await sendLoginTwoFactorCode(authEmail);
      await signOut();
      if (otpError) return text.twoFactorSendError;

      setTwoFactorChallenge({ email: authEmail });
      setTwoFactorCode('');
      setMode('twoFactor');
      setPassword('');
      setMessage({ type: 'ok', text: text.twoFactorSent });
      return '';
    }
    router.replace(nextPath);
    return '';
  }

  async function handleTwoFactorLogin() {
    if (!twoFactorChallenge) return text.errorLogin;
    const code = twoFactorCode.trim();
    if (code.length !== 6) return text.invalidCode;
    const { error } = await supabase.auth.verifyOtp({
      email: twoFactorChallenge.email,
      token: code,
      type: 'email',
    });
    if (error) return error.message.toLowerCase().includes('expired') ? text.codeExpired : text.codeInvalidOrExpired;
    router.replace(nextPath);
    return '';
  }

  async function resendTwoFactorCode() {
    if (!twoFactorChallenge) return;
    setSubmitting(true);
    setMessage(null);
    const error = await sendLoginTwoFactorCode(twoFactorChallenge.email);
    setSubmitting(false);
    setMessage(error ? { type: 'error', text: text.twoFactorSendError } : { type: 'ok', text: text.twoFactorSent });
  }

  async function handleRegister() {
    const accountError = validateAccountStep();
    if (accountError) return accountError;
    if (signupStep === 1) {
      setSignupStep(2);
      return '';
    }
    if (!termsAccepted) return text.errorTerms;

    const question = resolvedSecurityQuestion();
    if ((question && !securityAnswer.trim()) || (!question && securityAnswer.trim())) return text.errorSecurityPair;

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const { data: existing } = await supabase.from('profiles').select('id').eq('username', cleanUsername).maybeSingle();
    if (existing) return text.errorExists;

    const answerHash = question && securityAnswer.trim()
      ? await hashSecurityAnswer(securityAnswer, cleanEmail)
      : null;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          username: cleanUsername,
          display_name: cleanUsername,
          email: cleanEmail,
          default_currency: defaultCurrency,
          country,
          security_question: question || null,
          security_answer_hash: answerHash,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });

    if (error) return error.message || text.errorRegister;

    const newUser = data.user ?? (await supabase.auth.getUser()).data.user;
    if (newUser && data.session) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: newUser.id,
        username: cleanUsername,
        display_name: cleanUsername,
        email: cleanEmail,
        default_currency: defaultCurrency,
        preferred_currency: defaultCurrency,
        country,
        security_question: question || null,
        security_answer: null,
        security_answer_hash: answerHash,
        preferred_lang: lang,
      }, { onConflict: 'id' });
      if (profileError) return profileError.message || text.errorRegister;

      document.cookie = `sfm_auth=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      document.cookie = 'sfm_guest=; path=/; max-age=0; SameSite=Lax';
      localStorage.removeItem('sfm_guest_mode');
      router.replace('/dashboard');
      router.refresh();
      return '';
    }

    setAuthMode('login');
    setMessage({ type: 'ok', text: text.checkEmail });
    return '';
  }

  async function handleForgotPassword() {
    if (!isEmail(forgotEmail)) return text.errorEmail;
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return text.resetSendError;
    setMessage({ type: 'ok', text: text.resetSent });
    return '';
  }

  async function handleResetPassword() {
    if (!session) return text.resetSent;
    const passwordError = validatePassword(password);
    if (passwordError) return passwordError;
    if (password !== confirmPassword) return text.errorMismatch;
    if (recoveryQuestion && recoveryHash) {
      if (securityAttempts >= 5) return text.errorSecurityLocked;
      const salt = user?.email || email || forgotEmail;
      const answerHash = await hashSecurityAnswer(recoveryAnswer, salt);
      if (answerHash !== recoveryHash) {
        setSecurityAttempts(count => count + 1);
        return text.errorSecurityAnswer;
      }
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return error.message;
    await signOut();
    setAuthMode('login');
    setMessage({ type: 'ok', text: text.resetSuccess });
    return '';
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setMessage(null);
    if (supabaseConfigError) {
      setMessage({ type: 'error', text: supabaseConfigError });
      return;
    }

    setSubmitting(true);
    try {
      const error =
        mode === 'login' ? await handleLogin()
        : mode === 'register' ? await handleRegister()
        : mode === 'forgot' ? await handleForgotPassword()
        : mode === 'twoFactor' ? await handleTwoFactorLogin()
        : await handleResetPassword();
      if (error) setMessage({ type: 'error', text: error });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || text.errorRegister });
    } finally {
      setSubmitting(false);
    }
  }

  function enterGuestMode() {
    continueAsGuest();
    router.replace('/dashboard');
  }

  const cardTitle = mode === 'register' ? text.create : mode === 'forgot' ? text.forgot : mode === 'reset' ? text.reset : mode === 'twoFactor' ? text.twoFactorTitle : text.login;
  const isRegister = mode === 'register';

  return (
    <main className="login-shell" dir={dir}>
      <section className={`login-card ${isRegister ? 'wide' : ''}`} aria-labelledby="auth-title">
        <div className="language-row">
          <LanguageSwitcher variant="gold" compact />
        </div>

        <div className="brand">
          <Image src="/sfm-logo.png" alt="THE SFM" width={88} height={88} priority className="mark sfm-brand-mark sfm-brand-mark--auth" />
          <h1 id="auth-title">{cardTitle}</h1>
          <p>{mode === 'forgot' ? text.sendResetBody : mode === 'reset' ? text.noReveal : mode === 'twoFactor' ? text.twoFactorBody : text.subtitle}</p>
        </div>

        {isRegister && (
          <div className="signup-steps" aria-label={text.create}>
            <span className={signupStep === 1 ? 'active' : 'done'}><b>1</b>{text.accountDetails}</span>
            <span className={signupStep === 2 ? 'active' : ''}><b>2</b>{text.preferencesSecurity}</span>
          </div>
        )}

        <form onSubmit={submit} className="form">
          {mode === 'login' && (
            <>
              <AuthField label={text.usernameOrEmail} icon={<UserRound size={18} />} required>
                <input value={username} onChange={event => setUsername(event.target.value)} placeholder={text.loginPlaceholder} autoComplete="username" />
              </AuthField>
              <PasswordField
                label={text.password}
                value={password}
                onChange={setPassword}
                placeholder={text.passwordPlaceholder}
                show={showPassword}
                onToggle={() => setShowPassword(value => !value)}
                ariaLabel={showPassword ? text.hidePassword : text.showPassword}
                autoComplete="current-password"
              />
            </>
          )}

          {mode === 'forgot' && (
            <AuthField label={text.email} icon={<Mail size={18} />} required>
              <input value={forgotEmail} onChange={event => setForgotEmail(event.target.value)} placeholder={text.emailPlaceholder} type="email" autoComplete="email" dir="ltr" />
            </AuthField>
          )}

          {mode === 'twoFactor' && (
            <>
              <div className="security-note">
                <ShieldCheck size={18} aria-hidden="true" />
                <span>{text.twoFactorBody}</span>
              </div>
              <AuthField label={text.verificationCode} icon={<KeyRound size={18} />} required>
                <input
                  value={twoFactorCode}
                  onChange={event => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  autoFocus
                />
              </AuthField>
            </>
          )}

          {mode === 'reset' && (
            <>
              {recoveryQuestion && recoveryHash && (
                <div className="security-check">
                  <ShieldCheck size={18} aria-hidden="true" />
                  <div>
                    <strong>{text.recoveryQuestionTitle}</strong>
                    <p>{text.recoveryQuestionHelp}</p>
                    <label>
                      <span>{recoveryQuestion}</span>
                      <input value={recoveryAnswer} onChange={event => setRecoveryAnswer(event.target.value)} autoComplete="off" />
                    </label>
                  </div>
                </div>
              )}
              <PasswordField
                label={text.password}
                value={password}
                onChange={setPassword}
                placeholder={text.passwordPlaceholder}
                show={showPassword}
                onToggle={() => setShowPassword(value => !value)}
                ariaLabel={showPassword ? text.hidePassword : text.showPassword}
                autoComplete="new-password"
              />
              <PasswordField
                label={text.confirmPassword}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={text.confirmPassword}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword(value => !value)}
                ariaLabel={showConfirmPassword ? text.hidePassword : text.showPassword}
                autoComplete="new-password"
              />
              <PasswordMeter strength={passwordStrength} score={passwordScore} labels={text} />
            </>
          )}

          {isRegister && signupStep === 1 && (
            <div className="form-grid">
              <AuthField label={text.username} icon={<UserRound size={18} />} required>
                <input value={username} onChange={event => setUsername(event.target.value)} placeholder={text.usernamePlaceholder} autoComplete="username" />
              </AuthField>
              <AuthField label={text.email} icon={<AtSign size={18} />} required>
                <input value={email} onChange={event => setEmail(event.target.value)} placeholder={text.emailPlaceholder} type="email" autoComplete="email" dir="ltr" />
              </AuthField>
              <PasswordField
                label={text.password}
                value={password}
                onChange={setPassword}
                placeholder={text.passwordPlaceholder}
                show={showPassword}
                onToggle={() => setShowPassword(value => !value)}
                ariaLabel={showPassword ? text.hidePassword : text.showPassword}
                autoComplete="new-password"
              />
              <PasswordField
                label={text.confirmPassword}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={text.confirmPassword}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword(value => !value)}
                ariaLabel={showConfirmPassword ? text.hidePassword : text.showPassword}
                autoComplete="new-password"
              />
              <div className="grid-full">
                <PasswordMeter strength={passwordStrength} score={passwordScore} labels={text} />
              </div>
            </div>
          )}

          {isRegister && signupStep === 2 && (
            <div className="form-grid">
              <div className="auth-field">
                <span>{text.defaultCurrency} <em>{text.required}</em></span>
                <CurrencySelect value={defaultCurrency} onChange={setDefaultCurrency} lang={lang} ariaLabel={text.defaultCurrency} />
              </div>
              <label className="auth-field">
                <span>{text.country} <em>{text.required}</em></span>
                <div className="input-wrap">
                  <Globe2 size={18} />
                  <select value={country} onChange={event => setCountry(event.target.value)}>
                    {COUNTRY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option[lang]}</option>)}
                  </select>
                </div>
              </label>
              <label className="auth-field grid-full">
                <span>{text.securityQuestion} <em>{text.optional}</em></span>
                <div className="input-wrap">
                  <ShieldCheck size={18} />
                  <select value={securityQuestion} onChange={event => setSecurityQuestion(event.target.value)}>
                    <option value="">{text.optional}</option>
                    {questionOptions.map(question => <option key={question} value={question}>{question}</option>)}
                    <option value="__custom__">{text.customQuestion}</option>
                  </select>
                </div>
              </label>
              {securityQuestion === '__custom__' && (
                <AuthField label={text.customQuestion} icon={<ShieldCheck size={18} />} className="grid-full">
                  <input value={customSecurityQuestion} onChange={event => setCustomSecurityQuestion(event.target.value)} placeholder={text.customQuestionPlaceholder} />
                </AuthField>
              )}
              {(securityQuestion || securityAnswer) && (
                <AuthField label={text.securityAnswer} icon={<KeyRound size={18} />} className="grid-full">
                  <input value={securityAnswer} onChange={event => setSecurityAnswer(event.target.value)} autoComplete="off" />
                </AuthField>
              )}
              <div className="security-note grid-full">
                <ShieldCheck size={17} aria-hidden="true" />
                <span>{text.securityOptional}</span>
              </div>
              <label className="terms-line grid-full">
                <input type="checkbox" checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} />
                <span>
                  {text.termsPrefix} <Link href="/terms">{text.terms}</Link> {text.and} <Link href="/privacy">{text.privacy}</Link>.
                </span>
              </label>
            </div>
          )}

          {message && <div className={message.type === 'ok' ? 'message ok' : 'message'} role="status">{message.text}</div>}

          <div className="submit-row">
            {isRegister && signupStep === 2 && (
              <button type="button" className="secondary" onClick={() => setSignupStep(1)} disabled={submitting}>
                <ChevronLeft size={16} aria-hidden="true" />{text.back}
              </button>
            )}
            <button className="primary" disabled={submitting}>
              {submitting ? (
                <span className="loading-label"><span className="spinner" />{mode === 'login' ? text.signingIn : mode === 'register' ? text.saving : mode === 'twoFactor' ? text.verifyingCode : text.sendReset}</span>
              ) : mode === 'login' ? text.signIn : mode === 'register' ? (signupStep === 1 ? text.continue : text.createAccount) : mode === 'forgot' ? text.sendReset : mode === 'twoFactor' ? text.verifyCode : text.reset}
            </button>
          </div>
        </form>

        <div className="actions">
          {mode === 'twoFactor' && <button type="button" disabled={submitting} onClick={() => void resendTwoFactorCode()}>{text.resendCode}</button>}
          {mode !== 'login' && <button type="button" disabled={submitting} onClick={() => setAuthMode('login')}>{text.switchLogin}</button>}
          {mode !== 'register' && mode !== 'twoFactor' && <button type="button" disabled={submitting} onClick={() => setAuthMode('register')}>{text.switchCreate}</button>}
          {mode !== 'forgot' && mode !== 'reset' && mode !== 'twoFactor' && <button type="button" disabled={submitting} onClick={() => setAuthMode('forgot')}>{text.forgotLink}</button>}
          {mode === 'login' && <button type="button" disabled={submitting} onClick={enterGuestMode}>{text.guest}</button>}
        </div>
      </section>

      <style jsx global>{`
        .login-shell{min-height:100vh;background:radial-gradient(circle at 20% 10%,rgba(24,212,212,.16),transparent 30%),linear-gradient(180deg,#EEF6FF 0%,#F8FBFF 58%,#FFFFFF 100%);display:grid;place-items:center;padding:24px;font-family:Tajawal,Arial,sans-serif;color:#0B172A;overflow-x:hidden}
        .login-shell .login-card{width:min(100%,460px);background:rgba(255,255,255,.95);border:1px solid rgba(29,140,255,.16);border-radius:28px;box-shadow:0 22px 70px rgba(3,18,37,.14);padding:24px;backdrop-filter:blur(18px);min-width:0}.login-shell .login-card.wide{width:min(100%,820px)}
        .login-shell .language-row{display:flex;justify-content:flex-end;margin-bottom:14px}.login-shell .brand{text-align:center;margin-bottom:22px}.login-shell .mark{margin:0 auto 12px}.login-shell .brand h1{font-size:clamp(24px,4vw,30px);margin:0 0 8px;color:#061B33}.login-shell .brand p{font-size:13px;color:#475569;line-height:1.7;margin:0}
        .login-shell .signup-steps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:16px}.login-shell .signup-steps span{border:1px solid rgba(29,140,255,.16);background:#F8FBFF;color:#0B2748;border-radius:16px;padding:10px 12px;display:flex;align-items:center;gap:9px;font-weight:900;font-size:13px}.login-shell .signup-steps b{width:26px;height:26px;border-radius:999px;display:grid;place-items:center;background:rgba(29,140,255,.12);color:#1D8CFF}.login-shell .signup-steps .active{background:#061B33;color:#FFFFFF;border-color:rgba(24,212,212,.35);box-shadow:inset 0 -2px 0 rgba(24,212,212,.70)}.login-shell .signup-steps .active b{background:rgba(255,255,255,.12);color:#18D4D4}.login-shell .signup-steps .done{background:#ECFDF5;color:#047857;border-color:rgba(16,185,129,.22)}
        .login-shell .form{display:grid;gap:14px}.login-shell .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.login-shell .grid-full{grid-column:1/-1}
        .login-shell .auth-field{display:grid;gap:7px;min-width:0}.login-shell .auth-field>span,.login-shell .security-check label>span{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:900;color:#0B2748}.login-shell .auth-field em{font-style:normal;color:#64748B;font-size:11px;font-weight:900}
        .login-shell .input-wrap{min-height:52px;border:1.5px solid rgba(29,140,255,.22);background:#FFFFFF;border-radius:14px;display:flex;align-items:center;gap:10px;padding:0 13px;color:#1D8CFF;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}.login-shell .input-wrap:focus-within{border-color:#1D8CFF;background:#F8FBFF;box-shadow:0 0 0 4px rgba(29,140,255,.25)}
        .login-shell input,.login-shell select{flex:1;border:0;background:transparent;outline:0;color:#0B172A;font:800 14px Tajawal,Arial,sans-serif;min-width:0;width:100%}.login-shell input::placeholder{color:#64748B;opacity:1}.login-shell select{cursor:pointer}
        .login-shell .icon{border:0;background:transparent;color:#0B2748;display:grid;place-items:center;cursor:pointer;border-radius:999px;padding:4px}.login-shell .icon:hover{color:#1D8CFF}.login-shell .icon:focus-visible,.login-shell .primary:focus-visible,.login-shell .secondary:focus-visible,.login-shell .actions button:focus-visible,.login-shell .terms-line:focus-within{outline:3px solid rgba(24,212,212,.35);outline-offset:3px}
        .login-shell .password-meter{display:grid;gap:8px}.login-shell .meter-top{display:flex;justify-content:space-between;gap:12px;color:#334155;font-size:12px;font-weight:900}.login-shell .meter-top strong.weak{color:#B91C1C}.login-shell .meter-top strong.medium{color:#B45309}.login-shell .meter-top strong.strong{color:#047857}.login-shell .meter-bars{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.login-shell .meter-bars span{height:7px;border-radius:999px;background:rgba(100,116,139,.16)}.login-shell .meter-bars span.on.weak{background:#EF4444}.login-shell .meter-bars span.on.medium{background:#F59E0B}.login-shell .meter-bars span.on.strong{background:#10B981}.login-shell .password-meter p{margin:0;color:#64748B;font-size:12px;font-weight:800}
        .login-shell .security-note,.login-shell .security-check{border:1px solid rgba(24,212,212,.22);background:rgba(24,212,212,.08);border-radius:15px;color:#0B2748;display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;padding:12px;font-size:13px;font-weight:850;line-height:1.7}.login-shell .security-note svg,.login-shell .security-check svg{color:#1D8CFF;margin-top:2px}.login-shell .security-check strong{display:block;color:#061B33}.login-shell .security-check p{margin:4px 0 10px;color:#475569}.login-shell .security-check label{display:grid;gap:7px}.login-shell .security-check input{min-height:46px;border:1px solid rgba(29,140,255,.22);border-radius:12px;background:#FFFFFF;padding:0 12px}
        .login-shell .terms-line{display:flex;gap:10px;align-items:flex-start;border:1px solid rgba(29,140,255,.14);background:#F8FBFF;border-radius:15px;padding:12px;color:#334155;font-size:13px;font-weight:850;line-height:1.7}.login-shell .terms-line input{width:18px;height:18px;accent-color:#1D8CFF;flex:0 0 auto;margin-top:3px}.login-shell .terms-line a{color:#1D8CFF;font-weight:950;text-decoration:none}.login-shell .terms-line a:hover{text-decoration:underline}
        .login-shell .submit-row{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:2px}.login-shell .primary,.login-shell .secondary{min-height:54px;border-radius:16px;padding:0 18px;font:950 14px Tajawal,Arial,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease,background .18s ease,border-color .18s ease}.login-shell .primary{border:0;background:linear-gradient(135deg,#061B33 0%,#1D8CFF 54%,#18D4D4 100%);color:#FFFFFF;box-shadow:0 14px 34px rgba(29,140,255,.28);min-width:190px}.login-shell .secondary{border:1px solid rgba(29,140,255,.22);background:#FFFFFF;color:#0B2748}.login-shell .primary:hover:not(:disabled),.login-shell .secondary:hover:not(:disabled){transform:translateY(-2px);filter:saturate(1.08) brightness(1.02);box-shadow:0 16px 38px rgba(24,212,212,.22)}.login-shell .primary:active:not(:disabled),.login-shell .secondary:active:not(:disabled){transform:translateY(0) scale(.985)}.login-shell .primary:disabled,.login-shell .secondary:disabled{opacity:.72;cursor:not-allowed;transform:none;box-shadow:none}
        .login-shell .loading-label{display:inline-flex;align-items:center;justify-content:center;gap:9px}.login-shell .spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.35);border-top-color:#FFFFFF;animation:sfm-login-spin .75s linear infinite}@keyframes sfm-login-spin{to{transform:rotate(360deg)}}
        .login-shell .message{background:rgba(239,68,68,.08);color:#B91C1C;border:1px solid rgba(239,68,68,.18);border-radius:13px;padding:11px 13px;font-size:13px;font-weight:850;line-height:1.6}.login-shell .message.ok{background:rgba(16,185,129,.10);border-color:rgba(16,185,129,.24);color:#047857}
        .login-shell .actions{display:flex;flex-wrap:wrap;gap:9px;justify-content:center;margin-top:18px}.login-shell .actions button{border:1px solid rgba(29,140,255,.22);background:#FFFFFF;color:#0B2748;border-radius:999px;padding:9px 13px;font:850 12px Tajawal,Arial,sans-serif;cursor:pointer;transition:background .18s ease,border-color .18s ease,color .18s ease}.login-shell .actions button:hover:not(:disabled){background:#EEF6FF;border-color:rgba(29,140,255,.34);color:#061B33}.login-shell .actions button:disabled{opacity:.55;cursor:not-allowed}
        @media(max-width:640px){.login-shell{padding:16px;align-items:start}.login-shell .login-card,.login-shell .login-card.wide{padding:20px;border-radius:22px;width:100%}.login-shell .language-row{justify-content:center}.login-shell .form-grid,.login-shell .signup-steps{grid-template-columns:1fr}.login-shell .submit-row{display:grid;grid-template-columns:1fr}.login-shell .primary,.login-shell .secondary,.login-shell .actions button{width:100%}.login-shell .actions{display:grid;grid-template-columns:1fr}.login-shell .brand{margin-bottom:18px}}
      `}</style>
    </main>
  );
}

function AuthField({
  label,
  icon,
  required,
  className,
  children,
}: {
  label: string;
  icon: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`auth-field ${className ?? ''}`}>
      <span>{label} {required && <em>*</em>}</span>
      <div className="input-wrap">
        {icon}
        {children}
      </div>
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  show,
  onToggle,
  ariaLabel,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
  ariaLabel: string;
  autoComplete: string;
}) {
  return (
    <AuthField label={label} icon={<LockKeyhole size={18} />} required>
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} type={show ? 'text' : 'password'} autoComplete={autoComplete} dir="ltr" />
      <button type="button" className="icon" onClick={onToggle} aria-label={ariaLabel}>
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </AuthField>
  );
}

function PasswordMeter({
  strength,
  score,
  labels,
}: {
  strength: PasswordStrength;
  score: number;
  labels: AuthCopy;
}) {
  const label = strength === 'weak' ? labels.weak : strength === 'medium' ? labels.medium : labels.strong;
  return (
    <div className="password-meter" aria-live="polite">
      <div className="meter-top">
        <span>{labels.password}</span>
        <strong className={strength}>{label}</strong>
      </div>
      <div className="meter-bars" aria-hidden="true">
        {[1, 2, 3, 4].map(item => <span key={item} className={item <= score ? `on ${strength}` : ''} />)}
      </div>
      {strength !== 'strong' && <p>{labels.recommended}</p>}
    </div>
  );
}
