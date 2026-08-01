import { SUPPORT_EMAIL } from '@/lib/constants/contact';

export type Lang = 'ar' | 'en' | 'fr';

export type SecurityProfile = {
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

export type TotpFactor = {
  id: string;
  friendly_name?: string | null;
  factor_type?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export type TotpEnrollment = {
  factorId: string;
  qr: string;
  secret: string;
  code: string;
  loading: boolean;
  error: string;
};

export const TEXT = {
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

export function formatDate(value: string | null | undefined, fallback: string, lang: string) {
  if (!value) return fallback;
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return fallback;
  }
}

export function detectDeviceLabel(lang: Lang) {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent;
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const browser = /Edg/i.test(ua) ? 'Edge' : /Chrome/i.test(ua) ? 'Chrome' : /Safari/i.test(ua) ? 'Safari' : /Firefox/i.test(ua) ? 'Firefox' : 'Browser';
  const device = mobile
    ? lang === 'ar' ? 'جهاز محمول' : lang === 'fr' ? 'Mobile' : 'Mobile'
    : lang === 'ar' ? 'سطح المكتب' : lang === 'fr' ? 'Ordinateur' : 'Desktop';
  return `${browser} • ${device}`;
}

export function scoreLabel(score: number, text: typeof TEXT[Lang]) {
  if (score >= 85) return text.strong;
  if (score >= 65) return text.good;
  if (score >= 45) return text.medium;
  return text.needsWork;
}

export function qrImageSource(qr: string) {
  if (!qr) return '';
  if (qr.startsWith('data:')) return qr;
  if (qr.trim().startsWith('<svg')) return `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`;
  return qr;
}
