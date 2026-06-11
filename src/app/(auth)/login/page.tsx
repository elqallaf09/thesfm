'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
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
import { isEmail } from '@/lib/authSecurity';
import { trackEvent } from '@/lib/analytics';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset' | 'twoFactor';
type Message = { type: 'error' | 'ok'; text: string } | null;
type PasswordStrength = 'weak' | 'medium' | 'strong';
type TwoFactorChallenge = {
  email: string;
};
const MIN_PASSWORD_LENGTH = 6;

function syncLoggedInCookies(session: Session | null) {
  if (typeof document === 'undefined') return;
  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `sfm_auth=${session ? 'true' : ''}; path=/; max-age=${session ? 60 * 60 * 24 * 30 : 0}; SameSite=Lax`;
  document.cookie = `sfm_access_token=${session?.access_token ?? ''}; path=/; max-age=${session?.access_token ? 60 * 60 * 24 * 7 : 0}; SameSite=Lax${secureFlag}`;
  document.cookie = 'sfm_guest=; path=/; max-age=0; SameSite=Lax';
  try {
    window.localStorage?.removeItem('sfm_guest_mode');
    window.localStorage?.removeItem('sfm_guest_started_at');
  } catch {
    // Keep login navigation working in restricted browser storage contexts.
  }
}

