'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BellRing,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Calculator,
  CheckCircle2,
  ChevronDown,
  FileText,
  FolderKanban,
  HandHeart,
  Instagram,
  Landmark,
  LineChart,
  Menu,
  PiggyBank,
  Presentation,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { flattenNavigationItems } from '@/components/navigationConfig';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { INSTAGRAM_ARIA_LABEL, INSTAGRAM_URL, SUPPORT_EMAIL, SUPPORT_EMAIL_ARIA_LABEL, SUPPORT_EMAIL_SUPPORT_MAILTO } from '@/lib/constants/contact';
import { TR_NAV } from '@/lib/translations/nav';

type Lang = 'ar' | 'en' | 'fr';
type TranslationTuple = readonly [string, string, string];

const COPY = {
  ar: {
    navFeatures: 'المميزات',
    navTools: 'الأدوات',
    navPricing: 'الأسعار',
    navFaq: 'الأسئلة الشائعة',
    login: 'تسجيل الدخول',
    start: 'ابدأ الآن',
    openDashboard: 'الدخول الى الصفحة الرئيسية',
    heroKicker: 'THE SFM',
    heroTitle: 'المنصة المالية الذكية لإدارة أموالك ومشاريعك',
    heroSubtitle: 'من الدخل والمصروفات إلى الزكاة والاستثمارات والمشاريع، كل شيء في منصة واحدة مبنية على بياناتك الحقيقية.',
    viewFeatures: 'شاهد المميزات',
    trustTitle: 'مؤشرات ثقة بدون أرقام غير موثقة',
    trustSubtitle: 'نوضح قدرات المنتج بدون عرض إحصاءات أو وعود غير مثبتة.',
    previewLabel: 'مثال توضيحي للواجهة — لا يعرض بيانات حقيقية',
    previewTitle: 'نظرة تشغيلية واحدة',
    previewSubtitle: 'بطاقات توضح طريقة تنظيم المنصة عند إضافة بياناتك الفعلية.',
    previewIncome: 'الدخل',
    previewExpenses: 'المصروفات',
    previewProjects: 'المشاريع',
    previewZakat: 'الزكاة',
    previewStatus: 'يعتمد على بياناتك الفعلية',
    previewMissing: 'تظهر بيانات غير كافية عند نقص المدخلات',
    trustRealData: 'بياناتك الحقيقية فقط',
    trustModules: 'المال والمشاريع في مساحة واحدة',
    trustLanguages: 'واجهة عربية وإنجليزية وفرنسية',
    trustGuardrails: 'حماية من الأرقام والتوقعات غير المدعومة',
    howTitle: 'كيف يعمل THE SFM؟',
    howSubtitle: 'ابدأ من الحساب والبيانات الحقيقية، ثم فعّل الأقسام التي تحتاجها حتى تظهر التحليلات عندما تصبح المدخلات كافية.',
    featuresTitle: 'كل أدواتك المالية في مكان واحد',
    featuresSubtitle: 'صممت THE SFM لتجميع المتابعة اليومية، التقارير، المشاريع، والزكاة بدون خلط البيانات الحقيقية مع بيانات تجريبية.',
    toolsFilterAll: 'الكل',
    toolsFilterPersonal: 'المال الشخصي',
    toolsFilterAi: 'الذكاء المالي',
    toolsFilterBusiness: 'المشاريع والأعمال',
    toolsFilterCharity: 'الزكاة والأعمال الخيرية',
    toolsFilterSecurity: 'الأمان والتقارير',
    toolOpen: 'فتح',
    toolBadgeSmart: 'ذكي',
    toolBadgeNew: 'جديد',
    toolBadgeCore: 'أساسي',
    aiTitle: 'مساعد مالي ذكي يحترم بياناتك',
    aiSubtitle: 'يقرأ المساعد بياناتك الفعلية ويقترح الخطوات القادمة عندما تكون المعلومات كافية. إذا كانت البيانات ناقصة، يعرض ذلك بوضوح بدلاً من اختراع أرقام.',
    aiExampleLabel: 'مثال توضيحي',
    aiExampleText: 'أضف الدخل والمصروفات والمدخرات للحصول على تحليل أدق.',
    usersTitle: 'من يستخدم THE SFM؟',
    usersSubtitle: 'للأفراد ورواد الأعمال والفرق الصغيرة التي تريد رؤية مالية أوضح دون ضجيج.',
    pricingTitle: 'الأسعار',
    pricingSubtitle: 'اختر الخطة المناسبة وابدأ بإدارة أموالك بوضوح.',
    pricingBillingMonthly: 'شهري',
    pricingBillingYearly: 'سنوي',
    pricingYearlyNote: 'وفّر أكثر عند الاشتراك السنوي',
    pricingMostSuitable: 'الأكثر مناسبة',
    pricingFreePrice: 'مجاني',
    pricingPremiumMonthlyPrice: '20$ / شهرياً',
    pricingPremiumYearlyPrice: '100$ / سنوياً',
    pricingCompanyPrice: '50$ / سنوياً',
    pricingYearlyOnly: 'سنوي فقط',
    pricingFreeDescription: 'ابدأ بإدارة دخلك ومصروفاتك وأهدافك المالية الأساسية.',
    pricingPremiumDescription: 'للمستخدمين الذين يريدون تحليلات أعمق وتقارير وأدوات سوق متقدمة.',
    pricingCompanyDescription: 'للشركات والمشاريع التي تريد الظهور داخل المنصة ببيانات واضحة.',
    pricingStartFree: 'ابدأ مجاناً',
    pricingSubscribeNow: 'اشترك الآن',
    pricingAddCompany: 'أضف شركتك',
    pricingCheckoutUnavailable: 'الدفع غير متاح حالياً.',
    pricingCheckoutError: 'تعذر فتح صفحة الدفع. حاول مرة أخرى.',
    pricingCheckoutLoading: 'جارٍ فتح صفحة الدفع...',
    testimonialsTitle: 'قصص العملاء قريباً',
    testimonialsSubtitle: 'لن نعرض أسماء أو مراجعات غير حقيقية.',
    finalTitle: 'ابدأ بإدارة أموالك ومشاريعك من مكان واحد',
    finalSubtitle: 'افتح حسابك وأضف بياناتك الحقيقية فقط. ستظهر التحليلات والتقارير عندما تتوفر بيانات كافية.',
    footerProduct: 'المنتج',
    footerTools: 'الأدوات',
    footerCompany: 'الشركة',
    footerAccount: 'الحساب',
    footerLegal: 'قانوني',
    footerSupport: 'الدعم',
    contact: 'تواصل معنا',
    supportContactLine: 'للدعم والمساعدة، تواصل معنا عبر:',
    businessHub: 'مركز الأعمال',
    reportsCenter: 'مركز التقارير',
    zakat: 'الزكاة',
    planFree: 'مجاني',
    planPro: 'احترافي',
    planBusiness: 'للشركات',
    privacy: 'الخصوصية',
    terms: 'الشروط',
    comingSoon: 'قريباً',
    openMenu: 'فتح القائمة',
    closeMenu: 'إغلاق القائمة',
    faqTitle: 'الأسئلة الشائعة',
    faqSubtitle: 'إجابات مختصرة عن THE SFM، طريقة عمله، البيانات، التقارير، الزكاة، المشاريع، والخصوصية.',
  },
  en: {
    navFeatures: 'Features',
    navTools: 'Tools',
    navPricing: 'Pricing',
    navFaq: 'FAQ',
    login: 'Sign in',
    start: 'Get Started',
    openDashboard: 'Open Dashboard',
    heroKicker: 'THE SFM',
    heroTitle: 'The smart financial platform for your money and projects',
    heroSubtitle: 'From income and expenses to zakat, investments, and business projects, everything lives in one platform built on your real data.',
    viewFeatures: 'View features',
    trustTitle: 'Trust indicators without unverified numbers',
    trustSubtitle: 'We describe product capability without invented statistics or unsupported claims.',
    previewLabel: 'Interface preview — not real user data',
    previewTitle: 'One operating view',
    previewSubtitle: 'Illustrative cards showing how the platform organizes your workspace after you add real data.',
    previewIncome: 'Income',
    previewExpenses: 'Expenses',
    previewProjects: 'Projects',
    previewZakat: 'Zakat',
    previewStatus: 'Based on your saved data',
    previewMissing: 'Insufficient data appears when inputs are missing',
    trustRealData: 'Real user data only',
    trustModules: 'Money and projects in one workspace',
    trustLanguages: 'Arabic, English, and French interface',
    trustGuardrails: 'Guardrails against unsupported numbers and forecasts',
    howTitle: 'How does THE SFM work?',
    howSubtitle: 'Start with an account and real data, then activate the sections you need so analysis appears when inputs are sufficient.',
    featuresTitle: 'Your financial tools in one place',
    featuresSubtitle: 'THE SFM brings daily tracking, reports, projects, and zakat together without mixing real data with demo data.',
    toolsFilterAll: 'All',
    toolsFilterPersonal: 'Personal finance',
    toolsFilterAi: 'Financial intelligence',
    toolsFilterBusiness: 'Projects & business',
    toolsFilterCharity: 'Zakat & giving',
    toolsFilterSecurity: 'Security & reports',
    toolOpen: 'Open',
    toolBadgeSmart: 'Smart',
    toolBadgeNew: 'New',
    toolBadgeCore: 'Core',
    aiTitle: 'An AI financial assistant that respects your data',
    aiSubtitle: 'The assistant reads your real data and suggests next steps when there is enough information. If data is missing, it says so instead of inventing numbers.',
    aiExampleLabel: 'Illustrative example',
    aiExampleText: 'Add income, expenses, and savings to receive more accurate analysis.',
    usersTitle: 'Who uses THE SFM?',
    usersSubtitle: 'For individuals, founders, and small teams that want a clearer financial operating view without noise.',
    pricingTitle: 'Pricing',
    pricingSubtitle: 'Choose the plan that fits your financial workflow.',
    pricingBillingMonthly: 'Monthly',
    pricingBillingYearly: 'Yearly',
    pricingYearlyNote: 'Save more with annual billing',
    pricingMostSuitable: 'Most suitable',
    pricingFreePrice: 'Free',
    pricingPremiumMonthlyPrice: '$20 / month',
    pricingPremiumYearlyPrice: '$100 / year',
    pricingCompanyPrice: '$50 / year',
    pricingYearlyOnly: 'Yearly only',
    pricingFreeDescription: 'Start managing income, expenses, and core financial goals.',
    pricingPremiumDescription: 'For users who need deeper analysis, reports, and advanced market tools.',
    pricingCompanyDescription: 'For companies and projects that want a clear presence inside the platform.',
    pricingStartFree: 'Start free',
    pricingSubscribeNow: 'Subscribe now',
    pricingAddCompany: 'Add your company',
    pricingCheckoutUnavailable: 'Payments are currently unavailable.',
    pricingCheckoutError: 'Could not open checkout. Please try again.',
    pricingCheckoutLoading: 'Opening checkout...',
    testimonialsTitle: 'Customer stories coming soon',
    testimonialsSubtitle: 'We will not display fictional names or reviews.',
    finalTitle: 'Start managing money and projects from one place',
    finalSubtitle: 'Create your account and add only your real data. Analysis and reports appear when enough data exists.',
    footerProduct: 'Product',
    footerTools: 'Tools',
    footerCompany: 'Company',
    footerAccount: 'Account',
    footerLegal: 'Legal',
    footerSupport: 'Support',
    contact: 'Contact us',
    supportContactLine: 'For support, contact us at:',
    businessHub: 'Business Hub',
    reportsCenter: 'Reports Center',
    zakat: 'Zakat',
    planFree: 'Free',
    planPro: 'Professional',
    planBusiness: 'Business',
    privacy: 'Privacy',
    terms: 'Terms',
    comingSoon: 'Coming soon',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    faqTitle: 'Frequently Asked Questions',
    faqSubtitle: 'Short answers about THE SFM, how it works, data, reports, zakat, projects, and privacy.',
  },
  fr: {
    navFeatures: 'Fonctionnalités',
    navTools: 'Outils',
    navPricing: 'Prix',
    navFaq: 'FAQ',
    login: 'Connexion',
    start: 'Commencer',
    openDashboard: 'Ouvrir le tableau',
    heroKicker: 'THE SFM',
    heroTitle: 'La plateforme financière intelligente pour votre argent et vos projets',
    heroSubtitle: 'Des revenus et dépenses à la zakat, aux investissements et aux projets, tout est réuni dans une plateforme fondée sur vos données réelles.',
    viewFeatures: 'Voir les fonctionnalités',
    trustTitle: 'Indicateurs de confiance sans chiffres non vérifiés',
    trustSubtitle: 'Nous décrivons les capacités du produit sans statistiques inventées ni promesses non étayées.',
    previewLabel: 'Aperçu de l’interface — données non réelles',
    previewTitle: 'Une vue opérationnelle',
    previewSubtitle: 'Cartes illustratives montrant comment la plateforme organise votre espace après l’ajout de données réelles.',
    previewIncome: 'Revenus',
    previewExpenses: 'Dépenses',
    previewProjects: 'Projets',
    previewZakat: 'Zakat',
    previewStatus: 'Basé sur vos données enregistrées',
    previewMissing: 'Les données insuffisantes sont signalées quand il manque des entrées',
    trustRealData: 'Données réelles uniquement',
    trustModules: 'Finances et projets dans un seul espace',
    trustLanguages: 'Interface arabe, anglaise et française',
    trustGuardrails: 'Garde-fous contre les chiffres et prévisions non étayés',
    howTitle: 'Comment fonctionne THE SFM ?',
    howSubtitle: 'Commencez avec un compte et des données réelles, puis activez les sections utiles afin que les analyses apparaissent quand les données sont suffisantes.',
    featuresTitle: 'Vos outils financiers au même endroit',
    featuresSubtitle: 'THE SFM réunit suivi quotidien, rapports, projets et zakat sans mélanger données réelles et données de démonstration.',
    toolsFilterAll: 'Tous',
    toolsFilterPersonal: 'Finance personnelle',
    toolsFilterAi: 'Intelligence financière',
    toolsFilterBusiness: 'Projets et business',
    toolsFilterCharity: 'Zakat et dons',
    toolsFilterSecurity: 'Sécurité et rapports',
    toolOpen: 'Ouvrir',
    toolBadgeSmart: 'Intelligent',
    toolBadgeNew: 'Nouveau',
    toolBadgeCore: 'Essentiel',
    aiTitle: 'Un assistant financier IA qui respecte vos données',
    aiSubtitle: 'L’assistant lit vos données réelles et suggère les prochaines étapes quand les informations sont suffisantes. Si les données manquent, il l’indique au lieu d’inventer des chiffres.',
    aiExampleLabel: 'Exemple illustratif',
    aiExampleText: 'Ajoutez revenus, dépenses et épargne pour obtenir une analyse plus précise.',
    usersTitle: 'Qui utilise THE SFM ?',
    usersSubtitle: 'Pour les particuliers, fondateurs et petites équipes qui veulent une vue financière claire sans bruit.',
    pricingTitle: 'Prix',
    pricingSubtitle: 'Choisissez l’offre adaptée à votre organisation financière.',
    pricingBillingMonthly: 'Mensuel',
    pricingBillingYearly: 'Annuel',
    pricingYearlyNote: 'Économisez davantage avec l’abonnement annuel',
    pricingMostSuitable: 'Le plus adapté',
    pricingFreePrice: 'Gratuit',
    pricingPremiumMonthlyPrice: '20 $ / mois',
    pricingPremiumYearlyPrice: '100 $ / an',
    pricingCompanyPrice: '50 $ / an',
    pricingYearlyOnly: 'Annuel uniquement',
    pricingFreeDescription: 'Commencez à gérer revenus, dépenses et objectifs financiers essentiels.',
    pricingPremiumDescription: 'Pour les utilisateurs qui veulent analyses, rapports et outils de marché avancés.',
    pricingCompanyDescription: 'Pour les sociétés et projets qui veulent une présence claire dans la plateforme.',
    pricingStartFree: 'Commencer gratuitement',
    pricingSubscribeNow: 'S’abonner',
    pricingAddCompany: 'Ajouter votre société',
    pricingCheckoutUnavailable: 'Le paiement est actuellement indisponible.',
    pricingCheckoutError: 'Impossible d’ouvrir le paiement. Veuillez réessayer.',
    pricingCheckoutLoading: 'Ouverture du paiement...',
    testimonialsTitle: 'Témoignages clients bientôt disponibles',
    testimonialsSubtitle: 'Nous n’afficherons pas de noms ou avis fictifs.',
    finalTitle: 'Gérez votre argent et vos projets depuis un seul endroit',
    finalSubtitle: 'Créez votre compte et ajoutez uniquement vos données réelles. Les analyses et rapports apparaissent quand les données sont suffisantes.',
    footerProduct: 'Produit',
    footerTools: 'Outils',
    footerCompany: 'Entreprise',
    footerAccount: 'Compte',
    footerLegal: 'Légal',
    footerSupport: 'Support',
    contact: 'Contactez-nous',
    supportContactLine: 'Pour obtenir de l’aide, contactez-nous à :',
    businessHub: 'Centre d’affaires',
    reportsCenter: 'Centre des rapports',
    zakat: 'Zakat',
    planFree: 'Gratuit',
    planPro: 'Professionnel',
    planBusiness: 'Entreprises',
    privacy: 'Confidentialité',
    terms: 'Conditions',
    comingSoon: 'Bientôt disponible',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    faqTitle: 'Questions fréquentes',
    faqSubtitle: 'Des réponses courtes sur THE SFM, son fonctionnement, les données, les rapports, la zakat, les projets et la confidentialité.',
  },
} satisfies Record<Lang, Record<string, string>>;

