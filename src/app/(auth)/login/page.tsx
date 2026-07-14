'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
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
import { ThemeToggle } from '@/components/ThemeToggle';
import { isEmail } from '@/lib/authSecurity';
import { trackEvent } from '@/lib/analytics';
import { normalizeDigits } from '@/lib/locale';
import { syncServerAuthSession } from '@/lib/auth/clientSession';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset' | 'twoFactor';
type Message = { type: 'error' | 'ok'; text: string } | null;
type PasswordStrength = 'weak' | 'medium' | 'strong';
type TwoFactorChallenge = {
  kind: 'email';
};
const MIN_PASSWORD_LENGTH = 6;

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
    "Quel est le nom d'une personne de confiance ?",
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
    resetSent: 'إذا كان البريد مسجلاً، سنرسل لك رابط إعادة تعيين كلمة المرور. تحقق من البريد الوارد والرسائل غير المرغوبة.',
    resetSendError: 'تعذر إرسال رابط الاستعادة حالياً. حاول مرة أخرى.',
    resetAccountNotFound: 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.',
    resetVerifyError: 'تعذر التحقق من البريد حالياً. تأكد من إعدادات الخادم ثم حاول مرة أخرى.',
    resetSuccess: 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.',
    switchCreate: 'إنشاء حساب جديد',
    switchLogin: 'لدي حساب بالفعل',
    forgotLink: 'نسيت كلمة المرور؟',
    guest: 'متابعة كضيف',
    weak: 'ضعيفة',
    medium: 'متوسطة',
    strong: 'قوية',
    recommended: 'استخدم كلمة مرور أطول لزيادة الأمان.',
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
    errorPasswordLength: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.',
    errorPasswordContent: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.',
    errorMismatch: 'كلمتا المرور غير متطابقتين.',
    errorTerms: 'يجب الموافقة على الشروط وسياسة الخصوصية للمتابعة.',
    errorExists: 'اسم المستخدم مستخدم بالفعل.',
    errorRegister: 'تعذر إنشاء الحساب. حاول مرة أخرى.',
    errorProfileCreate: 'تم إنشاء الحساب، لكن تعذر حفظ بيانات الملف الشخصي. الرجاء المحاولة مرة أخرى.',
    errorLogin: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
    errorUsernameNotFound: 'اسم المستخدم غير موجود',
    errorProfileEmailMissing: 'لا يوجد بريد إلكتروني مرتبط بهذا المستخدم',
    errorInvalidCredentials: 'بيانات الدخول غير صحيحة.',
    profileSetupNeeded: 'تم تسجيل الدخول، يرجى إكمال إعداد الحساب.',
    errorLoginGeneric: 'تعذر تسجيل الدخول حالياً. حاول مرة أخرى.',
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
    orContinueWith: 'أو تابع عبر',
    signInGoogle: 'تسجيل الدخول عبر Google',
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
    resetSent: 'If this email is registered, we will send a password reset link. Check your inbox and spam folder.',
    resetSendError: 'Could not send the reset link right now. Please try again.',
    resetAccountNotFound: 'No account is registered with this email address.',
    resetVerifyError: 'Could not verify this email right now. Check the server settings, then try again.',
    resetSuccess: 'Password changed successfully. You can sign in now.',
    switchCreate: 'Create new account',
    switchLogin: 'I already have an account',
    forgotLink: 'Forgot password?',
    guest: 'Continue as guest',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    recommended: 'A longer password improves security.',
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
    errorPasswordLength: 'Password must be at least 6 characters.',
    errorPasswordContent: 'Password must be at least 6 characters.',
    errorMismatch: 'Passwords do not match.',
    errorTerms: 'You must agree to the Terms and Privacy Policy to continue.',
    errorExists: 'This username is already taken.',
    errorRegister: 'Could not create the account. Try again.',
    errorProfileCreate: 'Account created, but we could not save your profile details. Please try again.',
    errorLogin: 'Username or password is incorrect.',
    errorUsernameNotFound: 'Username not found.',
    errorProfileEmailMissing: 'No email address is linked to this user.',
    errorInvalidCredentials: 'Invalid login credentials.',
    profileSetupNeeded: 'Signed in. Please complete account setup.',
    errorLoginGeneric: 'Could not sign in right now. Please try again.',
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
    orContinueWith: 'Or continue with',
    signInGoogle: 'Sign in with Google',
  },
  fr: {
    title: 'Gestionnaire financier intelligent',
    subtitle: 'Connectez-vous au tableau THE SFM pour gérer revenus, dépenses et objectifs.',
    login: 'Connexion',
    create: 'Créer un compte',
    forgot: 'Récupérer le mot de passe',
    reset: 'Définir un nouveau mot de passe',
    usernameOrEmail: "Nom d'utilisateur ou email",
    username: "Nom d'utilisateur",
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
    termsPrefix: "J'accepte les",
    terms: 'conditions',
    privacy: 'politique de confidentialité',
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
    resetSent: 'Si cet e-mail est enregistré, nous vous enverrons un lien de réinitialisation. Vérifiez votre boîte de réception et les spams.',
    resetSendError: "Impossible d'envoyer le lien de réinitialisation pour le moment. Réessayez.",
    resetAccountNotFound: "Aucun compte n'est enregistré avec cette adresse e-mail.",
    resetVerifyError: 'Impossible de vérifier cet e-mail pour le moment. Vérifiez la configuration du serveur, puis réessayez.',
    resetSuccess: 'Mot de passe changé avec succès. Vous pouvez vous connecter.',
    switchCreate: 'Créer un nouveau compte',
    switchLogin: "J'ai déjà un compte",
    forgotLink: 'Mot de passe oublié ?',
    guest: 'Continuer en invité',
    weak: 'Faible',
    medium: 'Moyen',
    strong: 'Fort',
    recommended: 'Un mot de passe plus long améliore la sécurité.',
    optional: 'Facultatif',
    required: 'Requis',
    emailPlaceholder: 'nom@example.com',
    usernamePlaceholder: "Choisissez un nom d'utilisateur",
    loginPlaceholder: "Nom d'utilisateur ou email",
    passwordPlaceholder: 'Entrez le mot de passe',
    recoveryQuestionTitle: 'Vérification supplémentaire',
    recoveryQuestionHelp: "L'email a été vérifié. Répondez à la question de sécurité pour terminer.",
    hidePassword: 'Masquer le mot de passe',
    showPassword: 'Afficher le mot de passe',
    errorEmpty: 'Complétez tous les champs requis.',
    errorUsername: "Le nom d'utilisateur doit contenir au moins 3 caractères.",
    errorEmail: 'Veuillez entrer une adresse email valide.',
    errorPasswordLength: 'Le mot de passe doit contenir au moins 6 caractères.',
    errorPasswordContent: 'Le mot de passe doit contenir au moins 6 caractères.',
    errorMismatch: 'Les mots de passe ne correspondent pas.',
    errorTerms: 'Vous devez accepter les conditions et la politique de confidentialité pour continuer.',
    errorExists: "Ce nom d'utilisateur est déjà utilisé.",
    errorRegister: 'Impossible de créer le compte. Réessayez.',
    errorProfileCreate: "Le compte a été créé, mais les informations du profil n'ont pas pu être enregistrées. Veuillez réessayer.",
    errorLogin: "Nom d'utilisateur ou mot de passe incorrect.",
    errorUsernameNotFound: "Nom d'utilisateur introuvable.",
    errorProfileEmailMissing: "Aucune adresse email n'est liée à cet utilisateur.",
    errorInvalidCredentials: 'Identifiants invalides.',
    profileSetupNeeded: 'Connexion réussie. Veuillez terminer la configuration du compte.',
    errorLoginGeneric: 'Connexion impossible pour le moment. Réessayez.',
    errorSecurityPair: 'Complétez la question et la réponse de sécurité, ou laissez les deux vides.',
    errorSecurityAnswer: 'La réponse de sécurité est incorrecte.',
    errorSecurityLocked: 'Trop de tentatives. Réutilisez le lien email plus tard.',
    checkEmail: 'Compte créé. Vérifiez votre email si la confirmation est activée.',
    noReveal: 'Nous ne révélons pas si un email est enregistré afin de protéger les comptes.',
    twoFactorTitle: 'Authentification à deux facteurs par e-mail',
    twoFactorBody: "Saisissez le code de vérification envoyé à votre e-mail avant l'accès au compte.",
    twoFactorSent: 'Un code de vérification a été envoyé à votre e-mail.',
    twoFactorSendError: "Impossible d'envoyer le code de vérification pour le moment. Réessayez.",
    verificationCode: 'Code de vérification',
    verifyCode: 'Vérifier',
    verifyingCode: 'Vérification...',
    resendCode: 'Renvoyer le code',
    invalidCode: 'Le code de vérification est incorrect.',
    codeExpired: 'Le code a expiré. Demandez un nouveau code.',
    codeInvalidOrExpired: 'Le code de vérification est incorrect ou expiré.',
    twoFactorNoEmail: "L'authentification à deux facteurs nécessite une adresse e-mail valide.",
    orContinueWith: 'Ou continuer avec',
    signInGoogle: 'Se connecter avec Google',
  },
} as const;

