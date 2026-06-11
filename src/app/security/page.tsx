'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Download,
  EyeOff,
  FileText,
  HelpCircle,
  KeyRound,
  Laptop,
  LockKeyhole,
  Mail,
  QrCode,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { AppCard } from '@/components/layout/AppCard';
import { ActionRow } from '@/components/layout/ActionRow';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORT_EMAIL, SUPPORT_EMAIL_ARIA_LABEL, SUPPORT_EMAIL_MAILTO, SUPPORT_EMAIL_SUPPORT_MAILTO } from '@/lib/constants/contact';

type Lang = 'ar' | 'en' | 'fr';

type SecurityProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  security_question: string | null;
  security_question_2: string | null;
  security_question_3: string | null;
  email_2fa_enabled: boolean | null;
  email_2fa_enabled_at: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type TotpFactor = {
  id: string;
  friendly_name?: string | null;
  factor_type?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type TotpEnrollment = {
  factorId: string;
  qr: string;
  secret: string;
  code: string;
  loading: boolean;
  error: string;
};

const TEXT = {
  ar: {
    title: 'الأمان والخصوصية',
    subtitle: 'مركز واضح لإدارة حماية حسابك، فهم استخدام بياناتك، والوصول إلى ضوابط الخصوصية المهمة في THE SFM.',
    eyebrow: 'ثقة مالية وحماية عملية',
    openProfile: 'فتح الملف الشخصي',
    scoreTitle: 'مستوى أمان الحساب',
    strong: 'قوي',
    medium: 'متوسط',
    needsWork: 'يحتاج تحسين',
    good: 'جيد',
    emailVerified: 'البريد الإلكتروني مؤكد',
    emailNotVerified: 'البريد الإلكتروني غير مؤكد',
    twoFactor: 'المصادقة الثنائية',
    enabled: 'مفعّل',
    disabled: 'غير مفعّل',
    soon: 'قريبًا',
    passwordStrength: 'قوة كلمة المرور',
    lastLogin: 'آخر تسجيل دخول',
    devicesCount: 'عدد الأجهزة المتصلة',
    unknown: 'غير متوفر',
    accountProtection: 'حماية الحساب',
    accountProtectionDesc: 'أكمل عناصر الحماية الأساسية لتقليل مخاطر الوصول غير المصرح به.',
    email2fa: 'التحقق الثنائي عبر البريد',
    email2faDesc: 'طبقة تحقق إضافية عبر رمز يتم إرساله إلى بريدك الإلكتروني.',
    app2fa: 'تطبيق المصادقة',
    app2faDesc: 'استخدم Google Authenticator أو Microsoft Authenticator لتأمين حسابك.',
    backupCodes: 'رموز الاسترداد',
    backupCodesDesc: 'سيتم توفير رموز احتياطية لاستعادة الدخول في حال فقدان الوصول إلى جهاز المصادقة.',
    enabledAt: 'تاريخ التفعيل',
    lastEnabled: 'آخر تفعيل',
    enable: 'تفعيل',
    disable: 'إيقاف',
    enable2fa: 'تفعيل التحقق الثنائي',
    disable2fa: 'إيقاف التحقق الثنائي',
    manageInProfile: 'إدارة التحقق من الملف الشخصي',
    setupAuthenticator: 'تفعيل تطبيق المصادقة',
    scanQr: 'امسح رمز QR باستخدام تطبيق المصادقة، أو أدخل المفتاح اليدوي عند الحاجة.',
    manualSecret: 'المفتاح اليدوي',
    enterAuthenticatorCode: 'أدخل رمز التطبيق المكوّن من 6 أرقام',
    verifyAndEnable: 'تحقق وفعّل',
    enabling: 'جاري التفعيل...',
    mfaEnabledSuccess: 'تم تفعيل المصادقة الثنائية بنجاح',
    mfaDisabledSuccess: 'تم إيقاف المصادقة الثنائية',
    mfaLoadError: 'تعذر تحميل عوامل المصادقة الثنائية.',
    mfaEnrollError: 'تعذر بدء تفعيل تطبيق المصادقة.',
    mfaVerifyError: 'رمز المصادقة غير صحيح أو انتهت صلاحيته.',
    disableMfaTitle: 'هل تريد إيقاف المصادقة الثنائية؟',
    disableMfaText: 'سيؤدي ذلك إلى إزالة حماية تطبيق المصادقة من حسابك.',
    confirmDisable: 'تأكيد الإيقاف',
    devices: 'الأجهزة والجلسات',
    currentDevice: 'الجهاز الحالي',
    currentSession: 'الجلسة الحالية',
    browserDevice: 'المتصفح / الجهاز',
    ipLocation: 'عنوان IP / الموقع',
    sessionsSoon: 'إدارة الأجهزة قادمة قريبًا',
    signOutAll: 'تسجيل الخروج من كل الأجهزة',
    activityLog: 'سجل النشاط الأمني',
    noActivity: 'لا يوجد نشاط أمني حديث',
    newLogin: 'تسجيل دخول جديد',
    passwordChange: 'تغيير كلمة المرور',
    emailUpdate: 'تحديث البريد الإلكتروني',
    twoFactorEnabled: 'تفعيل المصادقة الثنائية',
    privacyUpdate: 'تحديث إعدادات الخصوصية',
    dataDeleted: 'حذف بيانات',
    dataUsage: 'استخدام بياناتك',
    dataUsageIntro: 'نستخدم بياناتك فقط لتشغيل التجربة المالية داخل حسابك، مثل:',
    noDataSale: 'لا نبيع بياناتك، ولا نشاركها مع أطراف خارجية لأغراض إعلانية.',
    incomeAnalysis: 'تحليل الدخل',
    expenseAnalysis: 'تحليل المصروفات',
    reports: 'بناء التقارير',
    smartRecommendations: 'تحسين التوصيات الذكية',
    goals: 'متابعة الأهداف المالية',
    zakat: 'حساب الزكاة والأعمال الخيرية عند تفعيلها',
    exportDelete: 'تصدير البيانات والحذف',
    exportDeleteDesc: 'تحكم في نسخة بياناتك وطلبات الحذف الحساسة من مكان واحد.',
    downloadData: 'تحميل نسخة من بياناتي',
    deleteAnalytics: 'حذف بيانات التحليلات',
    deleteAccount: 'حذف الحساب نهائيًا',
    analyticsSoon: 'حذف بيانات التحليلات يحتاج مسار خادم آمن وسيتم توفيره قريبًا.',
    deleteAccountNote: 'حذف الحساب النهائي يتطلب تأكيدًا صريحًا لحماية المستخدم من الحذف غير المقصود.',
    deleteModalTitle: 'تأكيد حذف الحساب',
    deleteModalText: 'هذا الإجراء سيحذف بياناتك نهائيًا ولا يمكن التراجع عنه.',
    deletePhrase: 'حذف حسابي',
    typePhrase: 'اكتب: حذف حسابي',
    confirmDelete: 'تأكيد طلب حذف الحساب',
    cancel: 'إلغاء',
    deleteRequestPrepared: 'تم تجهيز طلب حذف الحساب. يرجى إرساله لفريق الدعم لإتمام التحقق الآمن.',
    exportSuccess: 'تم تحميل نسخة بياناتك.',
    privacyFaq: 'سياسة الخصوصية',
    contactPrivacy: 'التواصل بخصوص الخصوصية',
    supportDesc: 'لأي سؤال متعلق بالأمان أو الخصوصية أو طلبات البيانات، تواصل معنا عبر:',
    loading: 'جاري تحميل إعدادات الأمان...',
    loadError: 'تعذر تحميل بيانات الأمان حاليًا.',
    retry: 'إعادة المحاولة',
    questions: [
      ['ما البيانات التي نجمعها؟', 'نجمع بيانات الحساب الأساسية والبيانات المالية التي تدخلها مثل الدخل، المصروفات، الأهداف، المشاريع، والزكاة عند استخدامها.'],
      ['كيف نستخدم بياناتك؟', 'نستخدمها لتشغيل التحليلات، التقارير، التوصيات الذكية، ومتابعة خطتك المالية داخل حسابك.'],
      ['هل يتم بيع بياناتي؟', 'لا. لا نبيع بياناتك ولا نشاركها لأغراض إعلانية.'],
      ['كيف أحذف بياناتي؟', 'يمكنك طلب حذف الحساب أو بيانات محددة من قسم تصدير البيانات والحذف، وقد نطلب تحققًا إضافيًا لحماية الحساب.'],
      ['كيف يتم تأمين الحساب؟', 'نعتمد جلسات مصادقة آمنة، سياسات وصول حسب المستخدم، وخيارات تحقق ثنائي عند تفعيلها.'],
      ['كيف أتواصل بخصوص الخصوصية؟', `يمكنك التواصل عبر ${SUPPORT_EMAIL} لأي طلب خصوصية أو أمان.`],
    ],
  },
  en: {
    title: 'Security & Privacy',
    subtitle: 'A clear hub for account protection, data usage, and privacy controls inside THE SFM.',
    eyebrow: 'Financial trust and practical protection',
    openProfile: 'Open Profile',
    scoreTitle: 'Account Security Score',
    strong: 'Strong',
    medium: 'Medium',
    needsWork: 'Needs improvement',
    good: 'Good',
    emailVerified: 'Email verified',
    emailNotVerified: 'Email not verified',
    twoFactor: 'Two-Factor Authentication',
    enabled: 'Enabled',
    disabled: 'Disabled',
    soon: 'Coming soon',
    passwordStrength: 'Password strength',
    lastLogin: 'Last login',
    devicesCount: 'Connected devices count',
    unknown: 'Unavailable',
    accountProtection: 'Account protection',
    accountProtectionDesc: 'Complete core protection steps to reduce unauthorized access risk.',
    email2fa: 'Email 2FA',
    email2faDesc: 'An extra verification layer using a code sent to your email address.',
    app2fa: 'Authenticator app 2FA',
    app2faDesc: 'Use Google Authenticator or Microsoft Authenticator to secure your account.',
    backupCodes: 'Backup codes',
    backupCodesDesc: 'Backup codes will help recover access if you lose your authenticator device.',
    enabledAt: 'Enabled at',
    lastEnabled: 'Last enabled',
    enable: 'Enable',
    disable: 'Disable',
    enable2fa: 'Enable two-factor authentication',
    disable2fa: 'Disable two-factor authentication',
    manageInProfile: 'Manage in Profile',
    setupAuthenticator: 'Enable authenticator app',
    scanQr: 'Scan the QR code with your authenticator app, or enter the manual key if needed.',
    manualSecret: 'Manual secret',
    enterAuthenticatorCode: 'Enter the 6-digit code from the app',
    verifyAndEnable: 'Verify and enable',
    enabling: 'Enabling...',
    mfaEnabledSuccess: 'Two-factor authentication was enabled successfully',
    mfaDisabledSuccess: 'Two-factor authentication was disabled',
    mfaLoadError: 'Could not load MFA factors.',
    mfaEnrollError: 'Could not start authenticator app setup.',
    mfaVerifyError: 'The authentication code is invalid or expired.',
    disableMfaTitle: 'Disable two-factor authentication?',
    disableMfaText: 'This will remove authenticator app protection from your account.',
    confirmDisable: 'Confirm disable',
    devices: 'Devices & Sessions',
    currentDevice: 'Current device',
    currentSession: 'Current session',
    browserDevice: 'Browser / device',
    ipLocation: 'IP / location',
    sessionsSoon: 'Device management is coming soon',
    signOutAll: 'Sign out of all devices',
    activityLog: 'Security Activity Log',
    noActivity: 'No recent security activity',
    newLogin: 'New login',
    passwordChange: 'Password change',
    emailUpdate: 'Email update',
    twoFactorEnabled: 'Two-factor authentication enabled',
    privacyUpdate: 'Privacy settings updated',
    dataDeleted: 'Data deleted',
    dataUsage: 'Data Usage',
    dataUsageIntro: 'We use your data only to power the financial experience inside your account, such as:',
    noDataSale: 'We do not sell your data or share it with external parties for advertising.',
    incomeAnalysis: 'Income analysis',
    expenseAnalysis: 'Expense analysis',
    reports: 'Report generation',
    smartRecommendations: 'Improving smart recommendations',
    goals: 'Financial goal tracking',
    zakat: 'Zakat and charity calculations when enabled',
    exportDelete: 'Data Export & Deletion',
    exportDeleteDesc: 'Control your data copy and sensitive deletion requests from one place.',
    downloadData: 'Download My Data',
    deleteAnalytics: 'Delete analytics data',
    deleteAccount: 'Delete Account Permanently',
    analyticsSoon: 'Analytics deletion requires a secure server flow and is coming soon.',
    deleteAccountNote: 'Permanent deletion requires explicit confirmation to protect users from accidental deletion.',
    deleteModalTitle: 'Confirm account deletion',
    deleteModalText: 'This action will permanently delete your data and cannot be undone.',
    deletePhrase: 'delete my account',
    typePhrase: 'Type: delete my account',
    confirmDelete: 'Confirm deletion request',
    cancel: 'Cancel',
    deleteRequestPrepared: 'Account deletion request prepared. Please send it to support to complete secure verification.',
    exportSuccess: 'Your data copy has been downloaded.',
    privacyFaq: 'Privacy Policy',
    contactPrivacy: 'Privacy support contact',
    supportDesc: 'For security, privacy, or data requests, contact us at:',
    loading: 'Loading security settings...',
    loadError: 'Could not load security data right now.',
    retry: 'Retry',
    questions: [
      ['What data do we collect?', 'We collect core account data and financial data you enter, such as income, expenses, goals, projects, and zakat when used.'],
      ['How do we use your data?', 'We use it to power analytics, reports, smart recommendations, and financial plan tracking inside your account.'],
      ['Do you sell my data?', 'No. We do not sell your data or share it for advertising.'],
      ['How do I delete my data?', 'You can request account or data deletion from the export and deletion section. Extra verification may be required.'],
      ['How is the account secured?', 'We use authenticated sessions, user-scoped access policies, and two-factor options where enabled.'],
      ['How do I contact privacy support?', `Contact ${SUPPORT_EMAIL} for privacy or security requests.`],
    ],
  },
  fr: {
    title: 'Sécurité et confidentialité',
    subtitle: 'Un espace clair pour protéger le compte, comprendre l’usage des données et gérer les contrôles de confidentialité dans THE SFM.',
    eyebrow: 'Confiance financière et protection pratique',
    openProfile: 'Ouvrir le profil',
    scoreTitle: 'Score de sécurité du compte',
    strong: 'Fort',
    medium: 'Moyen',
    needsWork: 'À améliorer',
    good: 'Bon',
    emailVerified: 'E-mail vérifié',
    emailNotVerified: 'E-mail non vérifié',
    twoFactor: 'Authentification à deux facteurs',
    enabled: 'Activé',
    disabled: 'Désactivé',
    soon: 'Bientôt',
    passwordStrength: 'Force du mot de passe',
    lastLogin: 'Dernière connexion',
    devicesCount: 'Nombre d’appareils connectés',
    unknown: 'Indisponible',
    accountProtection: 'Protection du compte',
    accountProtectionDesc: 'Complétez les protections essentielles pour réduire le risque d’accès non autorisé.',
    email2fa: '2FA par e-mail',
    email2faDesc: 'Une couche de vérification supplémentaire avec un code envoyé par e-mail.',
    app2fa: 'Application d’authentification',
    app2faDesc: 'Utilisez Google Authenticator ou Microsoft Authenticator pour sécuriser votre compte.',
    backupCodes: 'Codes de secours',
    backupCodesDesc: 'Des codes de secours permettront de récupérer l’accès si vous perdez votre appareil d’authentification.',
    enabledAt: 'Activé le',
    lastEnabled: 'Dernière activation',
    enable: 'Activer',
    disable: 'Désactiver',
    enable2fa: 'Activer l’authentification à deux facteurs',
    disable2fa: 'Désactiver l’authentification à deux facteurs',
    manageInProfile: 'Gérer dans le profil',
    setupAuthenticator: 'Activer l’application d’authentification',
    scanQr: 'Scannez le QR code avec votre application, ou saisissez la clé manuelle si nécessaire.',
    manualSecret: 'Clé manuelle',
    enterAuthenticatorCode: 'Saisissez le code à 6 chiffres de l’application',
    verifyAndEnable: 'Vérifier et activer',
    enabling: 'Activation...',
    mfaEnabledSuccess: 'L’authentification à deux facteurs a été activée',
    mfaDisabledSuccess: 'L’authentification à deux facteurs a été désactivée',
    mfaLoadError: 'Impossible de charger les facteurs MFA.',
    mfaEnrollError: 'Impossible de démarrer la configuration.',
    mfaVerifyError: 'Le code est invalide ou expiré.',
    disableMfaTitle: 'Désactiver l’authentification à deux facteurs ?',
    disableMfaText: 'Cela supprimera la protection par application d’authentification.',
    confirmDisable: 'Confirmer la désactivation',
    devices: 'Appareils et sessions',
    currentDevice: 'Appareil actuel',
    currentSession: 'Session actuelle',
    browserDevice: 'Navigateur / appareil',
    ipLocation: 'IP / localisation',
    sessionsSoon: 'La gestion des appareils arrive bientôt',
    signOutAll: 'Déconnecter tous les appareils',
    activityLog: 'Journal d’activité de sécurité',
    noActivity: 'Aucune activité de sécurité récente',
    newLogin: 'Nouvelle connexion',
    passwordChange: 'Changement de mot de passe',
    emailUpdate: 'Mise à jour de l’e-mail',
    twoFactorEnabled: 'Authentification à deux facteurs activée',
    privacyUpdate: 'Paramètres de confidentialité mis à jour',
    dataDeleted: 'Données supprimées',
    dataUsage: 'Utilisation des données',
    dataUsageIntro: 'Nous utilisons vos données uniquement pour alimenter l’expérience financière dans votre compte, comme :',
    noDataSale: 'Nous ne vendons pas vos données et ne les partageons pas à des fins publicitaires.',
    incomeAnalysis: 'Analyse des revenus',
    expenseAnalysis: 'Analyse des dépenses',
    reports: 'Création de rapports',
    smartRecommendations: 'Amélioration des recommandations intelligentes',
    goals: 'Suivi des objectifs financiers',
    zakat: 'Calculs de zakat et charité lorsque activés',
    exportDelete: 'Exportation et suppression des données',
    exportDeleteDesc: 'Contrôlez la copie de vos données et les demandes sensibles de suppression.',
    downloadData: 'Télécharger mes données',
    deleteAnalytics: 'Supprimer les données d’analyse',
    deleteAccount: 'Supprimer définitivement le compte',
    analyticsSoon: 'La suppression des analyses nécessite un flux serveur sécurisé et arrive bientôt.',
    deleteAccountNote: 'La suppression permanente exige une confirmation explicite pour éviter les suppressions accidentelles.',
    deleteModalTitle: 'Confirmer la suppression du compte',
    deleteModalText: 'Cette action supprimera définitivement vos données et ne peut pas être annulée.',
    deletePhrase: 'supprimer mon compte',
    typePhrase: 'Tapez : supprimer mon compte',
    confirmDelete: 'Confirmer la demande',
    cancel: 'Annuler',
    deleteRequestPrepared: 'Demande de suppression préparée. Envoyez-la au support pour finaliser la vérification sécurisée.',
    exportSuccess: 'Votre copie de données a été téléchargée.',
    privacyFaq: 'Politique de confidentialité',
    contactPrivacy: 'Contact confidentialité',
    supportDesc: 'Pour toute demande de sécurité, confidentialité ou données, contactez-nous à :',
    loading: 'Chargement des paramètres de sécurité...',
    loadError: 'Impossible de charger les données de sécurité.',
    retry: 'Réessayer',
    questions: [
      ['Quelles données collectons-nous ?', 'Nous collectons les données de compte et les données financières que vous saisissez : revenus, dépenses, objectifs, projets et zakat si utilisée.'],
      ['Comment utilisons-nous vos données ?', 'Nous les utilisons pour les analyses, rapports, recommandations intelligentes et le suivi du plan financier dans votre compte.'],
      ['Mes données sont-elles vendues ?', 'Non. Nous ne vendons pas vos données et ne les partageons pas à des fins publicitaires.'],
      ['Comment supprimer mes données ?', 'Vous pouvez demander la suppression du compte ou de données depuis la section exportation et suppression. Une vérification peut être requise.'],
      ['Comment le compte est-il sécurisé ?', 'Nous utilisons des sessions authentifiées, des politiques d’accès par utilisateur et des options 2FA lorsqu’elles sont activées.'],
      ['Comment contacter le support confidentialité ?', `Contactez ${SUPPORT_EMAIL} pour les demandes de confidentialité ou sécurité.`],
    ],
  },
} as const;

function formatDate(value: string | null | undefined, fallback: string, lang: string) {
  if (!value) return fallback;
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return fallback;
  }
}