const FAQ_ITEMS = {
  ar: [
    ['ما هو THE SFM؟', 'THE SFM هو منصة مالية ذكية تساعدك على تنظيم دخلك، مصروفاتك، مدخراتك، أهدافك، زكاتك، استثماراتك، مشاريعك، تقاريرك، وقراراتك المالية في مكان واحد.'],
    ['هل THE SFM مجرد تطبيق مصروفات؟', 'لا. THE SFM ليس مجرد تطبيق لتسجيل المصروفات. هو مركز قيادة مالي يجمع بين المال الشخصي، المشاريع، الزكاة، الأعمال الخيرية، التقارير، المستندات، الإشعارات، ومساعد ذكي يعتمد على بياناتك الفعلية.'],
    ['هل يستخدم الموقع بيانات وهمية؟', 'لا. داخل حساب المستخدم، يجب أن تعتمد التحليلات والتقارير والتنبيهات على بياناتك الحقيقية فقط. إذا لم تكن البيانات متوفرة، نعرض رسالة مثل “لا توجد بيانات” أو “بيانات غير كافية” بدلاً من أرقام تخمينية.'],
    ['هل بياناتي المالية خاصة؟', 'نعم، بياناتك المالية خاصة بحسابك. THE SFM مصمم لعرض البيانات والتحليلات بناءً على المعلومات التي تضيفها أنت. لا يجب عرض بيانات مستخدم لغيره.'],
    ['هل THE SFM يقدم استشارة مالية رسمية؟', 'لا. THE SFM أداة للتنظيم، التخطيط، والتحليل. لا يعتبر بديلاً عن مستشار مالي أو قانوني أو ضريبي أو شرعي مختص.'],
    ['هل يمكنني إدارة الدخل والمصروفات؟', 'نعم. يمكنك إضافة مصادر الدخل، المصروفات، التصنيفات، الملاحظات، المرفقات، ومتابعة الملخصات والتقارير الشهرية بناءً على بياناتك.'],
    ['هل يدعم الموقع الزكاة؟', 'نعم. يوجد قسم مخصص للزكاة يساعدك على حساب النصاب، تتبع الحول، إضافة الأصول، حفظ حسابات الزكاة، ومتابعة التذكيرات. الحسابات تقديرية لأغراض التنظيم وليست فتوى شرعية.'],
    ['هل يدعم المشاريع التجارية؟', 'نعم. يمكنك إنشاء مشاريع، إضافة دراسة جدوى، نموذج مالي، مهام، مستندات، مؤشرات أداء، مستشار AI، وحتى إنشاء Pitch Deck للمشروع بناءً على البيانات المتوفرة.'],
    ['ما هو Pitch Deck؟', 'Pitch Deck هو عرض استثماري مختصر للمشروع يستخدم لشرح الفكرة، المشكلة، الحل، نموذج الربح، الخطة المالية، المخاطر، والتمويل المطلوب. داخل THE SFM يتم إنشاؤه بناءً على بيانات مشروعك، ولا يتم اختراع معلومات ناقصة.'],
    ['هل يدعم الموقع التقارير؟', 'نعم. يحتوي THE SFM على مركز تقارير يساعدك على إنشاء أو معاينة تقارير للدخل، المصروفات، المشاريع، الزكاة، الأعمال الخيرية، والاستثمارات حسب البيانات المتوفرة.'],
    ['هل يوجد إشعارات ذكية؟', 'نعم. يمكن أن تظهر لك إشعارات وتنبيهات بناءً على بياناتك، مثل مهام متأخرة، زكاة قريبة، تقارير تحتاج بيانات، أو أهداف تحتاج متابعة.'],
    ['هل أقدر أستخدم الموقع إذا ما عندي بيانات كثيرة؟', 'نعم. يمكنك البدء خطوة بخطوة. إذا لم تكن هناك بيانات كافية، سيعرض الموقع حالات فارغة أو إرشادات لإضافة البيانات بدلاً من عرض أرقام غير حقيقية.'],
    ['هل يدعم الموقع اللغة الإنجليزية والفرنسية؟', 'نعم. الموقع يدعم العربية والإنجليزية والفرنسية، ويجب أن تتغير النصوص حسب اللغة المختارة.'],
    ['هل THE SFM مناسب للأفراد فقط؟', 'لا. المنصة مناسبة للأفراد، العائلات، المستثمرين، رواد الأعمال، أصحاب المشاريع، والمستخدمين الذين يريدون تنظيم المال والمشاريع والتقارير في مكان واحد.'],
    ['كيف أبدأ؟', 'ابدأ بتسجيل الدخول، ثم أكمل إعداد الحساب، أضف دخلك ومصروفاتك، وبعدها يمكنك تفعيل الأقسام المناسبة لك مثل الأهداف، الزكاة، المشاريع، التقارير، أو الاستثمارات.'],
    ['كيف أتواصل مع دعم THE SFM؟', `يمكنك التواصل معنا عبر البريد: ${SUPPORT_EMAIL}`],
  ],
  en: [
    ['What is THE SFM?', 'THE SFM is an intelligent financial platform that helps you organize your income, expenses, savings, goals, zakat, investments, projects, reports, and financial decisions in one place.'],
    ['Is THE SFM just an expense tracker?', 'No. THE SFM is more than an expense tracker. It is a financial command center that connects personal finance, projects, zakat, charity, reports, documents, notifications, and AI-assisted planning based on your real data.'],
    ['Does the platform use fake data?', 'No. Inside user accounts, reports, insights, and notifications should rely only on the user’s real data. If data is missing, the platform should show “No data” or “Insufficient data” instead of guessed numbers.'],
    ['Is my financial data private?', 'Yes. Your financial data belongs to your account. THE SFM is designed to show analysis based on the information you add, and users should not see other users’ data.'],
    ['Does THE SFM provide official financial advice?', 'No. THE SFM is a tool for organization, planning, and analysis. It is not a replacement for a qualified financial, legal, tax, or religious advisor.'],
    ['Can I manage income and expenses?', 'Yes. You can add income sources, expenses, categories, notes, attachments, summaries, and monthly reports based on your saved data.'],
    ['Does THE SFM support zakat?', 'Yes. THE SFM includes a dedicated zakat area for nisab calculation, hawl tracking, assets, saved zakat calculations, and reminders. Zakat results are estimates for planning and are not religious rulings.'],
    ['Does it support business projects?', 'Yes. You can create projects, add feasibility studies, financial models, tasks, documents, KPIs, AI project guidance, and generate a Pitch Deck based on available project data.'],
    ['What is a Pitch Deck?', 'A Pitch Deck is a short investor-style presentation that explains the project idea, problem, solution, business model, financial plan, risks, and funding need. In THE SFM, it is generated from your project data without inventing missing information.'],
    ['Does THE SFM support reports?', 'Yes. The Reports Center helps you preview or generate reports for income, expenses, projects, zakat, charity, and investments based on available data.'],
    ['Are there smart notifications?', 'Yes. THE SFM can show notifications based on real data, such as overdue tasks, upcoming zakat dates, reports needing data, or goals that need attention.'],
    ['Can I use THE SFM if I do not have much data yet?', 'Yes. You can start step by step. If there is not enough data, the platform will show empty states or guidance instead of fake numbers.'],
    ['Does THE SFM support English and French?', 'Yes. THE SFM supports Arabic, English, and French, and the interface should update based on the selected language.'],
    ['Is THE SFM only for individuals?', 'No. It is designed for individuals, families, investors, entrepreneurs, business owners, and users who want to organize money, projects, reports, and decisions in one place.'],
    ['How do I start?', 'Log in, complete your account setup, add your income and expenses, then activate the sections you need such as goals, zakat, projects, reports, or investments.'],
    ['How can I contact THE SFM support?', `You can contact us by email: ${SUPPORT_EMAIL}`],
  ],
  fr: [
    ['Qu’est-ce que THE SFM ?', 'THE SFM est une plateforme financière intelligente qui vous aide à organiser vos revenus, dépenses, épargne, objectifs, zakat, investissements, projets, rapports et décisions financières au même endroit.'],
    ['THE SFM est-il seulement une application de suivi des dépenses ?', 'Non. THE SFM est plus qu’un simple outil de suivi des dépenses. C’est un centre de commande financier qui relie finances personnelles, projets, zakat, charité, rapports, documents, notifications et planification assistée par IA à partir de vos données réelles.'],
    ['La plateforme utilise-t-elle de fausses données ?', 'Non. Dans les comptes utilisateurs, les rapports, analyses et notifications doivent s’appuyer uniquement sur les données réelles de l’utilisateur. Si des données manquent, la plateforme doit afficher “Aucune donnée” ou “Données insuffisantes” au lieu de chiffres estimés.'],
    ['Mes données financières sont-elles privées ?', 'Oui. Vos données financières appartiennent à votre compte. THE SFM est conçu pour afficher des analyses à partir des informations que vous ajoutez, et les utilisateurs ne doivent pas voir les données d’autres utilisateurs.'],
    ['THE SFM fournit-il un conseil financier officiel ?', 'Non. THE SFM est un outil d’organisation, de planification et d’analyse. Il ne remplace pas un conseiller financier, juridique, fiscal ou religieux qualifié.'],
    ['Puis-je gérer mes revenus et mes dépenses ?', 'Oui. Vous pouvez ajouter des sources de revenus, des dépenses, des catégories, des notes, des pièces jointes, des résumés et des rapports mensuels basés sur vos données enregistrées.'],
    ['THE SFM prend-il en charge la zakat ?', 'Oui. THE SFM comprend un espace dédié à la zakat pour le calcul du nisab, le suivi du hawl, les actifs, les calculs enregistrés et les rappels. Les résultats de zakat sont des estimations de planification et ne constituent pas des avis religieux.'],
    ['La plateforme prend-elle en charge les projets commerciaux ?', 'Oui. Vous pouvez créer des projets, ajouter des études de faisabilité, des modèles financiers, des tâches, des documents, des KPI, des conseils de projet par IA et générer un Pitch Deck à partir des données disponibles.'],
    ['Qu’est-ce qu’un Pitch Deck ?', 'Un Pitch Deck est une courte présentation de type investisseur qui explique l’idée du projet, le problème, la solution, le modèle économique, le plan financier, les risques et le besoin de financement. Dans THE SFM, il est généré à partir des données de votre projet sans inventer les informations manquantes.'],
    ['THE SFM prend-il en charge les rapports ?', 'Oui. Le Centre des rapports vous aide à prévisualiser ou générer des rapports pour les revenus, dépenses, projets, zakat, charité et investissements selon les données disponibles.'],
    ['Existe-t-il des notifications intelligentes ?', 'Oui. THE SFM peut afficher des notifications basées sur des données réelles, comme des tâches en retard, des dates de zakat à venir, des rapports qui nécessitent des données ou des objectifs à suivre.'],
    ['Puis-je utiliser THE SFM si je n’ai pas encore beaucoup de données ?', 'Oui. Vous pouvez commencer étape par étape. S’il n’y a pas assez de données, la plateforme affiche des états vides ou des indications au lieu de faux chiffres.'],
    ['THE SFM prend-il en charge l’anglais et le français ?', 'Oui. THE SFM prend en charge l’arabe, l’anglais et le français, et l’interface doit se mettre à jour selon la langue sélectionnée.'],
    ['THE SFM est-il uniquement destiné aux particuliers ?', 'Non. Il est conçu pour les particuliers, les familles, les investisseurs, les entrepreneurs, les propriétaires d’entreprise et les utilisateurs qui veulent organiser argent, projets, rapports et décisions au même endroit.'],
    ['Comment commencer ?', 'Connectez-vous, complétez la configuration de votre compte, ajoutez vos revenus et dépenses, puis activez les sections dont vous avez besoin comme les objectifs, la zakat, les projets, les rapports ou les investissements.'],
    ['Comment contacter le support THE SFM ?', `Vous pouvez nous contacter par e-mail : ${SUPPORT_EMAIL}`],
  ],
} satisfies Record<Lang, [string, string][]>;