type AuthCopy = Record<keyof typeof TEXT.ar, string>;

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: 'var(--background)' }} />}>
      <LoginContent />
    </Suspense>
  );
}
function scorePassword(password: string) {
  const clean = password.trim();
  const checks = [
    clean.length >= MIN_PASSWORD_LENGTH,
    clean.length >= 8,
    clean.length >= 10,
    clean.length >= 12,
  ];
  return checks.filter(Boolean).length;
}

function strengthFor(password: string): PasswordStrength {
  const score = scorePassword(password);
  if (score <= 2) return 'weak';
  if (score === 3) return 'medium';
  return 'strong';
}

function cleanObject<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function safeInternalPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || decoded.includes('\\')) return '/dashboard';
  } catch {
    return '/dashboard';
  }
  return value;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signOut, session, user, continueAsGuest } = useAuth();
  const { dir, lang } = useLanguage();
  const text = TEXT[lang];
  const questionOptions = QUESTION_OPTIONS[lang];

  const queryMode = searchParams?.get('mode');
  const queryMfa = searchParams?.get('mfa');
  const initialMode: AuthMode = queryMfa === 'email'
    ? 'twoFactor'
    : queryMode === 'register' || queryMode === 'forgot' || queryMode === 'forgot-password'
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
  const [termsError, setTermsError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [submitting, setSubmitting] = useState(false);
  const redirectingRef = useRef(false);
  const [recoveryQuestion, setRecoveryQuestion] = useState<string | null>(null);
  const [recoveryHash, setRecoveryHash] = useState<string | null>(null);
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [securityAttempts, setSecurityAttempts] = useState(0);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(
    queryMfa === 'email' ? { kind: 'email' } : null,
  );
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [socialLoading, setSocialLoading] = useState<'google' | null>(null);
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const nextPath = useMemo(() => {
    return safeInternalPath(searchParams?.get('next'));
  }, [searchParams]);
  const passwordStrength = useMemo(() => strengthFor(password), [password]);
  const passwordScore = useMemo(() => scorePassword(password), [password]);

  function completeAuthRedirect(targetPath: string) {
    redirectingRef.current = true;
    setSubmitting(true);
    setMessage({ type: 'ok', text: text.signingIn });
    // Hard redirect ensures middleware reads fresh session cookie
    window.location.href = targetPath;
  }

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (queryMode === 'register' || queryMode === 'forgot' || queryMode === 'forgot-password') {
      setMode(queryMode === 'forgot-password' ? 'forgot' : queryMode);
    } else if (queryMfa === 'email') {
      setTwoFactorChallenge({ kind: 'email' });
      setMode('twoFactor');
    }
  }, [queryMfa, queryMode]);

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
    if (session && mode !== 'reset' && mode !== 'twoFactor' && !submitting && !twoFactorChallenge) {
      let cancelled = false;
      void (async () => {
        const synced = await syncServerAuthSession(session);
        if (cancelled) return;
        if (!synced.ok && synced.code === 'MFA_REQUIRED' && synced.mfaType === 'totp') {
          router.replace(`/mfa/verify?next=${encodeURIComponent(nextPath)}`);
          return;
        }
        if (!synced.ok && synced.code === 'MFA_REQUIRED' && synced.mfaType === 'email') {
          const started = await fetch('/api/auth/mfa/email/start', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: 'no-store',
          });
          if (cancelled) return;
          if (!started.ok) {
            setMessage({ type: 'error', text: text.twoFactorSendError });
            return;
          }
          setTwoFactorChallenge({ kind: 'email' });
          setTwoFactorCode('');
          setMode('twoFactor');
          setMessage({ type: 'ok', text: text.twoFactorSent });
          return;
        }
        if (!synced.ok) {
          setMessage({ type: 'error', text: text.errorLoginGeneric });
          return;
        }
        router.refresh();
        router.replace(nextPath);
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [
    mode,
    nextPath,
    router,
    session,
    submitting,
    text.errorLoginGeneric,
    text.twoFactorSendError,
    text.twoFactorSent,
    twoFactorChallenge,
  ]);

  useEffect(() => {
    if (mode !== 'reset' || !user) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('security_question_2, security_answer_2')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setRecoveryQuestion(data?.security_question_2 || null);
        setRecoveryHash(data?.security_answer_2 || null);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, user]);

  function setAuthMode(nextMode: AuthMode) {
    setMode(nextMode);
    setSignupStep(1);
    setMessage(null);
    setTermsError('');
    setPassword('');
    setConfirmPassword('');
    setRecoveryAnswer('');
    setTwoFactorCode('');
    if (nextMode !== 'twoFactor') setTwoFactorChallenge(null);
  }

  function validatePassword(value: string) {
    if (value.trim().length < MIN_PASSWORD_LENGTH) return text.errorPasswordLength;
    return '';
  }

  function friendlyAuthError(message?: string | null) {
    const lowerMessage = String(message || '').toLowerCase();
    const isPasswordPolicyError =
      lowerMessage.includes('password should contain') ||
      lowerMessage.includes('password must contain') ||
      lowerMessage.includes('password should be') ||
      lowerMessage.includes('password must be') ||
      lowerMessage.includes('at least 6') ||
      lowerMessage.includes('at least six');

    if (isPasswordPolicyError) return text.errorPasswordLength;
    return message || text.errorRegister;
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
    if (password.trim() !== confirmPassword.trim()) return text.errorMismatch;
    return '';
  }

  async function handleLogin() {
    const loginIdentifier = username.trim();
    if (!loginIdentifier || !password.trim()) return text.errorEmpty;
    const result = await signIn(loginIdentifier, password);
    if (result.error) {
      if (result.code === 'invalid_credentials') return text.errorInvalidCredentials;
      if (result.code === 'rate_limited') return text.errorLoginGeneric;
      return text.errorLoginGeneric;
    }
    if (result.code === 'mfa_email_required') {
      setTwoFactorChallenge({ kind: 'email' });
      setTwoFactorCode('');
      setMode('twoFactor');
      setPassword('');
      setMessage({ type: 'ok', text: text.twoFactorSent });
      return '';
    }
    const activeSession = result.session ?? (await supabase.auth.getSession()).data.session;
    if (!activeSession?.access_token) return text.errorLoginGeneric;
    if (result.code === 'mfa_totp_required') {
      completeAuthRedirect(`/mfa/verify?next=${encodeURIComponent(nextPath)}`);
      return '';
    }
    completeAuthRedirect(nextPath);
    return '';
  }

  async function handleTwoFactorLogin() {
    if (!twoFactorChallenge) return text.errorLogin;
    const code = twoFactorCode.trim();
    if (code.length !== 6) return text.invalidCode;
    const response = await fetch('/api/auth/mfa/email/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null) as {
      ok?: boolean;
      code?: string;
      mfaType?: 'totp';
      accessToken?: string;
      refreshToken?: string;
    } | null;
    if (!response.ok || !payload?.ok) {
      return payload?.code === 'CHALLENGE_EXPIRED' ? text.codeExpired : text.codeInvalidOrExpired;
    }
    if (!payload.accessToken || !payload.refreshToken) return text.errorLoginGeneric;
    const { data, error } = await supabase.auth.setSession({
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken,
    });
    if (error || !data.session) return text.errorLoginGeneric;
    void trackEvent('login', { module: 'auth', metadata: { method: 'email_2fa' } });
    if (payload.mfaType === 'totp') {
      completeAuthRedirect(`/mfa/verify?next=${encodeURIComponent(nextPath)}`);
      return '';
    }
    completeAuthRedirect(nextPath);
    return '';
  }

  async function resendTwoFactorCode() {
    if (!twoFactorChallenge) return;
    setSubmitting(true);
    setMessage(null);
    const response = await fetch('/api/auth/mfa/email/start', { method: 'POST', cache: 'no-store' });
    setSubmitting(false);
    setMessage(!response.ok ? { type: 'error', text: text.twoFactorSendError } : { type: 'ok', text: text.twoFactorSent });
  }

  async function handleRegister() {
    const accountError = validateAccountStep();
    if (accountError) return accountError;
    if (signupStep === 1) {
      setSignupStep(2);
      return '';
    }
    if (!termsAccepted) {
      setTermsError(text.errorTerms);
      return '';
    }
    setTermsError('');

    const question = resolvedSecurityQuestion();
    const answer = securityAnswer.trim();
    const shouldSaveSecurityQuestion = Boolean(question && answer);

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const { data: existing } = await supabase.from('profiles').select('id').eq('username', cleanUsername).maybeSingle();
    if (existing) return text.errorExists;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          username: cleanUsername,
          display_name: cleanUsername,
          email: cleanEmail,
          default_currency: defaultCurrency,
          country,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });

    if (error) return friendlyAuthError(error.message);

    const newUser = data.user ?? (await supabase.auth.getUser()).data.user;
    if (newUser && data.session) {
      const profilePayload = cleanObject({
        id: newUser.id,
        username: cleanUsername || newUser.user_metadata?.username || null,
        display_name: cleanUsername || newUser.user_metadata?.display_name || null,
        email: newUser.email || cleanEmail,
        country: country || null,
        default_currency: defaultCurrency || 'KWD',
        preferred_currency: defaultCurrency || 'KWD',
        currency: defaultCurrency || 'KWD',
        preferred_lang: lang,
        language: lang,
        preferred_theme: 'light',
        theme: 'light',
        onboarding_completed: false,
        security_question_2: shouldSaveSecurityQuestion ? question : null,
        security_answer_2: shouldSaveSecurityQuestion ? answer : null,
        updated_at: new Date().toISOString(),
      });
      const { error: profileError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
      if (profileError) {
        console.error('[Signup] Profile creation failed', {
          code: profileError.code,
          message: profileError.message,
        });
        return text.errorProfileCreate;
      }

      if (data.session) await syncServerAuthSession(data.session);
      void trackEvent('signup', { module: 'auth', metadata: { method: 'email' } });
      completeAuthRedirect('/dashboard');
      return '';
    }

    setAuthMode('login');
    setMessage({ type: 'ok', text: text.checkEmail });
    return '';
  }

  async function handleForgotPassword() {
    const identifier = forgotEmail.trim().toLowerCase();
    if (identifier.length < 3) return text.errorEmpty;

    const resetResponse = await fetch('/api/auth/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
      cache: 'no-store',
    }).catch(() => null);

    if (!resetResponse || !resetResponse.ok) return text.resetSendError;
    setMessage({ type: 'ok', text: text.resetSent });
    return '';
  }

  async function handleResetPassword() {
    if (!session) return text.resetSent;
    const passwordError = validatePassword(password);
    if (passwordError) return passwordError;
    if (password.trim() !== confirmPassword.trim()) return text.errorMismatch;
    if (recoveryQuestion && recoveryHash) {
      if (securityAttempts >= 5) return text.errorSecurityLocked;
      if (recoveryAnswer.trim().toLowerCase() !== recoveryHash.trim().toLowerCase()) {
        setSecurityAttempts(count => count + 1);
        return text.errorSecurityAnswer;
      }
    }
    const { error } = await supabase.auth.updateUser({ password: password.trim() });
    if (error) return friendlyAuthError(error.message);
    await signOut();
    setAuthMode('login');
    setMessage({ type: 'ok', text: text.resetSuccess });
    return '';
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || guestSubmitting) return;
    redirectingRef.current = false;
    setMessage(null);
    if (supabaseConfigError) {
      setMessage({ type: 'error', text: supabaseConfigError });
      return;
    }

    setSubmitting(true);
    try {
      console.debug('[auth] login started', { mode });
      const error =
        mode === 'login' ? await handleLogin()
        : mode === 'register' ? await handleRegister()
        : mode === 'forgot' ? await handleForgotPassword()
        : mode === 'twoFactor' ? await handleTwoFactorLogin()
        : await handleResetPassword();
      if (error) {
        console.error('[auth] login error', error);
        setMessage({ type: 'error', text: error });
      }
    } catch (error: any) {
      console.error('[auth] login error', error);
      setMessage({ type: 'error', text: error?.message || text.errorRegister });
    } finally {
      if (!redirectingRef.current) setSubmitting(false);
    }
  }

  async function signInWithGoogle() {
    setSocialLoading('google');
    setMessage(null);
    const redirectTo = `${window.location.origin}/login?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) setMessage({ type: 'error', text: error.message });
    setSocialLoading(null);
  }

  function enterGuestMode() {
    if (guestSubmitting) return;
    setGuestSubmitting(true);
    setMessage(null);
    try {
      continueAsGuest();
      redirectingRef.current = true;
      window.location.href = '/dashboard';
    } catch (error) {
      setGuestSubmitting(false);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : text.errorLoginGeneric,
      });
    }
  }

  const cardTitle = mode === 'register' ? text.create : mode === 'forgot' ? text.forgot : mode === 'reset' ? text.reset : mode === 'twoFactor' ? text.twoFactorTitle : text.login;
  const isRegister = mode === 'register';

  return (
    <main className="login-shell" dir={dir}>
      <div className="login-stage">
        <aside className="login-showcase" aria-hidden="true">
          <div className="showcase-brand">
            <Image src="/icons/icon-192.png" alt="" width={56} height={56} priority unoptimized />
            <strong>THE SFM</strong>
          </div>
          <div className="showcase-copy">
            <span>THE SFM</span>
            <h2>{text.title}</h2>
            <p>{text.subtitle}</p>
          </div>
          <div className="showcase-visual">
            <div className="visual-row visual-row--wide" />
            <div className="visual-row" />
            <div className="visual-grid">
              <span />
              <span />
              <span />
            </div>
          </div>
        </aside>

        <section className={`login-card ${isRegister ? 'wide' : ''}`} aria-labelledby="auth-title">
        <div className="language-row">
          <LanguageSwitcher variant="gold" compact />
          <ThemeToggle />
        </div>

        <div className="brand">
          <Image src="/icons/icon-192.png" alt="THE SFM" width={88} height={88} priority unoptimized className="mark sfm-brand-mark sfm-brand-mark--auth" />
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
                <input value={username} onChange={event => setUsername(event.target.value)} placeholder={text.loginPlaceholder} autoComplete="username" suppressHydrationWarning />
              </AuthField>
            
              <PasswordField
                label={text.password}
                value={password}
                onChange={setPassword}
                placeholder={text.passwordPlaceholder}
                show={showPassword}
                onToggle={() => setShowPassword(v => !v)}
                ariaLabel={showPassword ? text.hidePassword : text.showPassword}
                autoComplete="current-password"
              />
            </>
          )}

          {mode === 'forgot' && (
            <AuthField label={text.usernameOrEmail} icon={<Mail size={18} />} required>
              <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder={text.usernamePlaceholder} autoComplete="username" dir="ltr" />
            </AuthField>
          )}

          {mode === 'reset' && (
            <>
              {recoveryQuestion && (
                <div className="recovery-question-block">
                  <p className="recovery-title">{text.recoveryQuestionTitle}</p>
                  <p className="recovery-help">{text.recoveryQuestionHelp}</p>
                  <AuthField label={recoveryQuestion} icon={<ShieldCheck size={18} />} required>
                    <input value={recoveryAnswer} onChange={e => setRecoveryAnswer(e.target.value)} autoComplete="off" />
                  </AuthField>
                </div>
              )}
              <PasswordField
                label={text.password}
                value={password}
                onChange={setPassword}
                placeholder={text.passwordPlaceholder}
                show={showPassword}
                onToggle={() => setShowPassword(v => !v)}
                ariaLabel={showPassword ? text.hidePassword : text.showPassword}
                autoComplete="new-password"
              />
              <PasswordStrengthBar password={password} text={text} />
              <PasswordField
                label={text.confirmPassword}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={text.passwordPlaceholder}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword(v => !v)}
                ariaLabel={showConfirmPassword ? text.hidePassword : text.showPassword}
                autoComplete="new-password"
              />
            </>
          )}

          {mode === 'register' && signupStep === 1 && (
            <>
              <AuthField label={text.username} icon={<AtSign size={18} />} required>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder={text.usernamePlaceholder} autoComplete="username" />
              </AuthField>
              <AuthField label={text.email} icon={<Mail size={18} />} required>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder={text.emailPlaceholder} type="email" autoComplete="email" dir="ltr" />
              </AuthField>
              <PasswordField
                label={text.password}
                value={password}
                onChange={setPassword}
                placeholder={text.passwordPlaceholder}
                show={showPassword}
                onToggle={() => setShowPassword(v => !v)}
                ariaLabel={showPassword ? text.hidePassword : text.showPassword}
                autoComplete="new-password"
              />
              <PasswordStrengthBar password={password} text={text} />
              <PasswordField
                label={text.confirmPassword}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={text.passwordPlaceholder}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword(v => !v)}
                ariaLabel={showConfirmPassword ? text.hidePassword : text.showPassword}
                autoComplete="new-password"
              />
            </>
          )}

          {mode === 'register' && signupStep === 2 && (
            <>
              <div className="pref-row">
                <AuthField label={text.defaultCurrency} icon={<Globe2 size={18} />}>
                  <CurrencySelect value={defaultCurrency} onChange={setDefaultCurrency} />
                </AuthField>
                <AuthField label={text.country} icon={<Globe2 size={18} />}>
                  <select value={country} onChange={e => setCountry(e.target.value)} className="country-select">
                    {COUNTRY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt[lang]}</option>
                    ))}
                  </select>
                </AuthField>
              </div>
              <div className="security-block">
                <p className="field-hint">{text.securityOptional}</p>
                <AuthField label={text.securityQuestion + ' (' + text.optional + ')'} icon={<ShieldCheck size={18} />}>
                  <select value={securityQuestion} onChange={e => setSecurityQuestion(e.target.value)}>
                    <option value="">—</option>
                    {questionOptions.map(q => <option key={q} value={q}>{q}</option>)}
                    <option value="__custom__">{text.customQuestion}</option>
                  </select>
                </AuthField>
                {securityQuestion === '__custom__' && (
                  <AuthField label={text.customQuestion} icon={<ShieldCheck size={18} />}>
                    <input value={customSecurityQuestion} onChange={e => setCustomSecurityQuestion(e.target.value)} placeholder={text.customQuestionPlaceholder} />
                  </AuthField>
                )}
                {securityQuestion && (
                  <AuthField label={text.securityAnswer + ' (' + text.optional + ')'} icon={<LockKeyhole size={18} />}>
                    <input value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} autoComplete="off" />
                  </AuthField>
                )}
              </div>
              <label className={'terms-row' + (termsError ? ' terms-error' : '')}>
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
                <span>
                  {text.termsPrefix}{' '}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer">{text.terms}</Link>
                  {' '}{text.and}{' '}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer">{text.privacy}</Link>
                </span>
              </label>
              {termsError && <p className="terms-error-msg" role="alert">{termsError}</p>}
            </>
          )}

          {mode === 'twoFactor' && (
            <AuthField label={text.verificationCode} icon={<KeyRound size={18} />} required>
              <input
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                autoFocus
                placeholder="&#x2022; &#x2022; &#x2022; &#x2022; &#x2022; &#x2022;"
              />
            </AuthField>
          )}

          {message && (
            <p className={'auth-msg auth-msg--' + message.type} role="alert">{message.text}</p>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={!hydrated || submitting || !!socialLoading || guestSubmitting}
            aria-busy={submitting || guestSubmitting}
          >
            {submitting
              ? (mode === 'register' ? text.saving : text.signingIn)
              : mode === 'register'
                ? (signupStep === 1 ? text.continue : text.createAccount)
                : mode === 'forgot'
                  ? text.sendReset
                  : mode === 'reset'
                    ? text.reset
                    : mode === 'twoFactor'
                      ? text.verifyCode
                      : text.signIn}
          </button>
        </form>

        {mode === 'login' && (
          <div className="social-login-block">
            <div className="social-divider">
              <span>{text.orContinueWith}</span>
            </div>
            <button
              type="button"
              className="social-btn google-btn"
              onClick={() => void signInWithGoogle()}
              disabled={!!socialLoading || submitting || guestSubmitting}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="currentColor"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="currentColor"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="currentColor"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="currentColor"/>
              </svg>
              {socialLoading === 'google' ? text.signingIn : text.signInGoogle}
            </button>
          </div>
        )}

        <div className="actions">
          {mode === 'twoFactor' && (
            <button type="button" className="link-btn" onClick={() => void resendTwoFactorCode()} disabled={submitting}>
              {text.resendCode}
            </button>
          )}
          {mode !== 'login' && (
            <button type="button" className="link-btn" onClick={() => setAuthMode('login')}>
              {text.switchLogin}
            </button>
          )}
          {mode === 'login' && (
            <button type="button" className="link-btn" onClick={() => setAuthMode('register')}>
              {text.switchCreate}
            </button>
          )}
          {mode === 'login' && (
            <button type="button" className="link-btn" onClick={() => setAuthMode('forgot')}>
              {text.forgotLink}
            </button>
          )}
          {(mode === 'login' || mode === 'register') && (
            <button
              type="button"
              className="link-btn guest-btn"
              onClick={enterGuestMode}
              disabled={!hydrated || guestSubmitting}
              aria-busy={guestSubmitting}
            >
              {guestSubmitting ? text.signingIn : text.guest}
            </button>
          )}
          {mode === 'register' && signupStep === 2 && (
            <button type="button" className="link-btn" onClick={() => setSignupStep(1)}>
              {text.back}
            </button>
          )}
        </div>

        </section>
      </div>

      <style jsx global>{`
        .login-shell{
          min-height:100vh;
          display:grid;
          place-items:center;
          background:var(--background);
          padding:32px 18px;
          color:var(--foreground);
          font-family:var(--font-ui);
          overflow-x:hidden;
        }
        .login-shell *,.login-shell *:before,.login-shell *:after{box-sizing:border-box}
        .login-stage{
          width:min(1120px,100%);
          display:grid;
          grid-template-columns:minmax(300px,1fr) minmax(360px,460px);
          gap:18px;
          align-items:stretch;
          box-sizing:border-box;
          min-width:0;
          max-width:100%;
        }
        [dir="rtl"] .login-stage{grid-template-columns:minmax(360px,460px) minmax(300px,1fr)}
        [dir="rtl"] .login-showcase{grid-column:2}
        [dir="rtl"] .login-card{grid-column:1;grid-row:1}
        .login-showcase{
          min-height:640px;
          border:1px solid color-mix(in srgb,var(--primary) 42%,var(--border));
          background:var(--hero-gradient);
          border-radius:var(--radius-sm);
          padding:34px;
          display:grid;
          align-content:space-between;
          gap:28px;
          overflow:hidden;
          box-shadow:var(--shadow-lg);
          position:relative;
          box-sizing:border-box;
          min-width:0;
          max-width:100%;
        }
        .login-showcase:before{
          content:"";
          position:absolute;
          inset:0;
          background:color-mix(in srgb,var(--hero-foreground) 4%,transparent);
        }
        .login-showcase>*{position:relative;z-index:1}
        .showcase-brand{
          display:flex;
          align-items:center;
          gap:12px;
          color:var(--hero-foreground);
          font-size:20px;
          font-weight:600;
          letter-spacing:0;
        }
        .showcase-brand img{
          width:56px;
          height:56px;
          border-radius:var(--radius-sm);
          box-shadow:var(--shadow-md);
        }
        .showcase-copy{
          max-width:520px;
          display:grid;
          gap:12px;
        }
        .showcase-copy span{
          width:max-content;
          border:1px solid color-mix(in srgb,var(--accent) 42%,transparent);
          color:var(--hero-foreground-muted);
          background:color-mix(in srgb,var(--accent) 16%,transparent);
          border-radius:var(--radius-pill);
          padding:7px 11px;
          font-size:12px;
          font-weight:600;
          letter-spacing:0;
        }
        .showcase-copy h2{
          margin:0;
          color:var(--hero-foreground);
          font-size:clamp(30px,4vw,52px);
          line-height:1.06;
          font-weight:600;
          letter-spacing:0;
        }
        .showcase-copy p{
          margin:0;
          color:var(--hero-foreground-muted);
          font-size:16px;
          line-height:1.9;
          font-weight:400;
        }
        .showcase-visual{
          border:1px solid color-mix(in srgb,var(--hero-foreground) 18%,transparent);
          background:color-mix(in srgb,var(--hero-gradient-start) 54%,transparent);
          border-radius:var(--radius-sm);
          padding:18px;
          display:grid;
          gap:12px;
          backdrop-filter:blur(12px);
        }
        .visual-row{
          height:12px;
          width:62%;
          border-radius:var(--radius-pill);
          background:var(--accent);
        }
        .visual-row--wide{width:86%;height:14px}
        .visual-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:6px}
        .visual-grid span{
          height:92px;
          border-radius:var(--radius-sm);
          background:color-mix(in srgb,var(--hero-foreground) 10%,transparent);
          border:1px solid color-mix(in srgb,var(--hero-foreground) 14%,transparent);
        }
        .login-card{
          width:100%;
          min-height:640px;
          background:var(--surface-elevated);
          border:1px solid var(--border);
          border-radius:var(--radius-sm);
          box-shadow:var(--shadow-lg);
          padding:30px;
          display:flex;
          flex-direction:column;
          justify-content:center;
          gap:18px;
          box-sizing:border-box;
          min-width:0;
          max-width:100%;
          overflow:hidden;
        }
        .login-card.wide{max-width:560px}
        .language-row{display:flex;justify-content:flex-end;align-items:center;gap:8px}
        .language-row .sfm-theme-toggle{width:40px;min-width:40px;height:40px;border-radius:var(--radius-control)}
        .brand{text-align:center;display:flex;flex-direction:column;align-items:center;gap:7px}
        .brand h1{font-size:28px;line-height:1.25;font-weight:600;color:var(--foreground);margin:10px 0 0;letter-spacing:0}
        .brand p{font-size:13px;color:var(--foreground-secondary);font-weight:400;margin:0;line-height:1.8;max-width:360px;overflow-wrap:anywhere}
        .sfm-brand-mark--auth{border-radius:var(--radius-sm);box-shadow:var(--shadow-md);background:var(--hero-gradient-start)}
        .signup-steps{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
        .signup-steps span{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:var(--foreground-muted);padding:7px 13px;border-radius:var(--radius-pill);border:1px solid var(--border);transition:all .2s}
        .signup-steps span.active{color:var(--primary-hover);border-color:color-mix(in srgb,var(--primary) 36%,var(--border));background:var(--primary-soft)}
        .signup-steps span.done{color:var(--success);border-color:color-mix(in srgb,var(--success) 36%,var(--border));background:var(--success-soft)}
        .signup-steps b{font-size:13px;font-weight:600}
        .form{display:flex;flex-direction:column;gap:13px;width:100%;min-width:0}
        .auth-field{display:flex;flex-direction:column;gap:7px;cursor:pointer;width:100%;min-width:0}
        .auth-label{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--foreground-secondary);max-width:100%;min-width:0;overflow-wrap:anywhere}
        .auth-icon{display:flex;align-items:center;color:var(--primary)}
        .auth-field input,.auth-field select{
          height:var(--control-h-lg);
          border:1px solid var(--border-strong);
          border-radius:var(--radius-sm);
          padding:0 14px;
          font:400 14px/1.5 var(--font-ui);
          color:var(--foreground);
          background:var(--control-background);
          outline:0;
          width:100%;
          box-sizing:border-box;
          transition:border-color .15s,box-shadow .15s,background .15s;
          min-width:0;
        }
        .auth-field input::placeholder{color:var(--control-placeholder)}
        .auth-field input:focus,.auth-field select:focus{border-color:var(--focus-ring);box-shadow:var(--focus-shadow);background:var(--control-background)}
        .password-wrap{position:relative;display:flex;align-items:center;width:100%;min-width:0}
        .password-wrap input{padding-inline-end:44px;width:100%}
        .eye-btn{position:absolute;inset-inline-end:10px;background:none;border:none;cursor:pointer;color:var(--foreground-muted);display:flex;align-items:center;padding:6px;border-radius:var(--radius-sm)}
        .eye-btn:hover{color:var(--primary-hover);background:var(--surface-hover)}
        .strength-wrap{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .strength-bar{display:flex;gap:4px;flex:1;min-width:140px}
        .strength-bar span{flex:1;height:5px;border-radius:var(--radius-pill);background:var(--border);transition:background .2s}
        .strength-bar--weak span:nth-child(1){background:var(--danger)}
        .strength-bar--medium span:nth-child(1),.strength-bar--medium span:nth-child(2){background:var(--warning)}
        .strength-bar--strong span{background:var(--success)}
        .strength-label{font-size:12px;font-weight:600;color:var(--foreground-secondary)}
        .strength-hint{font-size:12px;color:var(--foreground-muted);font-weight:400}
        .pref-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .country-select{height:var(--control-h-lg);border:1px solid var(--border-strong);border-radius:var(--radius-sm);padding:0 14px;font:400 14px/1.5 var(--font-ui);color:var(--foreground);background:var(--control-background);outline:0;width:100%;cursor:pointer}
        .security-block{display:flex;flex-direction:column;gap:10px;padding:14px;background:var(--surface-muted);border-radius:var(--radius-sm);border:1px solid var(--border)}
        .field-hint{font-size:12px;color:var(--foreground-muted);font-weight:400;margin:0;line-height:1.6}
        .terms-row{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--foreground-secondary);font-weight:400;cursor:pointer;line-height:1.5}
        .terms-row input[type=checkbox]{width:16px;height:16px;flex-shrink:0;margin-top:2px;cursor:pointer;accent-color:var(--primary)}
        .terms-row a{color:var(--primary-hover);text-decoration:none;font-weight:600}
        .terms-row a:hover{text-decoration:underline}
        .terms-error{border:1px solid var(--danger);border-radius:var(--radius-sm);padding:6px 10px}
        .terms-error-msg{color:var(--danger);font-size:12px;font-weight:600;margin:0}
        .recovery-question-block{background:var(--warning-soft);border:1px solid color-mix(in srgb,var(--warning) 32%,var(--border));border-radius:var(--radius-sm);padding:14px;display:flex;flex-direction:column;gap:10px}
        .recovery-title{font-size:14px;font-weight:600;color:var(--warning);margin:0}
        .recovery-help{font-size:12px;color:var(--warning);font-weight:400;margin:0;line-height:1.5}
        .auth-msg{font-size:13px;font-weight:500;margin:0;padding:10px 14px;border-radius:var(--radius-sm);line-height:1.5}
        .auth-msg--error{background:var(--danger-soft);color:var(--danger);border:1px solid color-mix(in srgb,var(--danger) 32%,var(--border))}
        .auth-msg--ok{background:var(--success-soft);color:var(--success);border:1px solid color-mix(in srgb,var(--success) 32%,var(--border))}
        .submit-btn{height:var(--control-h-lg);border-radius:var(--radius-sm);background:var(--primary);color:var(--primary-foreground);font:600 15px/1.4 var(--font-ui);border:1px solid var(--primary);cursor:pointer;transition:background-color .15s,transform .1s;width:100%;box-shadow:var(--shadow-xs)}
        .submit-btn:hover:not(:disabled){opacity:.92}
        .submit-btn:active:not(:disabled){transform:translateY(1px)}
        .submit-btn:disabled{opacity:.55;cursor:not-allowed}
        .social-login-block{display:flex;flex-direction:column;gap:10px;margin-top:-2px;width:100%;min-width:0}
        .social-divider{display:flex;align-items:center;gap:10px}
        .social-divider:before,.social-divider:after{content:"";flex:1;height:1px;background:var(--border)}
        .social-divider span{font-size:12px;color:var(--foreground-muted);font-weight:500;white-space:nowrap}
        .social-btn{display:flex;align-items:center;justify-content:center;gap:9px;height:var(--control-h);border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--surface);color:var(--foreground);font:600 13px/1.4 var(--font-ui);cursor:pointer;transition:background .15s,border-color .15s;width:100%}
        .social-btn svg{color:var(--foreground-secondary)}
        .google-btn:hover:not(:disabled){background:var(--surface-hover);border-color:var(--border-strong)}
        .social-btn:disabled{opacity:.5;cursor:not-allowed}
        .actions{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;width:100%;min-width:0}
        .link-btn{background:none;border:none;cursor:pointer;color:var(--primary-hover);font:500 13px/1.4 var(--font-ui);padding:4px 2px;text-decoration:none;transition:color .15s;white-space:normal}
        .link-btn:hover{color:var(--primary);text-decoration:underline}
        .link-btn:disabled{opacity:.5;cursor:not-allowed}
        .guest-btn{color:var(--foreground-muted)}
        .guest-btn:hover{color:var(--primary-hover)}
        @media(max-width:920px){
          .login-stage,[dir="rtl"] .login-stage{grid-template-columns:minmax(0,1fr);width:100%;max-width:520px}
          .login-showcase{display:none}
          [dir="rtl"] .login-card{grid-column:auto;grid-row:auto}
          .login-card{min-height:auto}
        }
        @media(max-width:520px){
          .login-shell{display:block;padding:12px;background:var(--background)}
          .login-stage,[dir="rtl"] .login-stage{display:block;width:100%;max-width:none;margin:80px 0 0}
          .login-card{width:100%;max-width:none;min-width:0;padding:22px 16px;border-radius:var(--radius-sm);gap:15px}
          .brand h1{font-size:24px}
          .brand p{width:100%;max-width:300px;font-size:12px;line-height:1.7}
          .auth-label{font-size:12px}
          .actions{gap:6px 10px}
          .link-btn{font-size:12px}
          .pref-row{grid-template-columns:1fr}
        }
      `}</style>
    </main>
  );
}

// ─── Helper components ───────────────────────────────────────────────────────

function AuthField({
  label,
  icon,
  required,
  children,
}: {
  label: string;
  icon?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="auth-field">
      <span className="auth-label">
        {icon && <span className="auth-icon">{icon}</span>}
        {label}
      </span>
      {children}
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
  onChange: (v: string) => void;
  placeholder?: string;
  show: boolean;
  onToggle: () => void;
  ariaLabel: string;
  autoComplete?: string;
}) {
  return (
    <label className="auth-field">
      <span className="auth-label">{label}</span>
      <span className="password-wrap">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          dir="ltr"
          suppressHydrationWarning
        />
        <button type="button" className="eye-btn" onClick={onToggle} aria-label={ariaLabel}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );
}

function PasswordStrengthBar({ password, text }: { password: string; text: AuthCopy }) {
  const strength = strengthFor(password);
  if (!password) return null;
  return (
    <div className="strength-wrap" aria-live="polite">
      <div className={'strength-bar strength-bar--' + strength}>
        <span /><span /><span /><span />
      </div>
      <span className="strength-label">{text[strength]}</span>
      {strength !== 'strong' && <span className="strength-hint">{text.recommended}</span>}
    </div>
  );
}