function setMfaRequiredCookie(required: boolean) {
  if (typeof document === 'undefined') return;
  document.cookie = `sfm_mfa_required=${required ? 'true' : ''}; path=/; max-age=${required ? 60 * 15 : 0}; SameSite=Lax`;
}

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
    <Suspense fallback={<main style={{ minHeight: '100vh', background: 'var(--sfm-light-card)' }} />}>
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
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [socialLoading, setSocialLoading] = useState<'google' | null>(null);

  const nextPath = useMemo(() => {
    const requested = searchParams.get('next') || '/dashboard';
    return requested.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard';
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
    if (session && mode !== 'reset' && mode !== 'twoFactor' && !submitting && !twoFactorChallenge) {
      supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
        if (data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
          setMfaRequiredCookie(true);
          router.refresh();
          router.replace(`/mfa/verify?next=${encodeURIComponent(nextPath)}`);
          return;
        }
        setMfaRequiredCookie(false);
        console.debug('[auth] redirect target', nextPath);
        router.refresh();
        router.replace(nextPath);
      });
    }
  }, [mode, nextPath, router, session, submitting, twoFactorChallenge]);

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

  async function sendLoginTwoFactorCode(emailAddress: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email: emailAddress,
      options: { shouldCreateUser: false },
    });
    return error;
  }

  async function getOrCreateLoginProfile(authUser: User, loginIdentifier: string) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email_2fa_enabled')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError) throw new Error(text.errorLoginGeneric);
    if (profile) return profile;

    const usernameFromLogin = !isEmail(loginIdentifier)
      ? loginIdentifier.trim().toLowerCase()
      : typeof authUser.user_metadata?.username === 'string'
        ? authUser.user_metadata.username.trim().toLowerCase()
        : null;

    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        email: authUser.email || null,
        username: usernameFromLogin || null,
        display_name: typeof authUser.user_metadata?.full_name === 'string'
          ? authUser.user_metadata.full_name
          : typeof authUser.user_metadata?.display_name === 'string'
            ? authUser.user_metadata.display_name
            : usernameFromLogin,
        created_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select('id, email_2fa_enabled')
      .single();

    if (createError) throw new Error(text.profileSetupNeeded);
    return createdProfile;
  }

  async function handleLogin() {
    console.debug('[auth] login started');
    const loginIdentifier = username.trim();
    if (!loginIdentifier || !password.trim()) return text.errorEmpty;
    const result = await signIn(loginIdentifier, password);
    if (result.error) {
      console.error('[auth] login error', result.error);
      if (result.code === 'username_not_found') return text.errorUsernameNotFound;
      if (result.code === 'profile_email_missing') return text.errorProfileEmailMissing;
      if (result.code === 'profile_missing') return text.profileSetupNeeded;
      if (result.code === 'invalid_credentials') return text.errorInvalidCredentials;
      return text.errorLoginGeneric;
    }
    const activeSession = result.session ?? (await supabase.auth.getSession()).data.session;
    if (!activeSession?.access_token) return text.errorLoginGeneric;
    const authUser = result.user ?? activeSession.user ?? null;
    if (!authUser?.id) return text.errorLoginGeneric;
    console.debug('[auth] login success', { userId: authUser.id });
    console.debug('[auth] session returned', { hasSession: Boolean(activeSession), hasAccessToken: Boolean(activeSession.access_token) });

    const profile = await getOrCreateLoginProfile(authUser, loginIdentifier);

    const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal.data?.nextLevel === 'aal2' && aal.data.currentLevel !== 'aal2') {
      syncLoggedInCookies(activeSession);
      setMfaRequiredCookie(true);
      console.debug('[auth] redirect target', '/mfa/verify');
      completeAuthRedirect(`/mfa/verify?next=${encodeURIComponent(nextPath)}`);
      return '';
    }

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
    syncLoggedInCookies(activeSession);
    setMfaRequiredCookie(false);
    console.debug('[auth] redirect target', nextPath);
    completeAuthRedirect(nextPath);
    return '';
  }

  async function handleTwoFactorLogin() {
    if (!twoFactorChallenge) return text.errorLogin;
    const code = twoFactorCode.trim();
    if (code.length !== 6) return text.invalidCode;
    const { data, error } = await supabase.auth.verifyOtp({
      email: twoFactorChallenge.email,
      token: code,
      type: 'email',
    });
    if (error) return error.message.toLowerCase().includes('expired') ? text.codeExpired : text.codeInvalidOrExpired;
    if (!data.session?.user) return text.errorLoginGeneric;
    console.debug('[auth] login success', { userId: data.session.user.id, twoFactor: true });
    console.debug('[auth] session returned', { hasSession: Boolean(data.session), hasAccessToken: Boolean(data.session.access_token) });
    syncLoggedInCookies(data.session);
    setMfaRequiredCookie(false);
    void trackEvent('login', { module: 'auth', metadata: { method: 'email_2fa' } });
    console.debug('[auth] redirect target', nextPath);
    completeAuthRedirect(nextPath);
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
        view_mode: 'simple',
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
          details: profileError.details,
          hint: profileError.hint,
          payload: profilePayload,
        });
        return text.errorProfileCreate;
      }

      console.debug('[auth] login success', { userId: newUser.id, source: 'register' });
      console.debug('[auth] session returned', { hasSession: Boolean(data.session), hasAccessToken: Boolean(data.session.access_token) });
      syncLoggedInCookies(data.session);
      void trackEvent('signup', { module: 'auth', metadata: { method: 'email' } });
      console.debug('[auth] redirect target', '/dashboard');
      completeAuthRedirect('/dashboard');
      return '';
    }

    setAuthMode('login');
    setMessage({ type: 'ok', text: text.checkEmail });
    return '';
  }

  async function handleForgotPassword() {
    const emailForReset = forgotEmail.trim().toLowerCase();
    if (!isEmail(emailForReset)) return text.errorEmail;

    const checkResponse = await fetch('/api/auth/password-reset/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailForReset }),
    }).catch(error => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[password-reset] Account check request failed', {
          email: emailForReset,
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    });

    if (!checkResponse) return text.resetVerifyError;
    if (checkResponse.status === 400) return text.errorEmail;
    if (!checkResponse.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[password-reset] Account check returned error', {
          email: emailForReset,
          status: checkResponse.status,
        });
      }
      return text.resetVerifyError;
    }

    const checkPayload = await checkResponse.json().catch(() => null) as { exists?: boolean } | null;
    if (!checkPayload?.exists) return text.resetAccountNotFound;

    const { error } = await supabase.auth.resetPasswordForEmail(emailForReset, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (process.env.NODE_ENV === 'development') {
      console.debug('[password-reset] resetPasswordForEmail response', {
        email: emailForReset,
        ok: !error,
        errorCode: error?.code,
        errorMessage: error?.message,
      });
    }
    if (error) return error.message || text.resetSendError;
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
    if (submitting) return;
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
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) setMessage({ type: 'error', text: error.message });
    setSocialLoading(null);
  }

  function enterGuestMode() {
    continueAsGuest();
    router.refresh();
    router.replace('/dashboard');
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
                <input value={username} onChange={event => setUsername(event.target.value)} placeholder={text.loginPlaceholder} autoComplete="username" />
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
            <AuthField label={text.email} icon={<Mail size={18} />} required>
              <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder={text.emailPlaceholder} type="email" autoComplete="email" dir="ltr" />
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
                onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
            disabled={submitting || !!socialLoading}
            aria-busy={submitting}
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
              disabled={!!socialLoading || submitting}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
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
          {mode === 'login' && (
            <button type="button" className="link-btn guest-btn" onClick={enterGuestMode}>
              {text.guest}
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
          background:
            linear-gradient(135deg,#f7fbff 0%,#eef7ff 42%,#f8fbff 100%);
          padding:32px 18px;
          color:#0b172a;
          font-family:Tajawal,Arial,sans-serif;
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
          border:1px solid rgba(15,118,110,.18);
          background:
            linear-gradient(145deg,#07182c 0%,#0a2339 56%,#063239 100%);
          border-radius:8px;
          padding:34px;
          display:grid;
          align-content:space-between;
          gap:28px;
          overflow:hidden;
          box-shadow:0 24px 70px rgba(11,23,42,.16);
          position:relative;
          box-sizing:border-box;
          min-width:0;
          max-width:100%;
        }
        .login-showcase:before{
          content:"";
          position:absolute;
          inset:0;
          background:
            linear-gradient(90deg,rgba(45,212,191,.10) 1px,transparent 1px),
            linear-gradient(0deg,rgba(45,212,191,.08) 1px,transparent 1px);
          background-size:48px 48px;
          opacity:.42;
        }
        .login-showcase>*{position:relative;z-index:1}
        .showcase-brand{
          display:flex;
          align-items:center;
          gap:12px;
          color:#f8fafc;
          font-size:20px;
          font-weight:950;
          letter-spacing:0;
        }
        .showcase-brand img{
          width:56px;
          height:56px;
          border-radius:8px;
          filter:drop-shadow(0 10px 24px rgba(45,212,191,.22));
        }
        .showcase-copy{
          max-width:520px;
          display:grid;
          gap:12px;
        }
        .showcase-copy span{
          width:max-content;
          border:1px solid rgba(45,212,191,.36);
          color:#99f6e4;
          background:rgba(45,212,191,.10);
          border-radius:999px;
          padding:7px 11px;
          font-size:12px;
          font-weight:950;
          letter-spacing:0;
        }
        .showcase-copy h2{
          margin:0;
          color:#f8fafc;
          font-size:clamp(30px,4vw,52px);
          line-height:1.06;
          font-weight:950;
          letter-spacing:0;
        }
        .showcase-copy p{
          margin:0;
          color:#c8d8e8;
          font-size:16px;
          line-height:1.9;
          font-weight:800;
        }
        .showcase-visual{
          border:1px solid rgba(148,163,184,.18);
          background:rgba(2,8,23,.35);
          border-radius:8px;
          padding:18px;
          display:grid;
          gap:12px;
          backdrop-filter:blur(12px);
        }
        .visual-row{
          height:12px;
          width:62%;
          border-radius:999px;
          background:linear-gradient(90deg,rgba(45,212,191,.85),rgba(56,189,248,.36));
        }
        .visual-row--wide{width:86%;height:14px}
        .visual-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:6px}
        .visual-grid span{
          height:92px;
          border-radius:8px;
          background:linear-gradient(180deg,rgba(248,250,252,.16),rgba(45,212,191,.08));
          border:1px solid rgba(148,163,184,.14);
        }
        .login-card{
          width:100%;
          min-height:640px;
          background:rgba(255,255,255,.96);
          border:1px solid rgba(15,118,110,.14);
          border-radius:8px;
          box-shadow:0 24px 70px rgba(11,23,42,.14);
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
        .language-row{display:flex;justify-content:flex-end}
        .brand{text-align:center;display:flex;flex-direction:column;align-items:center;gap:7px}
        .brand h1{font-size:28px;line-height:1.15;font-weight:950;color:#0b172a;margin:10px 0 0;letter-spacing:0}
        .brand p{font-size:13px;color:#64748b;font-weight:800;margin:0;line-height:1.8;max-width:360px;overflow-wrap:anywhere}
        .sfm-brand-mark--auth{border-radius:8px;box-shadow:0 14px 34px rgba(11,23,42,.14);background:#07182c}
        .signup-steps{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
        .signup-steps span{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:900;color:#94a3b8;padding:7px 13px;border-radius:999px;border:1px solid #e2e8f0;transition:all .2s}
        .signup-steps span.active{color:#0f766e;border-color:#2dd4bf;background:#ecfeff}
        .signup-steps span.done{color:#047857;border-color:#10b981;background:#ecfdf5}
        .signup-steps b{font-size:13px;font-weight:950}
        .form{display:flex;flex-direction:column;gap:13px;width:100%;min-width:0}
        .auth-field{display:flex;flex-direction:column;gap:7px;cursor:pointer;width:100%;min-width:0}
        .auth-label{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:950;color:#334155;max-width:100%;min-width:0;overflow-wrap:anywhere}
        .auth-icon{display:flex;align-items:center;color:#0f766e}
        .auth-field input,.auth-field select{
          height:48px;
          border:1px solid #cfe1ee;
          border-radius:8px;
          padding:0 14px;
          font:850 14px Tajawal,Arial,sans-serif;
          color:#0b172a;
          background:#fff;
          outline:0;
          width:100%;
          box-sizing:border-box;
          transition:border-color .15s,box-shadow .15s,background .15s;
          min-width:0;
        }
        .auth-field input::placeholder{color:#94a3b8}
        .auth-field input:focus,.auth-field select:focus{border-color:#14b8a6;box-shadow:0 0 0 4px rgba(20,184,166,.13);background:#fbfeff}
        .password-wrap{position:relative;display:flex;align-items:center;width:100%;min-width:0}
        .password-wrap input{padding-inline-end:44px;width:100%}
        .eye-btn{position:absolute;inset-inline-end:10px;background:none;border:none;cursor:pointer;color:#64748b;display:flex;align-items:center;padding:6px;border-radius:8px}
        .eye-btn:hover{color:#0f766e;background:#f1f5f9}
        .strength-wrap{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .strength-bar{display:flex;gap:4px;flex:1;min-width:140px}
        .strength-bar span{flex:1;height:5px;border-radius:999px;background:#e2e8f0;transition:background .2s}
        .strength-bar--weak span:nth-child(1){background:#ef4444}
        .strength-bar--medium span:nth-child(1),.strength-bar--medium span:nth-child(2){background:#f59e0b}
        .strength-bar--strong span{background:#10b981}
        .strength-label{font-size:12px;font-weight:950;color:#64748b}
        .strength-hint{font-size:11px;color:#94a3b8;font-weight:800}
        .pref-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .country-select{height:48px;border:1px solid #cfe1ee;border-radius:8px;padding:0 14px;font:850 14px Tajawal,Arial,sans-serif;color:#0b172a;background:#fff;outline:0;width:100%;cursor:pointer}
        .security-block{display:flex;flex-direction:column;gap:10px;padding:14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
        .field-hint{font-size:11px;color:#64748b;font-weight:800;margin:0;line-height:1.6}
        .terms-row{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:#475569;font-weight:800;cursor:pointer;line-height:1.5}
        .terms-row input[type=checkbox]{width:16px;height:16px;flex-shrink:0;margin-top:2px;cursor:pointer;accent-color:#0f766e}
        .terms-row a{color:#0f766e;text-decoration:none;font-weight:950}
        .terms-row a:hover{text-decoration:underline}
        .terms-error{border:1px solid #ef4444;border-radius:8px;padding:6px 10px}
        .terms-error-msg{color:#dc2626;font-size:12px;font-weight:950;margin:0}
        .recovery-question-block{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:10px}
        .recovery-title{font-size:14px;font-weight:950;color:#9a3412;margin:0}
        .recovery-help{font-size:12px;color:#c2410c;font-weight:800;margin:0;line-height:1.5}
        .auth-msg{font-size:13px;font-weight:850;margin:0;padding:10px 14px;border-radius:8px;line-height:1.5}
        .auth-msg--error{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
        .auth-msg--ok{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
        .submit-btn{height:50px;border-radius:8px;background:linear-gradient(135deg,#0f766e,#0891b2);color:#fff;font:950 15px Tajawal,Arial,sans-serif;border:none;cursor:pointer;transition:opacity .15s,transform .1s;width:100%;box-shadow:0 14px 28px rgba(15,118,110,.22)}
        .submit-btn:hover:not(:disabled){opacity:.92}
        .submit-btn:active:not(:disabled){transform:translateY(1px)}
        .submit-btn:disabled{opacity:.55;cursor:not-allowed}
        .social-login-block{display:flex;flex-direction:column;gap:10px;margin-top:-2px;width:100%;min-width:0}
        .social-divider{display:flex;align-items:center;gap:10px}
        .social-divider:before,.social-divider:after{content:"";flex:1;height:1px;background:#e2e8f0}
        .social-divider span{font-size:12px;color:#64748b;font-weight:950;white-space:nowrap}
        .social-btn{display:flex;align-items:center;justify-content:center;gap:9px;height:46px;border:1px solid #cfe1ee;border-radius:8px;background:#fff;color:#0b172a;font:950 13px Tajawal,Arial,sans-serif;cursor:pointer;transition:background .15s,border-color .15s;width:100%}
        .google-btn:hover:not(:disabled){background:#fff7f7;border-color:#ea4335}
        .social-btn:disabled{opacity:.5;cursor:not-allowed}
        .actions{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;width:100%;min-width:0}
        .link-btn{background:none;border:none;cursor:pointer;color:#0f766e;font:850 13px Tajawal,Arial,sans-serif;padding:4px 2px;text-decoration:none;transition:color .15s;white-space:normal}
        .link-btn:hover{color:#0891b2;text-decoration:underline}
        .link-btn:disabled{opacity:.5;cursor:not-allowed}
        .guest-btn{color:#64748b}
        .guest-btn:hover{color:#0f766e}
        @media(max-width:920px){
          .login-stage,[dir="rtl"] .login-stage{grid-template-columns:minmax(0,1fr);width:100%;max-width:520px}
          .login-showcase{display:none}
          [dir="rtl"] .login-card{grid-column:auto;grid-row:auto}
          .login-card{min-height:auto}
        }
        @media(max-width:520px){
          .login-shell{display:block;padding:12px;background:#f8fbff}
          .login-stage,[dir="rtl"] .login-stage{display:block;width:100%;max-width:none;margin:80px 0 0}
          .login-card{width:100%;max-width:none;min-width:0;padding:22px 16px;border-radius:8px;gap:15px}
          .brand h1{font-size:24px}
          .brand p{width:100%;max-width:300px;font-size:12px;line-height:1.7}
          .auth-label{font-size:11px}
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