const featureItems = [
  {
    icon: Wallet,
    title: ['إدارة الدخل', 'Income management', 'Gestion des revenus'],
    description: [
      'تتبّع مصادر دخلك وصنّفها وراقب ملخصاتك الشهرية.',
      'Track income sources, categorize them, and review monthly summaries.',
      'Suivez vos sources de revenus, classez-les et consultez vos synthèses mensuelles.',
    ],
  },
  {
    icon: ReceiptText,
    title: ['تتبع المصروفات', 'Expense tracking', 'Suivi des dépenses'],
    description: [
      'سجّل مصروفاتك بالتصنيفات والملاحظات والمرفقات.',
      'Record expenses with categories, notes, and attachments.',
      'Enregistrez vos dépenses avec catégories, notes et pièces jointes.',
    ],
  },
  {
    icon: PiggyBank,
    title: ['المدخرات والأهداف', 'Savings and goals', 'Épargne et objectifs'],
    description: [
      'حدّد أهدافك المالية وتابع تقدمك نحوها.',
      'Set financial goals and track progress toward them.',
      'Définissez vos objectifs financiers et suivez votre progression.',
    ],
  },
  {
    icon: TrendingUp,
    title: ['الاستثمارات وتحليلات السوق', 'Investments and market analysis', 'Investissements et analyse de marché'],
    description: [
      'راقب استثماراتك وتحليلات السوق وقائمة المتابعة.',
      'Monitor investments, market analysis, and your watchlist.',
      'Surveillez vos investissements, l’analyse de marché et votre liste de suivi.',
    ],
  },
  {
    icon: Calculator,
    title: ['الزكاة', 'Zakat', 'Zakat'],
    description: [
      'احسب النصاب، تتبّع الحول، وأضف أصولك.',
      'Calculate nisab, track hawl, and add your assets.',
      'Calculez le nisab, suivez le hawl et ajoutez vos actifs.',
    ],
  },
  {
    icon: FolderKanban,
    title: ['المشاريع التجارية', 'Business projects', 'Projets commerciaux'],
    description: [
      'أنشئ دراسة جدوى، نموذجاً مالياً، مهاماً، وPitch Deck.',
      'Create feasibility studies, financial models, tasks, and pitch decks.',
      'Créez des études de faisabilité, modèles financiers, tâches et pitch decks.',
    ],
  },
  {
    icon: HandHeart,
    title: ['المشاريع الخيرية', 'Charity projects', 'Projets caritatifs'],
    description: [
      'نظّم تبرعاتك ومستفيديك وتقاريرك الخيرية.',
      'Organize donations, beneficiaries, and charity reports.',
      'Organisez dons, bénéficiaires et rapports caritatifs.',
    ],
  },
  {
    icon: FileText,
    title: ['التقارير', 'Reports', 'Rapports'],
    description: [
      'أنشئ تقارير للدخل والمصروفات والمشاريع والزكاة.',
      'Create reports for income, expenses, projects, and zakat.',
      'Créez des rapports pour revenus, dépenses, projets et zakat.',
    ],
  },
  {
    icon: BellRing,
    title: ['الإشعارات الذكية', 'Smart notifications', 'Notifications intelligentes'],
    description: [
      'تنبيهات للمهام المتأخرة والزكاة القريبة والأهداف.',
      'Alerts for overdue tasks, upcoming zakat, and goals.',
      'Alertes pour tâches en retard, zakat à venir et objectifs.',
    ],
  },
  {
    icon: BriefcaseBusiness,
    title: ['مركز الأعمال', 'Business Hub', 'Centre d’affaires'],
    description: [
      'أدِر مشاريعك ومستنداتك ومؤشرات أدائك في مكان واحد.',
      'Manage projects, documents, and performance indicators in one place.',
      'Gérez projets, documents et indicateurs de performance au même endroit.',
    ],
  },
  {
    icon: Presentation,
    title: ['Pitch Deck', 'Pitch Deck', 'Pitch Deck'],
    description: [
      'اعرض مشروعك للمستثمرين بناءً على بيانات مشروعك الفعلية.',
      'Present your project to investors using your actual project data.',
      'Présentez votre projet aux investisseurs à partir de vos données réelles.',
    ],
  },
  {
    icon: BookOpen,
    href: '/financial-theories',
    title: ['النظريات المالية', 'Financial Theories', 'Théories financières'],
    description: [
      'مكتبة تعليمية تشرح أهم قواعد إدارة المال، الادخار، الاستثمار، الديون، والحرية المالية مع أدوات وحاسبات عملية.',
      'An educational library that explains key principles of money management, saving, investing, debt, and financial freedom with practical tools and calculators.',
      'Une bibliothèque éducative qui explique les principes clés de la gestion de l’argent, de l’épargne, de l’investissement, des dettes et de la liberté financière avec des outils et calculateurs pratiques.',
    ],
  },
] as const;