function detectDeviceLabel(lang: Lang) {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent;
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const browser = /Edg/i.test(ua) ? 'Edge' : /Chrome/i.test(ua) ? 'Chrome' : /Safari/i.test(ua) ? 'Safari' : /Firefox/i.test(ua) ? 'Firefox' : 'Browser';
  const device = mobile
    ? lang === 'ar' ? 'جهاز محمول' : lang === 'fr' ? 'Mobile' : 'Mobile'
    : lang === 'ar' ? 'سطح المكتب' : lang === 'fr' ? 'Ordinateur' : 'Desktop';
  return `${browser} • ${device}`;
}

function scoreLabel(score: number, text: typeof TEXT[Lang]) {
  if (score >= 85) return text.strong;
  if (score >= 65) return text.good;
  if (score >= 45) return text.medium;
  return text.needsWork;
}

function qrImageSource(qr: string) {
  if (!qr) return '';
  if (qr.startsWith('data:')) return qr;
  if (qr.trim().startsWith('<svg')) return `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`;
  return qr;
}

export default function SecurityPage() {
  const { lang, dir } = useLanguage();
  const { user, session, signOut } = useAuth();
  const activeLang = ((lang as Lang) || 'ar') as Lang;
  const text = TEXT[activeLang];
  const [profile, setProfile] = useState<SecurityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [ipInfo, setIpInfo] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [totpFactors, setTotpFactors] = useState<TotpFactor[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [totpEnrollment, setTotpEnrollment] = useState<TotpEnrollment | null>(null);
  const [disableTotpFactor, setDisableTotpFactor] = useState<TotpFactor | null>(null);

  const loadProfile = async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id,username,display_name,email,phone_number,security_question,security_question_2,security_question_3,email_2fa_enabled,email_2fa_enabled_at,updated_at,created_at')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) {
      console.error('[security] Failed to load profile security data', profileError);
      setError(text.loadError);
    } else {
      setProfile(data as SecurityProfile | null);
    }
    setLoading(false);
  };

  async function loadMfaFactors() {
    if (!user?.id) {
      setTotpFactors([]);
      return;
    }
    setMfaError('');
    const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      console.error('[security] Failed to load MFA factors', factorsError);
      setMfaError(text.mfaLoadError);
      return;
    }
    setTotpFactors(((data?.totp || []) as TotpFactor[]).filter(factor => factor.status !== 'unverified'));
  }

  useEffect(() => {
    setDeviceLabel(detectDeviceLabel(activeLang));
  }, [activeLang]);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then((d: { ip?: string; city?: string; country_name?: string }) => {
        const parts = [d.ip, d.city, d.country_name].filter(Boolean);
        setIpInfo(parts.length ? parts.join(' · ') : null);
      })
      .catch(() => { /* silently ignore */ });
  }, []);

  useEffect(() => {
    void loadProfile();
    void loadMfaFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeLang]);

  const verifiedTotpFactor = useMemo(
    () => totpFactors.find(factor => factor.status === 'verified') || null,
    [totpFactors],
  );

  const security = useMemo(() => {
    const emailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
    const email2fa = Boolean(profile?.email_2fa_enabled);
    const totp2fa = Boolean(verifiedTotpFactor);
    const hasSecurityQuestions = Boolean(profile?.security_question && profile?.security_question_2);
    const hasProfileBasics = Boolean(profile?.display_name && profile?.email);
    const score =
      (emailVerified ? 25 : 0) +
      (totp2fa ? 25 : email2fa ? 18 : 0) +
      (hasSecurityQuestions ? 20 : 0) +
      (hasProfileBasics ? 15 : 0) +
      (session ? 15 : 0);
    return { score, emailVerified, email2fa, totp2fa, hasSecurityQuestions, hasProfileBasics };
  }, [profile, session, user, verifiedTotpFactor]);

  const activityItems = useMemo(() => {
    const items: Array<{ label: string; date: string | null | undefined; icon: LucideIcon }> = [];
    if (user?.last_sign_in_at) items.push({ label: text.newLogin, date: user.last_sign_in_at, icon: Activity });
    if (profile?.updated_at) items.push({ label: text.privacyUpdate, date: profile.updated_at, icon: ShieldCheck });
    if (profile?.email_2fa_enabled_at) items.push({ label: text.twoFactorEnabled, date: profile.email_2fa_enabled_at, icon: KeyRound });
    if (verifiedTotpFactor?.updated_at || verifiedTotpFactor?.created_at) items.push({ label: text.twoFactorEnabled, date: verifiedTotpFactor.updated_at || verifiedTotpFactor.created_at, icon: QrCode });
    return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 5);
  }, [profile, text, user, verifiedTotpFactor]);

  const protectionChecks = [
    { label: security.emailVerified ? text.emailVerified : text.emailNotVerified, done: security.emailVerified },
    { label: `${text.twoFactor}: ${security.totp2fa || security.email2fa ? text.enabled : text.disabled}`, done: security.totp2fa || security.email2fa },
    { label: `${text.passwordStrength}: ${security.hasSecurityQuestions ? text.strong : text.medium}`, done: security.hasSecurityQuestions },
    { label: `${text.lastLogin}: ${formatDate(user?.last_sign_in_at, text.unknown, activeLang)}`, done: Boolean(user?.last_sign_in_at) },
  ];

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  function downloadMyData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: {
        id: user?.id || null,
        email: user?.email || profile?.email || null,
        emailVerified: security.emailVerified,
        lastLogin: user?.last_sign_in_at || null,
      },
      profile,
      security: {
        score: security.score,
        email2faEnabled: security.email2fa,
        email2faEnabledAt: profile?.email_2fa_enabled_at || null,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `the-sfm-security-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(text.exportSuccess);
  }

  async function disableEmailTwoFactor() {
    if (!user?.id || !profile?.email_2fa_enabled) return;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ email_2fa_enabled: false, email_2fa_enabled_at: null, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (updateError) {
      console.error('[security] Failed to disable email 2FA', updateError);
      setError(text.loadError);
      return;
    }
    setProfile(prev => prev ? { ...prev, email_2fa_enabled: false, email_2fa_enabled_at: null, updated_at: new Date().toISOString() } : prev);
  }

  async function startTotpEnrollment() {
    setMfaLoading(true);
    setMfaError('');
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'THE SFM',
      });
      if (enrollError) throw enrollError;
      setTotpEnrollment({
        factorId: data.id,
        qr: qrImageSource(data.totp.qr_code),
        secret: (data.totp as { secret?: string; uri?: string }).secret || (data.totp as { secret?: string; uri?: string }).uri || '',
        code: '',
        loading: false,
        error: '',
      });
    } catch (enrollError) {
      console.error('[security] Failed to enroll TOTP MFA', enrollError);
      setMfaError(text.mfaEnrollError);
    } finally {
      setMfaLoading(false);
    }
  }

  async function verifyTotpEnrollment() {
    if (!totpEnrollment || totpEnrollment.code.length !== 6) {
      setTotpEnrollment(prev => prev ? { ...prev, error: text.mfaVerifyError } : prev);
      return;
    }
    setTotpEnrollment(prev => prev ? { ...prev, loading: true, error: '' } : prev);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: totpEnrollment.factorId });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({
        factorId: totpEnrollment.factorId,
        challengeId: challenge.data.id,
        code: totpEnrollment.code,
      });
      if (verify.error) throw verify.error;
      setTotpEnrollment(null);
      await loadMfaFactors();
      showToast(text.mfaEnabledSuccess);
    } catch (verifyError) {
      console.error('[security] Failed to verify TOTP MFA', verifyError);
      setTotpEnrollment(prev => prev ? { ...prev, loading: false, error: text.mfaVerifyError } : prev);
    }
  }

  async function disableTotp() {
    if (!disableTotpFactor) return;
    setMfaLoading(true);
    setMfaError('');
    try {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: disableTotpFactor.id });
      if (unenrollError) throw unenrollError;
      setDisableTotpFactor(null);
      await loadMfaFactors();
      showToast(text.mfaDisabledSuccess);
    } catch (unenrollError) {
      console.error('[security] Failed to unenroll TOTP MFA', unenrollError);
      setMfaError(text.mfaLoadError);
    } finally {
      setMfaLoading(false);
    }
  }

  function prepareDeleteRequest() {
    const body = encodeURIComponent([
      text.deleteRequestPrepared,
      '',
      `User ID: ${user?.id || 'unknown'}`,
      `Email: ${user?.email || profile?.email || 'unknown'}`,
      `Requested at: ${new Date().toISOString()}`,
    ].join('\n'));
    window.location.href = `${SUPPORT_EMAIL_MAILTO}?subject=${encodeURIComponent(text.deleteAccount)}&body=${body}`;
    setDeleteOpen(false);
    setDeletePhrase('');
  }

  return (
    <div className="security-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.title} contentClassName="security-content">
        <div className="sfm-page-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <PageHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          icon={<ShieldCheck size={28} />}
          actions={(
            <ActionRow>
              <Link className="sfm-primary-link" href="/profile">{text.openProfile}</Link>
            </ActionRow>
          )}
        />

        {toast && <div className="security-toast">{toast}</div>}
        {loading && <AppCard className="security-state">{text.loading}</AppCard>}
        {error && (
          <AppCard className="security-state danger">
            <span>{error}</span>
            <button type="button" onClick={() => void loadProfile()}>{text.retry}</button>
          </AppCard>
        )}

        <section className="security-score-grid">
          <AppCard className="security-score-card">
            <div className="security-score-copy">
              <span className="security-kicker"><Shield size={16} />{text.scoreTitle}</span>
              <h2 style={{ color: security.score >= 50 ? '#4ADE80' : '#F87171' }}>{security.score}%</h2>
              <p>{scoreLabel(security.score, text)}</p>
            </div>
            <div className="score-ring" style={{ '--score': `${security.score * 3.6}deg`, '--ring-color': security.score >= 50 ? '#22C55E' : '#EF4444' } as CSSProperties}>
              <strong style={{ color: security.score >= 50 ? '#4ADE80' : '#F87171' }}>{security.score}</strong>
              <span>/100</span>
            </div>
          </AppCard>

          <AppCard className="security-checks-card">
            <h2>{text.accountProtection}</h2>
            <p>{text.accountProtectionDesc}</p>
            <div className="check-list">
              {protectionChecks.map(item => (
                <div key={item.label} className={item.done ? 'check-row done' : 'check-row'}>
                  {item.done ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </AppCard>
        </section>

        <section className="security-main-grid">
          <SecuritySection title={text.twoFactor} icon={KeyRound}>
            {mfaError && <div className="message-inline danger">{mfaError}</div>}
            <div className="control-row">
              <div>
                <strong>{text.app2fa}</strong>
                <p>{text.app2faDesc}</p>
                <span className={verifiedTotpFactor ? 'status-pill on' : 'status-pill'}>{verifiedTotpFactor ? text.enabled : text.disabled}</span>
                {verifiedTotpFactor?.updated_at || verifiedTotpFactor?.created_at ? <small>{text.lastEnabled}: {formatDate(verifiedTotpFactor.updated_at || verifiedTotpFactor.created_at, text.unknown, activeLang)}</small> : null}
              </div>
              {verifiedTotpFactor ? (
                <button type="button" className="ghost-action danger" disabled={mfaLoading} onClick={() => setDisableTotpFactor(verifiedTotpFactor)}>{text.disable}</button>
              ) : (
                <button type="button" className="ghost-action" disabled={mfaLoading} onClick={() => void startTotpEnrollment()}>{mfaLoading ? text.enabling : text.enable}</button>
              )}
            </div>
            <div className="control-row">
              <div>
                <strong>{text.email2fa}</strong>
                <p>{text.email2faDesc}</p>
                <span className={security.email2fa ? 'status-pill on' : 'status-pill'}>{security.email2fa ? text.enabled : text.disabled}</span>
                {profile?.email_2fa_enabled_at && <small>{text.enabledAt}: {formatDate(profile.email_2fa_enabled_at, text.unknown, activeLang)}</small>}
              </div>
              {security.email2fa ? (
                <button type="button" className="ghost-action danger" onClick={() => void disableEmailTwoFactor()}>{text.disable}</button>
              ) : (
                <Link className="ghost-action" href="/profile">{text.enable}</Link>
              )}
            </div>
            <ComingSoonRow title={text.backupCodes} body={text.backupCodesDesc} label={text.soon} />
          </SecuritySection>

          <SecuritySection title={text.devices} icon={Laptop}>
            <div className="device-card">
              <Smartphone size={20} />
              <div>
                <strong>{text.currentDevice}</strong>
                <p>{deviceLabel || text.unknown}</p>
                <small>{text.lastLogin}: {formatDate(user?.last_sign_in_at, text.unknown, activeLang)}</small>
              </div>
            </div>
            <div className="muted-panel">
              <strong>{text.sessionsSoon}</strong>
              <p>{text.ipLocation}: {ipInfo ?? text.unknown}</p>
            </div>
            <button type="button" className="ghost-action full" onClick={() => void signOut()}>{text.signOutAll}</button>
          </SecuritySection>

          <SecuritySection title={text.activityLog} icon={Activity}>
            {activityItems.length ? (
              <div className="activity-list">
                {activityItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={`${item.label}-${item.date}`} className="activity-item">
                      <span><Icon size={16} /></span>
                      <div>
                        <strong>{item.label}</strong>
                        <p>{formatDate(item.date, text.unknown, activeLang)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-security"><Clock size={20} />{text.noActivity}</div>
            )}
          </SecuritySection>

          <SecuritySection title={text.dataUsage} icon={Database} wide>
            <p className="section-copy">{text.dataUsageIntro}</p>
            <div className="usage-grid">
              {[text.incomeAnalysis, text.expenseAnalysis, text.reports, text.smartRecommendations, text.goals, text.zakat].map(item => (
                <span key={item}><CheckCircle2 size={15} />{item}</span>
              ))}
            </div>
            <div className="no-sale"><EyeOff size={18} />{text.noDataSale}</div>
          </SecuritySection>

          <SecuritySection title={text.exportDelete} icon={FileText}>
            <p className="section-copy">{text.exportDeleteDesc}</p>
            <button type="button" className="solid-action" onClick={downloadMyData}><Download size={16} />{text.downloadData}</button>
            <div className="muted-panel">
              <strong>{text.deleteAnalytics}</strong>
              <p>{text.analyticsSoon}</p>
            </div>
            <button type="button" className="danger-action" onClick={() => setDeleteOpen(true)}><Trash2 size={16} />{text.deleteAccount}</button>
            <p className="danger-note">{text.deleteAccountNote}</p>
          </SecuritySection>

          <SecuritySection title={text.privacyFaq} icon={HelpCircle} wide>
            <div className="faq-list">
              {text.questions.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </SecuritySection>

          <SecuritySection title={text.contactPrivacy} icon={Mail} wide>
            <p className="section-copy">{text.supportDesc}</p>
            <a className="security-mail-link" href={SUPPORT_EMAIL_SUPPORT_MAILTO} aria-label={SUPPORT_EMAIL_ARIA_LABEL}>{SUPPORT_EMAIL}</a>
          </SecuritySection>
        </section>
      </DashboardPageShell>

      {deleteOpen && (
        <div className="security-modal-overlay" role="presentation" onMouseDown={() => setDeleteOpen(false)}>
          <div className="security-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onMouseDown={event => event.stopPropagation()}>
            <div className="modal-icon danger"><Trash2 size={22} /></div>
            <h2 id="delete-account-title">{text.deleteModalTitle}</h2>
            <p>{text.deleteModalText}</p>
            <label>
              <span>{text.typePhrase}</span>
              <input value={deletePhrase} onChange={event => setDeletePhrase(event.target.value)} autoFocus />
            </label>
            <div className="modal-actions">
              <button type="button" className="ghost-action" onClick={() => setDeleteOpen(false)}>{text.cancel}</button>
              <button type="button" className="danger-action" disabled={deletePhrase !== text.deletePhrase} onClick={prepareDeleteRequest}>{text.confirmDelete}</button>
            </div>
          </div>
        </div>
      )}

      {totpEnrollment && (
        <div className="security-modal-overlay" role="presentation" onMouseDown={() => setTotpEnrollment(null)}>
          <div className="security-modal mfa-modal" role="dialog" aria-modal="true" aria-labelledby="totp-enroll-title" onMouseDown={event => event.stopPropagation()}>
            <div className="modal-icon"><QrCode size={22} /></div>
            <h2 id="totp-enroll-title">{text.setupAuthenticator}</h2>
            <p>{text.scanQr}</p>
            {totpEnrollment.qr && <Image className="totp-qr" src={totpEnrollment.qr} alt={text.setupAuthenticator} width={190} height={190} unoptimized />}
            {totpEnrollment.secret && (
              <div className="manual-secret">
                <span>{text.manualSecret}</span>
                <code>{totpEnrollment.secret}</code>
              </div>
            )}
            <label>
              <span>{text.enterAuthenticatorCode}</span>
              <input
                value={totpEnrollment.code}
                onChange={event => setTotpEnrollment(prev => prev ? { ...prev, code: event.target.value.replace(/\D/g, '').slice(0, 6), error: '' } : prev)}
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                autoFocus
              />
            </label>
            {totpEnrollment.error && <div className="message-inline danger">{totpEnrollment.error}</div>}
            <div className="modal-actions">
              <button type="button" className="ghost-action" onClick={() => setTotpEnrollment(null)} disabled={totpEnrollment.loading}>{text.cancel}</button>
              <button type="button" className="solid-action" onClick={() => void verifyTotpEnrollment()} disabled={totpEnrollment.loading || totpEnrollment.code.length !== 6}>{totpEnrollment.loading ? text.enabling : text.verifyAndEnable}</button>
            </div>
          </div>
        </div>
      )}

      {disableTotpFactor && (
        <div className="security-modal-overlay" role="presentation" onMouseDown={() => setDisableTotpFactor(null)}>
          <div className="security-modal" role="dialog" aria-modal="true" aria-labelledby="disable-totp-title" onMouseDown={event => event.stopPropagation()}>
            <div className="modal-icon danger"><AlertTriangle size={22} /></div>
            <h2 id="disable-totp-title">{text.disableMfaTitle}</h2>
            <p>{text.disableMfaText}</p>
            <div className="modal-actions">
              <button type="button" className="ghost-action" onClick={() => setDisableTotpFactor(null)} disabled={mfaLoading}>{text.cancel}</button>
              <button type="button" className="danger-action" onClick={() => void disableTotp()} disabled={mfaLoading}>{mfaLoading ? text.enabling : text.confirmDisable}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .security-shell{min-height:100vh;background:radial-gradient(circle at 16% 8%,rgba(34,211,238,.12),transparent 30%),linear-gradient(160deg,var(--sfm-background),#F8FBFF 62%,#E7F1FF 100%)}
        .security-content{display:grid;gap:22px}
        .sfm-page-topbar{display:flex;justify-content:flex-end;align-items:center;gap:10px}
        .sfm-primary-link,.ghost-action,.solid-action,.danger-action{min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:999px;padding:0 16px;text-decoration:none;font:950 13px Tajawal,Arial,sans-serif;border:0;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
        .sfm-primary-link,.solid-action{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;box-shadow:0 12px 24px rgba(29,140,255,.20)}
        .ghost-action{border:1px solid rgba(29,140,255,.18);background:#fff;color:var(--sfm-primary-dark)}
        .ghost-action.danger,.danger-action{border:1px solid rgba(220,38,38,.20);background:#FEF2F2;color:#B91C1C}
        .danger-action:disabled{opacity:.45;cursor:not-allowed}
        .ghost-action.full{width:100%}
        .security-toast,.security-state,.message-inline{border:1px solid rgba(16,185,129,.20);background:rgba(16,185,129,.10);color:#047857;border-radius:16px;padding:12px 14px;font-weight:950}.message-inline.danger{background:#FEF2F2;border-color:#FCA5A5;color:#B91C1C}
        .security-state{display:flex;align-items:center;justify-content:space-between;gap:12px}.security-state.danger{background:#FEF2F2;border-color:#FCA5A5;color:#B91C1C}.security-state button{border:0;border-radius:999px;background:#fff;color:#B91C1C;padding:8px 12px;font-weight:950;cursor:pointer}
        .security-score-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(320px,.9fr);gap:18px}.security-score-card{display:flex;align-items:center;justify-content:space-between;gap:18px;background:linear-gradient(135deg,#061A2E,#0B2A4A);color:#F8FAFC;border-color:rgba(255,255,255,.10)}.security-kicker{display:inline-flex;align-items:center;gap:8px;color:#A7F3F0;font-weight:950}.security-score-copy{flex:1;display:flex;flex-direction:column;min-width:0}.security-score-copy h2{margin:10px 0 0;font-size:56px;line-height:1;color:#fff}.security-score-copy p{margin:8px 0 0;color:#CBD5E1;font-weight:950}.score-ring{width:128px;height:128px;display:grid;place-items:center;border-radius:50%;background:conic-gradient(var(--ring-color,#22D3EE) var(--score),rgba(255,255,255,.14) 0);position:relative;isolation:isolate}.score-ring:before{content:"";position:absolute;inset:10px;border-radius:50%;background:#071B2F;z-index:-1}.score-ring strong{font-size:30px;color:#fff}.score-ring span{margin-top:-34px;color:#94A3B8;font-weight:900}
        .security-checks-card h2,.security-section h2{margin:0;color:var(--sfm-primary-dark);font-size:20px}.security-checks-card p,.section-copy{margin:6px 0 0;color:var(--sfm-muted);font-weight:800;line-height:1.7}.check-list{display:grid;gap:9px;margin-top:14px}.check-row{display:flex;align-items:center;gap:9px;border:1px solid rgba(245,158,11,.20);background:#FFFBEB;color:#92400E;border-radius:14px;padding:10px 12px;font-weight:900}.check-row.done{border-color:rgba(16,185,129,.20);background:#ECFDF5;color:#047857}
        .security-main-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.security-section{display:grid;gap:14px}.security-section.wide{grid-column:1/-1}.section-head{display:flex;align-items:center;gap:10px}.section-head span{width:42px;height:42px;display:grid;place-items:center;border-radius:15px;background:rgba(29,140,255,.10);color:var(--sfm-primary)}
        .control-row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:18px;padding:14px}.control-row strong,.device-card strong,.muted-panel strong,.activity-item strong{display:block;color:var(--sfm-foreground);font-size:15px}.control-row p,.device-card p,.muted-panel p,.activity-item p,.danger-note{margin:4px 0 0;color:var(--sfm-muted);font-weight:800;line-height:1.65}.control-row small,.device-card small{display:block;margin-top:8px;color:#64748B;font-weight:900}
        .status-pill{display:inline-flex;width:max-content;margin-top:9px;border-radius:999px;border:1px solid rgba(100,116,139,.20);background:rgba(100,116,139,.10);color:var(--sfm-muted);padding:5px 10px;font-weight:950;font-size:12px}.status-pill.on{background:rgba(16,185,129,.14);border-color:rgba(16,185,129,.25);color:#047857}.coming-row,.muted-panel{border:1px solid rgba(100,116,139,.16);background:rgba(100,116,139,.08);border-radius:16px;padding:12px}.coming-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.coming-row h3{margin:0;color:var(--sfm-foreground);font-size:15px}.coming-row p{margin:4px 0 0;color:var(--sfm-muted);font-weight:800;line-height:1.6}.soon-badge{border-radius:999px;background:rgba(245,158,11,.14);color:#92400E;padding:5px 9px;font-weight:950;font-size:12px;white-space:nowrap}
        .device-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:start;border:1px solid rgba(34,211,238,.18);background:rgba(34,211,238,.08);border-radius:18px;padding:14px}.device-card svg{color:#0891B2}.activity-list{display:grid;gap:10px}.activity-item{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start}.activity-item>span{width:34px;height:34px;display:grid;place-items:center;border-radius:12px;background:rgba(16,185,129,.12);color:#047857}.empty-security{display:flex;align-items:center;gap:9px;color:var(--sfm-muted);font-weight:900;border:1px dashed rgba(100,116,139,.26);border-radius:16px;padding:16px}
        .usage-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.usage-grid span{display:flex;align-items:center;gap:8px;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:14px;padding:11px 12px;color:var(--sfm-foreground);font-weight:900}.usage-grid svg{color:#047857}.no-sale{display:flex;align-items:center;gap:9px;border:1px solid rgba(16,185,129,.18);background:rgba(16,185,129,.10);color:#047857;border-radius:16px;padding:13px;font-weight:950;line-height:1.6}
        .faq-list{display:grid;gap:10px}.faq-list details{border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:16px;padding:13px}.faq-list summary{cursor:pointer;color:var(--sfm-foreground);font-weight:950}.faq-list p{margin:10px 0 0;color:var(--sfm-muted);font-weight:800;line-height:1.8}.security-mail-link{width:max-content;max-width:100%;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;border:1px solid rgba(29,140,255,.18);background:rgba(29,140,255,.08);color:var(--sfm-primary-hover);padding:10px 14px;text-decoration:none;font:950 13px Tajawal,Arial,sans-serif;overflow-wrap:anywhere}
        .security-modal-overlay{position:fixed;inset:0;z-index:90;background:rgba(3,18,37,.58);backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px}.security-modal{width:min(520px,100%);max-height:calc(100dvh - 36px);overflow:auto;background:var(--sfm-card);border:1px solid rgba(255,255,255,.10);border-radius:24px;padding:22px;box-shadow:0 26px 80px rgba(3,18,37,.35);display:grid;gap:14px}.security-modal.mfa-modal{width:min(620px,100%)}.modal-icon{width:48px;height:48px;border-radius:17px;display:grid;place-items:center;background:rgba(34,211,238,.12);color:#0891B2}.modal-icon.danger{background:#FEF2F2;color:#B91C1C}.security-modal h2{margin:0;color:var(--sfm-foreground);font-size:21px}.security-modal p{margin:0;color:var(--sfm-muted);font-weight:800;line-height:1.7}.security-modal label{display:grid;gap:8px;color:var(--sfm-foreground);font-weight:950}.security-modal input{height:48px;border-radius:14px;border:1.5px solid rgba(29,140,255,.18);background:var(--sfm-light-card);color:var(--sfm-foreground);padding:0 13px;font:900 14px Tajawal,Arial,sans-serif;outline:0;text-align:center;letter-spacing:4px}.security-modal input:focus{border-color:#22D3EE;box-shadow:0 0 0 4px rgba(34,211,238,.12)}.modal-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}.totp-qr{width:190px;height:190px;object-fit:contain;justify-self:center;border:1px solid rgba(29,140,255,.14);border-radius:20px;background:#fff;padding:12px}.manual-secret{display:grid;gap:7px;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);border-radius:16px;padding:12px}.manual-secret span{font-weight:950;color:var(--sfm-foreground)}.manual-secret code{direction:ltr;text-align:left;white-space:normal;overflow-wrap:anywhere;color:#0F766E;font-weight:950}
        .dark .security-shell{background:radial-gradient(circle at 16% 8%,rgba(34,211,238,.14),transparent 30%),linear-gradient(160deg,#061A2E,#071B2F)}.dark .security-checks-card h2,.dark .security-section h2{color:#F8FAFC}.dark .ghost-action{background:#102F52;border-color:rgba(255,255,255,.10);color:#F8FAFC}.dark .control-row,.dark .usage-grid span,.dark .faq-list details,.dark .security-modal{background:#102A45;border-color:rgba(255,255,255,.10)}.dark .coming-row,.dark .muted-panel{background:#0F2942;border-color:rgba(255,255,255,.10)}.dark .control-row p,.dark .device-card p,.dark .muted-panel p,.dark .activity-item p,.dark .section-copy,.dark .faq-list p,.dark .security-modal p{color:#CBD5E1}.dark .control-row strong,.dark .device-card strong,.dark .muted-panel strong,.dark .activity-item strong,.dark .usage-grid span,.dark .faq-list summary,.dark .security-modal h2,.dark .security-modal label{color:#F8FAFC}.dark .security-modal input{background:#0F2942;border-color:rgba(255,255,255,.12);color:#F8FAFC}.dark .device-card{background:rgba(34,211,238,.10);border-color:rgba(34,211,238,.20)}.dark .security-mail-link{background:#102F52;color:#F8FAFC;border-color:rgba(255,255,255,.10)}
        @media(max-width:900px){.security-score-grid,.security-main-grid{grid-template-columns:1fr}.security-section.wide{grid-column:auto}.security-score-copy h2{font-size:44px}}@media(max-width:640px){.sfm-page-topbar{display:none}.security-score-card{display:grid}.score-ring{width:112px;height:112px}.control-row,.coming-row{display:grid}.sfm-primary-link,.ghost-action,.solid-action,.danger-action{width:100%}.modal-actions{display:grid;grid-template-columns:1fr}.security-content{gap:16px}}
      `}</style>
    </div>
  );
}

function SecuritySection({ title, icon: Icon, children, wide = false }: { title: string; icon: LucideIcon; children: ReactNode; wide?: boolean }) {
  return (
    <AppCard className={`security-section${wide ? ' wide' : ''}`}>
      <div className="section-head">
        <span><Icon size={20} /></span>
        <h2>{title}</h2>
      </div>
      {children}
    </AppCard>
  );
}

function ComingSoonRow({ title, body, label }: { title: string; body: string; label: string }) {
  return (
    <div className="coming-row">
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      <span className="soon-badge">{label}</span>
    </div>
  );
}