type ToolCategory = 'all' | 'personal' | 'ai' | 'business' | 'charity' | 'security';
type ToolBadge = 'smart' | 'new' | 'core';
type LandingToolItem = {
  id?: string;
  navId: string;
  icon?: LucideIcon;
  category: Exclude<ToolCategory, 'all'>;
  badge?: ToolBadge;
  title?: TranslationTuple;
  description: TranslationTuple;
};

const landingToolCatalog: readonly LandingToolItem[] = [
  { navId: 'home', category: 'personal', badge: 'core', description: ['نظرة شاملة على دخلك، مصروفاتك، أهدافك، واستثماراتك.', 'A complete view of income, expenses, goals, and investments.', 'Une vue globale des revenus, dépenses, objectifs et investissements.'] },
  { navId: 'income', category: 'personal', description: ['سجل مصادر دخلك الشهرية والمتكررة وتتبع نموها.', 'Record monthly and recurring income sources and track growth.', 'Enregistrez les revenus mensuels et récurrents et suivez leur évolution.'] },
  { navId: 'expenses', category: 'personal', description: ['تابع مصروفاتك وصنّفها لمعرفة أين تذهب أموالك.', 'Track and categorize expenses to understand where money goes.', 'Suivez et classez vos dépenses pour comprendre où va votre argent.'] },
  { navId: 'goals', category: 'personal', description: ['خطط لأهدافك مثل الادخار، سداد الديون، شراء سيارة أو بناء صندوق طوارئ.', 'Plan goals like saving, debt payoff, buying a car, or building an emergency fund.', 'Planifiez l’épargne, le remboursement des dettes, l’achat d’une voiture ou un fonds d’urgence.'] },
  { navId: 'savings', category: 'personal', description: ['سجل مبالغ الإدخار واربطها بأهدافك المالية.', 'Record savings amounts and connect them to your financial goals.', 'Enregistrez l’épargne et reliez-la à vos objectifs financiers.'] },
  { navId: 'invest', category: 'personal', description: ['تابع استثماراتك وأدائك المالي في مكان واحد.', 'Track investments and financial performance in one place.', 'Suivez vos investissements et performances financières au même endroit.'] },
  { navId: 'market-analysis', category: 'personal', badge: 'new', description: ['تابع مؤشرات السوق والفرص الاستثمارية بشكل مبسط.', 'Follow market indicators and investment opportunities in a simple way.', 'Suivez les indicateurs de marché et opportunités d’investissement simplement.'] },
  { navId: 'decisions', category: 'ai', badge: 'smart', description: ['حلل قراراتك قبل تنفيذها واعرف هل القرار مناسب أم يحتاج انتظار.', 'Analyze decisions before acting and know whether to proceed or wait.', 'Analysez vos décisions avant d’agir et sachez s’il faut avancer ou attendre.'] },
  { navId: 'smart-assistant', category: 'ai', badge: 'smart', description: ['مساعد مالي ذكي يقرأ بياناتك ويقدم لك اقتراحات عملية.', 'A smart financial assistant that reads your data and gives practical suggestions.', 'Un assistant financier intelligent qui lit vos données et propose des actions concrètes.'] },
  { id: 'financial-ai-report', navId: 'reports-center', icon: FileText, category: 'ai', badge: 'smart', title: ['تقرير الذكاء المالي', 'Smart Financial Report', 'Rapport financier intelligent'], description: ['احصل على تقرير شامل عن وضعك المالي ونقاط القوة والتحسين.', 'Get a complete report on financial health, strengths, and improvement areas.', 'Obtenez un rapport complet sur votre situation financière et les axes d’amélioration.'] },
  { navId: 'reports-center', category: 'security', description: ['صدّر تقارير PDF و Excel و CSV عن بياناتك المالية.', 'Export PDF, Excel, and CSV reports from your financial data.', 'Exportez des rapports PDF, Excel et CSV à partir de vos données financières.'] },
  { navId: 'documents-center', category: 'security', description: ['احفظ وراجع ملفاتك المالية والتقارير والعروض الاستثمارية.', 'Save and review financial files, reports, and pitch documents.', 'Enregistrez et consultez vos fichiers financiers, rapports et présentations.'] },
  { navId: 'business-operations', category: 'business', description: ['نظّم مشاريعك، العملاء، الفواتير، الموظفين، والموردين.', 'Organize projects, customers, invoices, employees, and suppliers.', 'Organisez projets, clients, factures, employés et fournisseurs.'] },
  { id: 'feasibility-study', navId: 'projects', icon: Calculator, category: 'business', title: ['دراسة الجدوى', 'Feasibility Study', 'Étude de faisabilité'], description: ['ابنِ دراسة جدوى للمشاريع مع تحليل التكاليف والربحية.', 'Build feasibility studies with cost and profitability analysis.', 'Créez des études de faisabilité avec analyse des coûts et de la rentabilité.'] },
  { navId: 'investment-offers', category: 'business', badge: 'new', description: ['أنشئ عرضًا استثماريًا مرتبًا لمشروعك أو فكرتك.', 'Create a structured pitch deck for your project or idea.', 'Créez une présentation investisseur structurée pour votre projet.'] },
  { navId: 'zakat', category: 'charity', description: ['احسب الزكاة بناءً على بياناتك المالية وأسعار الذهب والفضة.', 'Calculate zakat using your financial data and gold/silver prices.', 'Calculez la zakat avec vos données financières et les prix de l’or/argent.'] },
  { navId: 'charity', category: 'charity', description: ['نظّم التبرعات والمساهمات الخيرية حسب ميزانيتك.', 'Organize donations and charitable contributions around your budget.', 'Organisez les dons et contributions caritatives selon votre budget.'] },
  { navId: 'financial-theories', category: 'ai', description: ['تعلم مفاهيم مالية تساعدك على اتخاذ قرارات أفضل.', 'Learn financial concepts that help you make better decisions.', 'Apprenez des concepts financiers pour prendre de meilleures décisions.'] },
  { navId: 'tasks', category: 'ai', badge: 'smart', description: ['حوّل التوصيات المالية إلى مهام قابلة للتنفيذ.', 'Turn financial recommendations into actionable tasks.', 'Transformez les recommandations financières en tâches concrètes.'] },
  { navId: 'notif', category: 'security', description: ['استقبل تنبيهات عن الأهداف، المدفوعات، الميزانية، والقرارات المهمة.', 'Receive alerts for goals, payments, budgets, and important decisions.', 'Recevez des alertes sur objectifs, paiements, budget et décisions importantes.'] },
  { navId: 'security', category: 'security', badge: 'new', description: ['تحكم في حماية حسابك، المصادقة الثنائية، وبياناتك الشخصية.', 'Manage account protection, two-factor authentication, and personal data.', 'Gérez la protection du compte, la 2FA et vos données personnelles.'] },
  { navId: 'profile', category: 'security', description: ['إدارة بياناتك، العملة، اللغة، المدينة، والمهنة.', 'Manage personal data, currency, language, city, and profession.', 'Gérez vos données, devise, langue, ville et profession.'] },
];

const audienceItems = [
  {
    title: ['الأفراد', 'Individuals', 'Particuliers'],
    description: [
      'لتنظيم الدخل والمصروفات والمدخرات والأهداف.',
      'For organizing income, expenses, savings, and goals.',
      'Pour organiser revenus, dépenses, épargne et objectifs.',
    ],
  },
  {
    title: ['رواد الأعمال', 'Founders', 'Fondateurs'],
    description: [
      'لإدارة المشاريع ودراسات الجدوى والـ Pitch Deck.',
      'For managing projects, feasibility studies, and pitch decks.',
      'Pour gérer projets, études de faisabilité et pitch decks.',
    ],
  },
  {
    title: ['العائلات والفرق الصغيرة', 'Families and small teams', 'Familles et petites équipes'],
    description: [
      'لتخطيط الميزانية والزكاة والقرارات المشتركة.',
      'For planning budgets, zakat, and shared decisions.',
      'Pour planifier budgets, zakat et décisions partagées.',
    ],
  },
] as const;

const howSteps = [
  {
    icon: CheckCircle2,
    title: ['سجّل الدخول وأنشئ حسابك.', 'Sign in and create your account.', 'Connectez-vous et créez votre compte.'],
  },
  {
    icon: Wallet,
    title: ['أضف بياناتك الحقيقية مثل الدخل والمصروفات.', 'Add your real data, such as income and expenses.', 'Ajoutez vos données réelles, comme revenus et dépenses.'],
  },
  {
    icon: FolderKanban,
    title: ['فعّل الأقسام المناسبة لك مثل الأهداف والزكاة والمشاريع والتقارير.', 'Activate the sections you need, such as goals, zakat, projects, and reports.', 'Activez les sections utiles, comme objectifs, zakat, projets et rapports.'],
  },
  {
    icon: LineChart,
    title: ['احصل على التحليلات والتقارير عند توفر بيانات كافية.', 'Get analysis and reports when enough data is available.', 'Obtenez analyses et rapports lorsque les données sont suffisantes.'],
  },
] as const;

const pricingFeatureSets = [
  {
    key: 'free',
    titleKey: 'planFree',
    descriptionKey: 'pricingFreeDescription',
    ctaKey: 'pricingStartFree',
    features: [
      ['إدارة الدخل والمصروفات الأساسية', 'Basic income and expense management', 'Gestion de base des revenus et dépenses'],
      ['الأهداف والمدخرات الشخصية', 'Personal goals and savings', 'Objectifs et épargne personnels'],
      ['تقارير مالية أساسية', 'Basic financial reports', 'Rapports financiers de base'],
      ['الزكاة والحاسبات الأساسية', 'Zakat and basic calculators', 'Zakat et calculateurs de base'],
    ],
  },
  {
    key: 'premium',
    titleKey: 'planPro',
    descriptionKey: 'pricingPremiumDescription',
    ctaKey: 'pricingSubscribeNow',
    highlighted: true,
    features: [
      ['كل ميزات الخطة المجانية', 'Everything in Free', 'Tout ce qui est inclus dans Gratuit'],
      ['تحليلات الاستثمار وقوائم المتابعة', 'Investment analysis and watchlists', 'Analyse d’investissement et listes de suivi'],
      ['التقارير والإشعارات الذكية', 'Reports and smart notifications', 'Rapports et notifications intelligentes'],
      ['المساعد الذكي عند توفر بيانات كافية', 'AI assistant when enough data is available', 'Assistant IA lorsque les données sont suffisantes'],
      ['المكتبة التعليمية والحاسبات العملية', 'Educational library and practical calculators', 'Bibliothèque éducative et calculateurs pratiques'],
      ['أدوات وتحليلات السوق المتقدمة', 'Advanced market tools and analysis', 'Outils et analyses de marché avancés'],
    ],
  },
  {
    key: 'company',
    titleKey: 'planBusiness',
    descriptionKey: 'pricingCompanyDescription',
    ctaKey: 'pricingAddCompany',
    features: [
      ['صفحة أو ظهور للشركة داخل المنصة', 'Company page or presence inside the platform', 'Page ou présence de l’entreprise dans la plateforme'],
      ['عرض بيانات الشركة الأساسية', 'Display core company information', 'Affichage des informations essentielles de l’entreprise'],
      ['إبراز الخدمات أو النشاط التجاري', 'Highlight services or business activity', 'Mise en avant des services ou de l’activité'],
      ['مناسب للشركات والمشاريع المالية', 'Suitable for companies and financial projects', 'Adapté aux entreprises et projets financiers'],
      ['إمكانية مراجعة واعتماد البيانات قبل النشر', 'Review and approval before publishing', 'Révision et validation avant publication'],
    ],
  },
] as const;

type BillingInterval = 'monthly' | 'yearly';
type PricingPlanKey = typeof pricingFeatureSets[number]['key'];

function pick(list: readonly TranslationTuple[], lang: Lang) {
  const index = lang === 'ar' ? 0 : lang === 'fr' ? 2 : 1;
  return list.map(item => item[index]);
}

function pickOne(item: readonly [string, string, string], lang: Lang) {
  const index = lang === 'ar' ? 0 : lang === 'fr' ? 2 : 1;
  return item[index];
}

function pickTranslation(key: string, lang: Lang) {
  const item = TR_NAV[key as keyof typeof TR_NAV];
  if (!item) return key;
  return lang === 'ar' ? item.ar : lang === 'fr' ? item.fr ?? item.en : item.en;
}

export default function PublicLandingPage() {
  const { lang, dir } = useLanguage();
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [activeToolCategory, setActiveToolCategory] = useState<ToolCategory>('all');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<PricingPlanKey | null>(null);
  const [pricingMessage, setPricingMessage] = useState('');
  const text = COPY[(lang as Lang) || 'ar'];
  const appHref = session ? '/dashboard' : '/login';
  const primaryLabel = session ? text.openDashboard : text.start;
  const aboutLabel = lang === 'ar' ? 'من نحن' : lang === 'fr' ? 'À propos' : 'About';
  const navigationItems = useMemo(() => new Map(flattenNavigationItems().map(item => [item.id, item])), []);
  const tools = useMemo(() => landingToolCatalog.map(item => {
    const navItem = navigationItems.get(item.navId);
    const Icon = item.icon || navItem?.icon || Zap;
    const href = navItem?.href || '/dashboard';
    return {
      ...item,
      Icon,
      href,
      titleText: item.title ? pickOne(item.title, lang as Lang) : navItem ? pickTranslation(navItem.labelKey, lang as Lang) : item.navId,
      descriptionText: pickOne(item.description, lang as Lang),
    };
  }), [lang, navigationItems]);
  const visibleTools = useMemo(
    () => activeToolCategory === 'all' ? tools : tools.filter(item => item.category === activeToolCategory),
    [activeToolCategory, tools],
  );
  const toolFilters = useMemo(() => [
    { id: 'all' as ToolCategory, label: text.toolsFilterAll },
    { id: 'personal' as ToolCategory, label: text.toolsFilterPersonal },
    { id: 'ai' as ToolCategory, label: text.toolsFilterAi },
    { id: 'business' as ToolCategory, label: text.toolsFilterBusiness },
    { id: 'charity' as ToolCategory, label: text.toolsFilterCharity },
    { id: 'security' as ToolCategory, label: text.toolsFilterSecurity },
  ], [text]);
  const steps = useMemo(() => howSteps.map((item, index) => ({
    ...item,
    number: index + 1,
    titleText: pickOne(item.title, lang as Lang),
  })), [lang]);
  const pricingPlans = useMemo(() => pricingFeatureSets.map(plan => ({
    key: plan.key,
    title: text[plan.titleKey],
    description: text[plan.descriptionKey],
    cta: text[plan.ctaKey],
    highlighted: 'highlighted' in plan ? plan.highlighted : false,
    features: pick(plan.features, lang as Lang),
  })), [lang, text]);
  const audiences = useMemo(() => audienceItems.map(item => ({
    title: pickOne(item.title, lang as Lang),
    description: pickOne(item.description, lang as Lang),
  })), [lang]);
  const faqItems = FAQ_ITEMS[(lang as Lang) || 'ar'];
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://www.the-sfm.com/#organization',
        name: 'THE SFM',
        url: 'https://www.the-sfm.com',
        logo: 'https://www.the-sfm.com/sfm-logo.png',
        contactPoint: {
          '@type': 'ContactPoint',
          email: SUPPORT_EMAIL,
          contactType: 'customer support',
          availableLanguage: ['Arabic', 'English', 'French'],
        },
      },
      {
        '@type': 'WebSite',
        '@id': 'https://www.the-sfm.com/#website',
        name: 'THE SFM',
        url: 'https://www.the-sfm.com',
        inLanguage: ['ar', 'en', 'fr'],
        publisher: { '@id': 'https://www.the-sfm.com/#organization' },
      },
    ],
  };

  const navLinks = [
    { href: '/about', label: aboutLabel, section: 'about' },
    { href: '#features', label: text.navFeatures, section: 'features' },
    { href: '#tools', label: text.navTools, section: 'tools' },
    { href: '#pricing', label: text.navPricing, section: 'pricing' },
    { href: '#faq', label: text.navFaq, section: 'faq' },
  ];

  useEffect(() => {
    const sections = ['features', 'tools', 'pricing', 'faq'];
    const updateActiveSection = () => {
      let current = 'home';
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element && element.getBoundingClientRect().top <= 140) {
          current = section;
        }
      }
      setActiveSection(current);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  function priceForPlan(planKey: PricingPlanKey) {
    if (planKey === 'free') return text.pricingFreePrice;
    if (planKey === 'company') return text.pricingCompanyPrice;
    return billingInterval === 'yearly' ? text.pricingPremiumYearlyPrice : text.pricingPremiumMonthlyPrice;
  }

  function intervalForPlan(planKey: PricingPlanKey) {
    if (planKey === 'company') return 'yearly' as const;
    return billingInterval;
  }

  function handleFreePlan() {
    setPricingMessage('');
    router.push(session ? '/dashboard' : `/login?mode=register&next=${encodeURIComponent('/dashboard')}`);
  }

  const handlePaidCheckout = useCallback(async (planKey: Exclude<PricingPlanKey, 'free'>, selectedInterval?: BillingInterval) => {
    const checkoutInterval = selectedInterval ?? (planKey === 'company' ? 'yearly' : billingInterval);
    setPricingMessage('');
    if (!session) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('sfm_pending_checkout', JSON.stringify({ plan: planKey, billingInterval: checkoutInterval }));
      }
      router.push(`/login?next=${encodeURIComponent('/#pricing')}`);
      return;
    }

    setCheckoutLoadingPlan(planKey);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan: planKey,
          billingInterval: checkoutInterval,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; url?: string; code?: string; message?: string };
      if (!response.ok || !payload.ok || !payload.url) {
        setPricingMessage(payload.code === 'PAYMENT_UNAVAILABLE' ? text.pricingCheckoutUnavailable : text.pricingCheckoutError);
        return;
      }
      window.location.assign(payload.url);
    } catch {
      setPricingMessage(text.pricingCheckoutError);
    } finally {
      setCheckoutLoadingPlan(null);
    }
  }, [billingInterval, router, session, text.pricingCheckoutError, text.pricingCheckoutUnavailable]);

  useEffect(() => {
    if (!session || authLoading || typeof window === 'undefined') return;
    const pending = window.sessionStorage.getItem('sfm_pending_checkout');
    if (!pending) return;
    window.sessionStorage.removeItem('sfm_pending_checkout');
    try {
      const payload = JSON.parse(pending) as { plan?: PricingPlanKey; billingInterval?: BillingInterval };
      if (payload.plan === 'premium' || payload.plan === 'company') {
        void handlePaidCheckout(payload.plan, payload.billingInterval === 'yearly' ? 'yearly' : 'monthly');
      }
    } catch {
      setPricingMessage('');
    }
  }, [authLoading, handlePaidCheckout, session]);

  return (
    <main className="landing-page" dir={dir}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <nav className="landing-nav" aria-label="THE SFM">
        <Link href="/" className="landing-brand" aria-label="THE SFM">
          <Image src="/sfm-logo.png" alt="THE SFM" width={46} height={46} priority className="landing-logo" />
          <span>THE SFM</span>
        </Link>

        <div className={menuOpen ? 'landing-links open' : 'landing-links'}>
          {navLinks.map(link => {
            const isActive = link.href === '/' || link.href.startsWith('#')
              ? activeSection === link.section
              : false;
            return (
              <a
                key={link.href}
                href={link.href}
                className={isActive ? 'sfm-nav-link active' : 'sfm-nav-link'}
                aria-current={isActive ? 'location' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            );
          })}
          <div className="mobile-menu-ctas">
            <Link href={appHref} className="sfm-button-primary" onClick={() => setMenuOpen(false)}>{primaryLabel}</Link>
          </div>
        </div>

        <div className="landing-actions">
          <LanguageSwitcher variant="gold" compact />
          <ThemeToggle />
          <Link href={appHref} className="nav-primary sfm-button-primary">{primaryLabel}</Link>
          <button
            type="button"
            className="mobile-menu-button sfm-button-secondary"
            aria-label={menuOpen ? text.closeMenu : text.openMenu}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(value => !value)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <span className="kicker"><Sparkles size={16} />{text.heroKicker}</span>
          <h1>{text.heroTitle}</h1>
          <p>{text.heroSubtitle}</p>
          <div className="hero-buttons">
            <Link href={appHref} className="primary-cta sfm-button-primary">{primaryLabel}</Link>
            <a href="#features" className="secondary-cta sfm-button-secondary">{text.viewFeatures}</a>
          </div>
        </div>

        <ProductPreview text={text} />
      </section>

      <section className="trust-section" aria-labelledby="trust-title">
        <div>
          <h2 id="trust-title">{text.trustTitle}</h2>
          <p>{text.trustSubtitle}</p>
        </div>
        <div className="trust-grid">
          {[text.trustRealData, text.trustModules, text.trustLanguages, text.trustGuardrails].map(item => (
            <article key={item} className="trust-card">
              <CheckCircle2 size={20} />
              <span>{item}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section" aria-labelledby="how-title">
        <div className="section-heading">
          <span>{text.heroKicker}</span>
          <h2 id="how-title">{text.howTitle}</h2>
          <p>{text.howSubtitle}</p>
        </div>
        <div className="how-grid">
          {steps.map(step => {
            const Icon = step.icon;
            return (
              <article key={step.number} className="how-card">
                <div className="how-number">{step.number}</div>
                <div className="how-icon"><Icon size={22} /></div>
                <p>{step.titleText}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="features" className="section-block">
        <div className="section-heading">
          <span>{text.navFeatures}</span>
          <h2>{text.featuresTitle}</h2>
          <p>{text.featuresSubtitle}</p>
        </div>
        <div className="tool-filter-row" role="tablist" aria-label={text.navTools}>
          {toolFilters.map(filter => (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={activeToolCategory === filter.id}
              className={activeToolCategory === filter.id ? 'tool-filter active' : 'tool-filter'}
              onClick={() => setActiveToolCategory(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div id="tools" className="feature-grid tool-grid">
          {visibleTools.map(tool => {
            const Icon = tool.Icon;
            const badgeLabel = tool.badge === 'smart' ? text.toolBadgeSmart : tool.badge === 'new' ? text.toolBadgeNew : tool.badge === 'core' ? text.toolBadgeCore : '';
            return (
              <Link key={tool.id || tool.navId} href={tool.href} className="feature-card tool-card" aria-label={tool.titleText}>
                <div className="tool-card-top">
                  <span className="tool-icon"><Icon size={22} /></span>
                  {badgeLabel && <span className={`tool-badge ${tool.badge}`}>{badgeLabel}</span>}
                </div>
                <h3>{tool.titleText}</h3>
                <p>{tool.descriptionText}</p>
                <span className="tool-open">{text.toolOpen}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="ai-section">
        <div className="landing-ai-card">
          <div className="ai-icon"><Bot size={30} /></div>
          <div>
            <span>{text.aiExampleLabel}</span>
            <h2>{text.aiTitle}</h2>
            <p>{text.aiSubtitle}</p>
            <div className="landing-ai-example">{text.aiExampleText}</div>
          </div>
        </div>
      </section>

      <section className="section-block compact">
        <div className="section-heading">
          <span>{text.usersTitle}</span>
          <h2>{text.usersTitle}</h2>
          <p>{text.usersSubtitle}</p>
        </div>
        <div className="audience-grid">
          {audiences.map(item => (
            <article key={item.title}>
              <ShieldCheck size={20} />
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="section-block pricing-block">
        <div className="section-heading">
          <span>{text.navPricing}</span>
          <h2>{text.pricingTitle}</h2>
          <p>{text.pricingSubtitle}</p>
        </div>
        <div className="billing-toggle-wrap">
          <div className="billing-toggle" role="tablist" aria-label={text.navPricing}>
            {(['monthly', 'yearly'] as const).map(interval => (
              <button
                key={interval}
                type="button"
                role="tab"
                aria-selected={billingInterval === interval}
                className={billingInterval === interval ? 'active' : ''}
                onClick={() => setBillingInterval(interval)}
              >
                {interval === 'monthly' ? text.pricingBillingMonthly : text.pricingBillingYearly}
              </button>
            ))}
          </div>
          {billingInterval === 'yearly' ? <span className="billing-note">{text.pricingYearlyNote}</span> : null}
        </div>
        {pricingMessage ? <div className="pricing-alert" role="alert">{pricingMessage}</div> : null}
        <div className="pricing-grid">
          {pricingPlans.map(plan => (
            <article key={plan.key} className={plan.highlighted ? 'pricing-card featured' : 'pricing-card'}>
              {plan.highlighted ? <span className="pricing-badge">{text.pricingMostSuitable}</span> : null}
              <h3>{plan.title}</h3>
              <strong data-financial-value="true">{priceForPlan(plan.key)}</strong>
              {plan.key === 'company' ? <span className="pricing-interval">{text.pricingYearlyOnly}</span> : null}
              <p>{plan.description}</p>
              <ul>
                {plan.features.map(feature => (
                  <li key={feature}><CheckCircle2 size={16} />{feature}</li>
                ))}
              </ul>
              <button
                type="button"
                className={plan.highlighted ? 'pricing-action primary' : 'pricing-action'}
                disabled={checkoutLoadingPlan !== null || authLoading}
                onClick={() => {
                  if (plan.key === 'free') handleFreePlan();
                  else void handlePaidCheckout(plan.key);
                }}
              >
                {checkoutLoadingPlan === plan.key ? text.pricingCheckoutLoading : plan.cta}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="section-block faq-block">
        <div className="section-heading">
          <span>{text.navFaq}</span>
          <h2>{text.faqTitle}</h2>
          <p>{text.faqSubtitle}</p>
        </div>
        <div className="faq-accordion">
          {faqItems.map(([question, answer], index) => {
            const isOpen = openFaqIndex === index;
            const triggerId = `faq-trigger-${index}`;
            const panelId = `faq-panel-${index}`;

            return (
              <article key={question} className={isOpen ? 'faq-item open' : 'faq-item'}>
                <button
                  id={triggerId}
                  type="button"
                  className="faq-question"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenFaqIndex(current => current === index ? -1 : index)}
                >
                  <span>{question}</span>
                  <ChevronDown className="faq-icon" size={19} aria-hidden="true" />
                </button>
                <div
                  id={panelId}
                  className={isOpen ? 'faq-answer open' : 'faq-answer'}
                  role="region"
                  aria-labelledby={triggerId}
                >
                  <div className="faq-answer-inner">
                    <p><SupportEmailAnswer answer={answer} /></p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="final-cta">
        <h2>{text.finalTitle}</h2>
        <p>{text.finalSubtitle}</p>
        <Link href={appHref} className="sfm-button-primary">{primaryLabel}</Link>
      </section>

      <footer className="landing-footer">
        <div className="footer-brand">
          <Image src="/sfm-logo.png" alt="THE SFM" width={42} height={42} className="landing-logo" />
          <strong>THE SFM</strong>
          <p>
            {text.supportContactLine}{' '}
            <a href={SUPPORT_EMAIL_SUPPORT_MAILTO} aria-label={SUPPORT_EMAIL_ARIA_LABEL}>{SUPPORT_EMAIL}</a>
          </p>
          <a className="footer-social-link" href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label={INSTAGRAM_ARIA_LABEL}>
            <Instagram size={16} aria-hidden="true" />
            <span>Instagram</span>
          </a>
        </div>
        <FooterColumn title={text.footerProduct} links={[['/', 'THE SFM'], ['/dashboard', text.openDashboard], ['/reports-center', text.reportsCenter]]} />
        <FooterColumn title={text.footerTools} links={[['/business-hub', text.businessHub], ['/zakat', text.zakat], ['/reports-center', text.reportsCenter]]} />
        <FooterColumn title={text.footerCompany} links={[['/about', aboutLabel], ['/#faq', text.navFaq]]} />
        <FooterColumn title={text.footerAccount} links={[[appHref, primaryLabel], ['/login', text.login]]} />
        <FooterColumn title={text.footerLegal} links={[['/privacy', text.privacy], ['/terms', text.terms]]} />
        <FooterColumn title={text.footerSupport} links={[['/contact', text.contact], [INSTAGRAM_URL, 'Instagram']]} />
      </footer>

      <style jsx>{landingStyles}</style>
    </main>
  );
}

function ProductPreview({ text }: { text: Record<string, string> }) {
  return (
    <aside className="product-preview" aria-label={text.previewLabel}>
      <div className="preview-label">{text.previewLabel}</div>
      <div className="landing-preview-panel">
        <div className="preview-top">
          <div>
            <span>{text.previewTitle}</span>
            <p>{text.previewSubtitle}</p>
          </div>
          <LineChart size={26} />
        </div>
        <div className="preview-grid">
          {[text.previewIncome, text.previewExpenses, text.previewProjects, text.previewZakat].map(label => (
            <div key={label}>
              <small>{label}</small>
              <strong>{text.previewStatus}</strong>
            </div>
          ))}
        </div>
        <div className="preview-warning">
          <ShieldCheck size={18} />
          <span>{text.previewMissing}</span>
        </div>
      </div>
    </aside>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="footer-column">
      <strong>{title}</strong>
      {links.map(([href, label]) => href.startsWith('mailto:') || href.startsWith('http')
        ? <a key={`${title}-${href}-${label}`} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{label}</a>
        : <Link key={`${title}-${href}-${label}`} href={href}>{label}</Link>)}
    </div>
  );
}

function SupportEmailAnswer({ answer }: { answer: string }) {
  if (!answer.includes(SUPPORT_EMAIL)) return <>{answer}</>;

  const [before, after = ''] = answer.split(SUPPORT_EMAIL);
  return (
    <>
      {before}
      <a href={SUPPORT_EMAIL_SUPPORT_MAILTO} aria-label={SUPPORT_EMAIL_ARIA_LABEL}>{SUPPORT_EMAIL}</a>
      {after}
    </>
  );
}

const landingStyles = `
  .landing-page {
    width: 100%;
    max-width: 100%;
    min-height: 100vh;
    overflow-x: clip;
    color: var(--foreground-secondary);
    background: var(--background);
    font-family: var(--font-ui);
  }
  .landing-nav {
    position: sticky;
    top: 12px;
    z-index: 150;
    width: min(1180px, calc(100% - 32px));
    margin: 12px auto 0;
    min-height: 64px;
    border: 1px solid var(--border);
    border-radius: var(--radius-panel);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 10px 14px;
    max-width: calc(100% - 32px);
    overflow: visible;
  }
  .landing-brand, .landing-actions, .landing-links, .hero-buttons, .trust-card, .feature-card div, .ai-icon, .audience-grid article, .footer-brand {
    display: flex;
    align-items: center;
    min-width: 0;
  }
  .landing-brand {
    gap: 10px;
    color: var(--foreground);
    text-decoration: none;
    font-weight: 700;
  }
  .landing-logo {
    border-radius: var(--radius-control);
    object-fit: cover;
    box-shadow: var(--shadow-sm);
  }
  .landing-links {
    gap: 8px;
    justify-content: center;
    flex: 1;
  }
  .mobile-menu-ctas {
    display: none;
  }
  .landing-links a, .nav-login {
    min-height: 38px;
    border-radius: var(--radius-pill);
    color: var(--foreground-secondary);
    text-decoration: none;
    font-weight: var(--type-button-weight);
    font-size: var(--type-button-size);
    padding: 8px 12px;
    border: 1px solid transparent;
  }
  .landing-links a:hover, .nav-login:hover {
    background: var(--surface-hover);
    color: var(--foreground);
    border-color: var(--border-strong);
    box-shadow: var(--shadow-xs);
    transform: translateY(-1px);
  }
  .landing-links a.active,
  .landing-links a[aria-current="location"] {
    background: var(--primary-soft);
    border-color: color-mix(in srgb, var(--primary) 38%, var(--border));
    color: var(--primary-hover);
    box-shadow: var(--active-indicator-shadow);
  }
  .landing-links a.active::after,
  .landing-links a[aria-current="location"]::after {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: var(--radius-pill);
    background: var(--primary);
  }
  .landing-actions {
    gap: 8px;
    justify-content: flex-end;
  }
  .landing-actions .sfm-theme-toggle {
    width: 40px;
    min-width: 40px;
    height: 40px;
    border-radius: var(--radius-control);
  }
  .nav-primary, .primary-cta, .final-cta a {
    border: 1px solid var(--primary);
    border-radius: var(--radius-pill);
    background: var(--primary);
    color: var(--primary-foreground);
    box-shadow: var(--shadow-xs);
    text-decoration: none;
    font-weight: var(--type-button-weight);
    transition: transform 180ms var(--ease), box-shadow 180ms var(--ease), filter 180ms var(--ease), background 180ms var(--ease);
  }
  .nav-primary:hover, .primary-cta:hover, .final-cta a:hover {
    background: var(--primary-hover);
    border-color: var(--primary-hover);
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
  }
  .nav-primary:active, .primary-cta:active, .final-cta a:active {
    transform: translateY(0) scale(0.98);
    box-shadow: var(--shadow-xs);
  }
  .nav-primary {
    min-height: 40px;
    display: grid;
    place-items: center;
    padding: 8px 14px;
    font-size: 13px;
  }
  .mobile-menu-button {
    display: none;
    width: 40px;
    height: var(--control-h);
    border-radius: var(--radius-control);
    border: 1px solid var(--border-strong);
    background: var(--surface);
    color: var(--foreground);
  }
  .hero-section {
    width: min(1180px, calc(100% - 32px));
    max-width: calc(100% - 32px);
    margin: 18px auto 0;
    min-height: 560px;
    display: grid;
    grid-template-columns: minmax(0, 1.04fr) minmax(340px, 0.96fr);
    align-items: center;
    gap: 22px;
    padding: 34px 0 46px;
    overflow-x: clip;
  }
  .hero-copy {
    display: grid;
    gap: 16px;
    min-width: 0;
    max-width: 100%;
  }
  .kicker {
    width: fit-content;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--accent-hover);
    background: var(--accent-soft);
    border: 1px solid color-mix(in srgb, var(--accent) 32%, var(--border));
    border-radius: var(--radius-pill);
    padding: 8px 13px;
    font-size: 12px;
    font-weight: var(--type-label-weight);
  }
  .hero-copy h1 {
    margin: 0;
    color: var(--foreground);
    font-size: clamp(36px, 6vw, 68px);
    line-height: 1.04;
    font-weight: var(--type-display-weight);
    letter-spacing: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  .hero-copy p {
    max-width: 700px;
    margin: 0;
    color: var(--foreground-muted);
    font-size: 18px;
    line-height: 1.75;
    font-weight: var(--type-body-weight);
    overflow-wrap: anywhere;
  }
  .hero-buttons {
    gap: 12px;
    flex-wrap: wrap;
  }
  .primary-cta, .secondary-cta {
    min-height: 50px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 20px;
  }
  .secondary-cta {
    border-radius: var(--radius-pill);
    border: 1px solid var(--border-strong);
    background: var(--surface);
    color: var(--foreground);
    text-decoration: none;
    font-weight: var(--type-button-weight);
  }
  .secondary-cta:hover {
    border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
    background: var(--surface-hover);
    color: var(--foreground);
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
  }
  .secondary-cta:active {
    transform: translateY(0) scale(0.985);
  }
  .product-preview {
    display: grid;
    gap: 12px;
    min-width: 0;
    max-width: 100%;
  }
  .preview-label {
    justify-self: start;
    border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
    border-radius: var(--radius-pill);
    background: var(--accent-soft);
    color: var(--accent-hover);
    padding: 8px 12px;
    font-size: var(--type-label-size);
    font-weight: var(--type-label-weight);
  }
  .landing-preview-panel {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-panel);
    /* The product preview is the homepage's single intentional brand gradient. */
    background: var(--hero-gradient);
    color: var(--hero-foreground);
    border: 1px solid color-mix(in srgb, var(--primary) 44%, var(--border));
    box-shadow: var(--shadow-lg);
    padding: 24px;
    min-width: 0;
    max-width: 100%;
  }
  .preview-top {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 22px;
    min-width: 0;
  }
  .preview-top span {
    color: var(--hero-foreground);
    font-weight: 600;
    font-size: var(--type-label-size);
  }
  .preview-top p {
    margin: 7px 0 0;
    color: var(--hero-foreground-muted);
    line-height: var(--type-body-leading);
    font-weight: var(--type-body-weight);
    overflow-wrap: anywhere;
  }
  .preview-top svg {
    color: var(--hero-foreground);
  }
  .preview-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .preview-grid div {
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface-elevated);
    padding: 14px;
    box-shadow: var(--shadow-xs);
  }
  .preview-grid small {
    display: block;
    color: var(--foreground-muted);
    font-weight: var(--type-label-weight);
  }
  .preview-grid strong {
    display: block;
    margin-top: 8px;
    color: var(--foreground);
    font-size: 14px;
    font-weight: 600;
  }
  .preview-warning {
    margin-top: 14px;
    border: 1px solid color-mix(in srgb, var(--warning) 34%, var(--border));
    border-radius: var(--radius-card);
    padding: 12px;
    background: var(--warning-soft);
    color: var(--warning);
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
  }
  .preview-warning span {
    color: var(--warning);
  }
  .trust-section, .how-section, .section-block, .ai-section, .final-cta, .landing-footer {
    width: min(1180px, calc(100% - 32px));
    max-width: calc(100% - 32px);
    margin: 0 auto;
  }
  .trust-section {
    display: grid;
    grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr);
    gap: 18px;
    align-items: center;
    border-radius: var(--radius-panel);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-card);
    padding: 22px;
  }
  .trust-section h2, .section-heading h2, .landing-ai-card h2, .final-cta h2 {
    margin: 0;
    color: var(--foreground);
    font-weight: var(--type-section-title-weight);
  }
  .trust-section p, .section-heading p, .landing-ai-card p, .final-cta p, .pricing-card p, .faq-answer p {
    margin: 8px 0 0;
    color: var(--foreground-muted);
    line-height: var(--type-body-leading);
    font-weight: var(--type-body-weight);
  }
  .trust-grid, .how-grid, .feature-grid, .audience-grid, .pricing-grid, .faq-accordion {
    display: grid;
    gap: 14px;
  }
  .trust-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .trust-card {
    gap: 10px;
    min-width: 0;
    border-radius: var(--radius-card);
    background: var(--surface-muted);
    border: 1px solid var(--border);
    padding: 14px;
    color: var(--foreground-secondary);
    font-weight: 500;
  }
  .trust-card svg, .feature-card svg, .audience-grid svg {
    color: var(--accent);
  }
  .how-section {
    padding-top: 56px;
  }
  .how-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .how-card {
    position: relative;
    min-width: 0;
    border-radius: var(--radius-panel);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-card);
    padding: 18px;
    display: grid;
    gap: 14px;
    align-content: start;
  }
  .how-number {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-pill);
    background: var(--primary-soft);
    color: var(--primary-hover);
    font-weight: 600;
  }
  .how-icon {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-card);
    background: var(--primary-soft);
    border: 1px solid color-mix(in srgb, var(--primary) 24%, var(--border));
    color: var(--primary);
  }
  .how-card p {
    margin: 0;
    color: var(--foreground);
    line-height: 1.75;
    font-weight: 500;
  }
  .section-block {
    padding: 56px 0 0;
  }
  .section-heading {
    max-width: 760px;
    margin-bottom: 18px;
  }
  .section-heading span, .landing-ai-card span {
    color: var(--primary-hover);
    font-size: var(--type-label-size);
    font-weight: var(--type-label-weight);
  }
  .section-heading h2, .landing-ai-card h2, .final-cta h2 {
    margin-top: 8px;
    font-size: clamp(28px, 4vw, 44px);
    line-height: 1.15;
  }
  .feature-grid {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
  .feature-card, .pricing-card, .faq-item, .audience-grid article {
    min-width: 0;
    border-radius: var(--radius-panel);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-card);
    padding: 18px;
    transition: border-color 180ms var(--ease), box-shadow 180ms var(--ease), transform 180ms var(--ease), background-color 180ms var(--ease);
  }
  .feature-card {
    display: block;
    color: inherit;
    text-decoration: none;
  }
  a.feature-card {
    cursor: pointer;
  }
  .feature-card div, .ai-icon {
    width: 46px;
    height: 46px;
    justify-content: center;
    border-radius: var(--radius-card);
    background: var(--primary-soft);
    border: 1px solid color-mix(in srgb, var(--primary) 24%, var(--border));
  }
  .feature-card h3, .pricing-card h3 {
    margin: 16px 0 7px;
    color: var(--foreground);
    font-size: 18px;
    transition: color 180ms var(--ease);
  }
  .feature-card:hover, .feature-card:focus-visible, .pricing-card:hover, .faq-item:hover, .audience-grid article:hover {
    border-color: color-mix(in srgb, var(--primary) 38%, var(--border));
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
  .feature-card:focus-visible {
    outline: none;
    box-shadow: var(--focus-shadow), var(--shadow-md);
  }
  .feature-card:hover div, .feature-card:focus-visible div {
    border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
    background: var(--primary-soft);
    box-shadow: var(--shadow-xs);
  }
  .feature-card:hover h3, .feature-card:focus-visible h3, .pricing-card:hover h3 {
    color: var(--primary-hover);
  }
  .feature-card p {
    margin: 0;
    color: var(--foreground-muted);
    font-size: 13px;
    line-height: 1.7;
    font-weight: var(--type-body-small-weight);
  }
  .tool-filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: -6px 0 18px;
  }
  .tool-filter {
    min-height: 42px;
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--foreground-muted);
    padding: 8px 14px;
    font: var(--type-button-weight) var(--type-button-size)/var(--type-button-leading) var(--font-ui);
    cursor: pointer;
    transition: background 180ms var(--ease), color 180ms var(--ease), border-color 180ms var(--ease), box-shadow 180ms var(--ease), transform 180ms var(--ease);
  }
  .tool-filter:hover,
  .tool-filter.active {
    background: var(--primary-soft);
    color: var(--primary-hover);
    border-color: color-mix(in srgb, var(--primary) 38%, var(--border));
    box-shadow: var(--shadow-xs);
    transform: translateY(-1px);
  }
  .tool-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
  .tool-card {
    display: grid;
    align-content: start;
    gap: 12px;
    min-height: 244px;
  }
  .feature-card .tool-card-top {
    width: 100%;
    height: auto;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
  .feature-card .tool-icon {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-card);
    background: var(--primary-soft);
    border: 1px solid color-mix(in srgb, var(--primary) 24%, var(--border));
    color: var(--primary);
  }
  .tool-badge {
    align-self: start;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border);
    background: var(--info-soft);
    color: var(--info);
    padding: 5px 9px;
    font-size: 12px;
    font-weight: var(--type-label-weight);
  }
  .tool-badge.smart {
    border-color: color-mix(in srgb, var(--accent) 30%, var(--border));
    background: var(--accent-soft);
    color: var(--accent-hover);
  }
  .tool-badge.new {
    border-color: color-mix(in srgb, var(--warning) 30%, var(--border));
    background: var(--warning-soft);
    color: var(--warning);
  }
  .tool-badge.core {
    border-color: color-mix(in srgb, var(--success) 30%, var(--border));
    background: var(--success-soft);
    color: var(--success);
  }
  .tool-card h3 {
    margin: 2px 0 0;
  }
  .tool-open {
    width: fit-content;
    margin-top: auto;
    border-radius: var(--radius-pill);
    background: var(--primary-soft);
    color: var(--primary-hover);
    padding: 7px 11px;
    font-size: 12px;
    font-weight: var(--type-label-weight);
  }
  .tool-card:hover .tool-open,
  .tool-card:focus-visible .tool-open {
    background: var(--primary);
    color: var(--primary-foreground);
  }
  .ai-section {
    padding-top: 56px;
  }
  .landing-ai-card {
    border-radius: var(--radius-panel);
    background: var(--surface-elevated) !important;
    color: var(--foreground);
    border: 1px solid var(--border) !important;
    box-shadow: var(--shadow-card) !important;
    padding: 30px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 18px;
  }
  .landing-ai-card h2 {
    color: var(--foreground);
  }
  .landing-ai-card p {
    color: var(--foreground-secondary);
  }
  .landing-ai-card > div > span {
    color: var(--accent-hover);
  }
  .landing-ai-example {
    margin-top: 16px;
    width: fit-content;
    border-radius: var(--radius-pill);
    background: var(--accent-soft);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
    color: var(--accent-hover);
    padding: 9px 13px;
    font-weight: 500;
  }
  .compact {
    padding-top: 56px;
  }
  .audience-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .audience-grid article {
    align-items: flex-start;
    gap: 10px;
    flex-direction: column;
  }
  .audience-grid article p {
    margin: 0;
    color: var(--foreground-muted);
    line-height: 1.7;
    font-size: 13px;
    font-weight: var(--type-body-small-weight);
  }
  .pricing-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: stretch;
  }
  .billing-toggle-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
    margin: -8px 0 22px;
  }
  .billing-toggle {
    display: inline-flex;
    align-items: center;
    padding: 5px;
    border-radius: var(--radius-pill);
    background: var(--surface-muted);
    border: 1px solid var(--border);
  }
  .billing-toggle button {
    border: 0;
    border-radius: var(--radius-pill);
    padding: 10px 18px;
    background: transparent;
    color: var(--foreground-secondary);
    font: var(--type-button-weight) var(--type-button-size)/var(--type-button-leading) var(--font-ui);
    cursor: pointer;
    transition: 0.2s ease;
  }
  .billing-toggle button.active {
    color: var(--primary-foreground);
    background: var(--primary);
    box-shadow: var(--shadow-xs);
  }
  .billing-note {
    color: var(--primary-hover);
    font-size: 13px;
    font-weight: 500;
  }
  .pricing-alert {
    max-width: 760px;
    margin: 0 auto 18px;
    border: 1px solid color-mix(in srgb, var(--danger) 32%, var(--border));
    background: var(--danger-soft);
    color: var(--danger);
    border-radius: var(--radius-control);
    padding: 12px 16px;
    text-align: center;
    font-weight: 500;
  }
  .pricing-card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }
  .pricing-card.featured {
    border-color: color-mix(in srgb, var(--primary) 48%, var(--border));
    box-shadow: var(--active-indicator-top-raised);
    transform: translateY(-8px);
  }
  .pricing-badge {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    border-radius: var(--radius-pill);
    padding: 7px 11px;
    margin-bottom: 12px;
    background: var(--primary-soft);
    color: var(--primary-hover);
    font-size: 12px;
    font-weight: var(--type-label-weight);
  }
  .pricing-card strong {
    color: var(--foreground);
    font-family: var(--font-data);
    font-size: 30px;
    line-height: 1.2;
    margin-top: 6px;
    display: block;
  }
  .pricing-interval {
    display: block;
    margin-top: 8px;
    color: var(--foreground-muted);
    font-size: 13px;
    font-weight: 500;
  }
  .pricing-card ul {
    list-style: none;
    margin: 18px 0 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .pricing-card li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: var(--foreground-secondary);
    font-size: 14px;
    line-height: 1.7;
    font-weight: var(--type-body-weight);
  }
  .pricing-card li svg {
    flex: 0 0 auto;
    margin-top: 4px;
    color: var(--success);
  }
  .pricing-action {
    margin-top: auto;
    width: 100%;
    min-height: 48px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--primary-hover);
    font: var(--type-button-weight) var(--type-button-size)/var(--type-button-leading) var(--font-ui);
    cursor: pointer;
    transition: 0.2s ease;
  }
  .pricing-action.primary,
  .pricing-action:hover {
    border-color: var(--primary);
    background: var(--primary);
    color: var(--primary-foreground);
    box-shadow: var(--shadow-xs);
  }
  .pricing-action:disabled {
    cursor: not-allowed;
    opacity: 0.7;
    box-shadow: none;
  }
  .faq-block {
    scroll-margin-top: 105px;
  }
  .faq-accordion {
    grid-template-columns: 1fr;
    max-width: 980px;
  }
  .faq-item {
    overflow: hidden;
    padding: 0;
  }
  .faq-item.open {
    border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
    background: var(--surface-elevated);
    box-shadow: var(--active-indicator-inline-start-raised);
  }
  [dir="rtl"] .faq-item.open {
    box-shadow: var(--active-indicator-inline-end-raised);
  }
  .faq-question {
    width: 100%;
    min-height: 64px;
    border: 0;
    background: transparent;
    color: var(--foreground);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px;
    font: var(--type-card-title-weight) var(--type-card-title-size)/var(--type-card-title-leading) var(--font-ui);
    text-align: start;
    cursor: pointer;
    transition: color 180ms var(--ease), background 180ms var(--ease);
  }
  .faq-question:hover {
    background: var(--surface-hover);
    color: var(--primary-hover);
  }
  .faq-question:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -6px;
  }
  .faq-question span {
    min-width: 0;
  }
  .faq-icon {
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    padding: 7px;
    border-radius: var(--radius-pill);
    color: var(--primary-hover);
    background: var(--primary-soft);
    border: 1px solid color-mix(in srgb, var(--primary) 24%, var(--border));
    transition: transform 220ms var(--ease), background 180ms var(--ease), color 180ms var(--ease), border-color 180ms var(--ease);
  }
  .faq-item.open .faq-icon {
    transform: rotate(180deg);
    color: var(--primary-foreground);
    background: var(--primary);
    border-color: var(--primary);
  }
  .faq-answer {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transition: grid-template-rows 240ms var(--ease), opacity 180ms var(--ease);
  }
  .faq-answer.open {
    grid-template-rows: 1fr;
    opacity: 1;
  }
  .faq-answer-inner {
    overflow: hidden;
  }
  .faq-answer p {
    margin: 0;
    padding: 0 20px 20px;
    color: var(--foreground-secondary);
    font-size: 15px;
    line-height: 1.9;
    font-weight: var(--type-body-weight);
  }
  .faq-answer a {
    color: var(--primary-hover);
    font-weight: 600;
    text-decoration: none;
  }
  .faq-answer a:hover,
  .faq-answer a:focus-visible {
    color: var(--foreground);
    outline: none;
    text-decoration: underline;
  }
  .final-cta {
    margin-top: 56px;
    border: 1px solid color-mix(in srgb, var(--primary) 38%, var(--border));
    border-radius: var(--radius-panel);
    text-align: center;
    padding: 34px 24px;
    color: var(--foreground);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-md);
  }
  .final-cta h2 {
    color: var(--foreground);
  }
  .final-cta p {
    max-width: 720px;
    margin: 12px auto 22px;
    color: var(--foreground-secondary);
  }
  .final-cta a {
    min-height: 50px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 22px;
    background: var(--primary);
  }
  .landing-footer {
    margin-top: 42px;
    padding: 24px 0 30px;
    display: grid;
    grid-template-columns: 1.25fr repeat(6, minmax(0, 1fr));
    gap: 18px;
  }
  .footer-brand {
    gap: 10px;
    align-self: start;
    color: var(--foreground);
    font-weight: 700;
    flex-wrap: wrap;
    min-width: 0;
  }
  .footer-brand p {
    flex-basis: 100%;
    margin: 4px 0 0;
    color: var(--foreground-muted);
    font-size: 13px;
    line-height: 1.6;
  }
  .footer-brand p a {
    color: var(--primary-hover);
    cursor: pointer;
    font-weight: 600;
    text-decoration: none;
    transition: color 180ms var(--ease), text-decoration-color 180ms var(--ease);
  }
  .footer-brand p a:hover {
    color: var(--primary-hover);
    text-decoration: underline;
    text-decoration-color: var(--accent);
    text-underline-offset: 4px;
  }
  .footer-social-link {
    flex-basis: 100%;
    width: max-content;
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-top: 8px;
    padding: 8px 11px;
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    background: var(--surface-muted);
    color: var(--primary-hover);
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
    transition: background 180ms var(--ease), border-color 180ms var(--ease), color 180ms var(--ease), transform 180ms var(--ease);
  }
  .footer-social-link:hover {
    background: var(--surface-hover);
    border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
    color: var(--primary-hover);
    transform: translateY(-1px);
  }
  .footer-column {
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  .footer-column strong {
    color: var(--foreground);
  }
  .footer-column a {
    color: var(--foreground-muted);
    text-decoration: none;
    font-weight: 500;
    border-radius: var(--radius-sm);
    padding: 2px 0;
    transition: color 180ms var(--ease), transform 180ms var(--ease), text-decoration-color 180ms var(--ease);
  }
  .footer-column a:hover {
    color: var(--primary-hover);
    text-decoration: underline;
    text-decoration-color: var(--accent);
    transform: translateX(-2px);
  }
  a:focus-visible, button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 3px;
  }

  @media (max-width: 980px) {
    .landing-nav {
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .landing-links {
      order: 3;
      flex-basis: 100%;
      display: none;
      grid-template-columns: 1fr;
      justify-content: stretch;
      padding-top: 8px;
    }
    .landing-links.open {
      display: grid;
      margin-top: 10px;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface-elevated);
      box-shadow: var(--shadow-popover);
    }
    .landing-links a {
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 10px 12px;
      border: 1px solid var(--border);
      background: var(--surface-muted);
      text-align: start;
    }
    [dir="rtl"] .landing-links a {
      justify-content: flex-end;
    }
    .mobile-menu-ctas {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      padding-top: 8px;
    }
    .mobile-menu-ctas a {
      min-height: 44px;
      width: 100%;
      padding: 11px 14px;
    }
    .nav-login, .nav-primary {
      display: none;
    }
    .mobile-menu-button {
      display: grid;
      place-items: center;
    }
    .hero-section {
      min-height: auto;
      grid-template-columns: 1fr;
      padding: 28px 0 38px;
    }
    .trust-section, .landing-ai-card, .landing-footer {
      grid-template-columns: 1fr;
    }
    .landing-footer {
      padding-inline: 16px;
      border-radius: var(--radius-panel);
    }
    .footer-brand,
    .footer-column {
      min-width: 0;
      justify-items: start;
      text-align: start;
    }
    [dir="rtl"] .footer-brand,
    [dir="rtl"] .footer-column {
      justify-items: end;
      text-align: right;
    }
    .footer-brand p,
    .footer-column strong,
    .footer-column a {
      max-width: 100%;
      overflow-wrap: anywhere;
    }
    .how-grid, .audience-grid, .pricing-grid, .faq-accordion {
      grid-template-columns: 1fr;
    }
    .pricing-card.featured {
      transform: none;
    }
  }
  @media (max-width: 620px) {
    .landing-nav, .hero-section, .trust-section, .how-section, .section-block, .ai-section, .final-cta, .landing-footer {
      width: min(1180px, calc(100% - 24px));
      max-width: calc(100% - 24px);
    }
    .landing-nav {
      margin-top: 12px;
      border-radius: var(--radius-card);
    }
    .landing-brand span {
      display: none;
    }
    .landing-actions {
      gap: 6px;
    }
    .hero-copy h1 {
      font-size: clamp(30px, 9vw, 36px);
    }
    .hero-copy p {
      font-size: 16px;
    }
    .hero-buttons {
      display: grid;
      grid-template-columns: 1fr;
    }
    .mobile-menu-ctas {
      grid-template-columns: 1fr;
    }
    .primary-cta, .secondary-cta {
      width: 100%;
    }
    .landing-preview-panel {
      padding: 18px;
      border-radius: var(--radius-panel);
    }
    .preview-grid, .trust-grid {
      grid-template-columns: 1fr;
    }
    .how-section, .section-block, .ai-section {
      padding-top: 42px;
    }
    .landing-ai-card {
      padding: 22px;
    }
    .landing-ai-example {
      width: 100%;
      border-radius: var(--radius-card);
    }
    .landing-footer {
      margin-top: 32px;
      padding: 22px 16px 24px;
    }
  }
`;
