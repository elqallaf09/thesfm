'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
  LineChart,
  Menu,
  PiggyBank,
  Presentation,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from 'lucide-react';

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { SUPPORT_EMAIL, SUPPORT_EMAIL_MAILTO } from '@/lib/constants/contact';

type Lang = 'ar' | 'en' | 'fr';

const COPY = {
  ar: {
    navFeatures: 'المميزات',
    navTools: 'الأدوات',
    navPricing: 'الأسعار',
    navFaq: 'الأسئلة الشائعة',
    login: 'تسجيل الدخول',
    start: 'ابدأ الآن',
    openDashboard: 'فتح لوحة التحكم',
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
    previewStatus: 'جاهز عند إضافة البيانات',
    previewMissing: 'تظهر بيانات غير كافية عند نقص المدخلات',
    trustRealData: 'بياناتك الحقيقية فقط',
    trustModules: 'المال والمشاريع في مساحة واحدة',
    trustLanguages: 'واجهة عربية وإنجليزية وفرنسية',
    trustGuardrails: 'حماية من الأرقام والتوقعات غير المدعومة',
    featuresTitle: 'كل أدواتك المالية في مكان واحد',
    featuresSubtitle: 'صممت THE SFM لتجميع المتابعة اليومية، التقارير، المشاريع، والزكاة بدون خلط البيانات الحقيقية مع بيانات تجريبية.',
    aiTitle: 'مساعد مالي ذكي يحترم بياناتك',
    aiSubtitle: 'يقرأ المساعد بياناتك الفعلية ويقترح الخطوات القادمة عندما تكون المعلومات كافية. إذا كانت البيانات ناقصة، يعرض ذلك بوضوح بدلاً من اختراع أرقام.',
    aiExampleLabel: 'مثال توضيحي',
    aiExampleText: 'أضف الدخل والمصروفات والمدخرات للحصول على تحليل أدق.',
    usersTitle: 'من يستخدم THE SFM؟',
    usersSubtitle: 'للأفراد ورواد الأعمال والفرق الصغيرة التي تريد رؤية مالية أوضح دون ضجيج.',
    pricingTitle: 'الأسعار',
    pricingSubtitle: 'تفاصيل الأسعار قريباً',
    pricingNote: 'لن نعرض أسعاراً نهائية قبل اعتمادها.',
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
    supportEmailLabel: 'الدعم:',
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
    start: 'Start now',
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
    previewStatus: 'Ready when data is added',
    previewMissing: 'Insufficient data appears when inputs are missing',
    trustRealData: 'Real user data only',
    trustModules: 'Money and projects in one workspace',
    trustLanguages: 'Arabic, English, and French interface',
    trustGuardrails: 'Guardrails against unsupported numbers and forecasts',
    featuresTitle: 'Your financial tools in one place',
    featuresSubtitle: 'THE SFM brings daily tracking, reports, projects, and zakat together without mixing real data with demo data.',
    aiTitle: 'An AI financial assistant that respects your data',
    aiSubtitle: 'The assistant reads your real data and suggests next steps when there is enough information. If data is missing, it says so instead of inventing numbers.',
    aiExampleLabel: 'Illustrative example',
    aiExampleText: 'Add income, expenses, and savings to receive more accurate analysis.',
    usersTitle: 'Who uses THE SFM?',
    usersSubtitle: 'For individuals, founders, and small teams that want a clearer financial operating view without noise.',
    pricingTitle: 'Pricing',
    pricingSubtitle: 'Pricing details coming soon',
    pricingNote: 'We will not show final prices before they are approved.',
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
    supportEmailLabel: 'Support:',
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
    previewStatus: 'Prêt après ajout des données',
    previewMissing: 'Les données insuffisantes sont signalées quand il manque des entrées',
    trustRealData: 'Données réelles uniquement',
    trustModules: 'Finances et projets dans un seul espace',
    trustLanguages: 'Interface arabe, anglaise et française',
    trustGuardrails: 'Garde-fous contre les chiffres et prévisions non étayés',
    featuresTitle: 'Vos outils financiers au même endroit',
    featuresSubtitle: 'THE SFM réunit suivi quotidien, rapports, projets et zakat sans mélanger données réelles et données de démonstration.',
    aiTitle: 'Un assistant financier IA qui respecte vos données',
    aiSubtitle: 'L’assistant lit vos données réelles et suggère les prochaines étapes quand les informations sont suffisantes. Si les données manquent, il l’indique au lieu d’inventer des chiffres.',
    aiExampleLabel: 'Exemple illustratif',
    aiExampleText: 'Ajoutez revenus, dépenses et épargne pour obtenir une analyse plus précise.',
    usersTitle: 'Qui utilise THE SFM ?',
    usersSubtitle: 'Pour les particuliers, fondateurs et petites équipes qui veulent une vue financière claire sans bruit.',
    pricingTitle: 'Prix',
    pricingSubtitle: 'Détails des prix bientôt disponibles',
    pricingNote: 'Nous n’afficherons pas de prix définitifs avant leur validation.',
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
    supportEmailLabel: 'Support :',
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
  { icon: Wallet, title: ['إدارة الدخل', 'Income management', 'Gestion des revenus'] },
  { icon: ReceiptText, title: ['تتبع المصروفات', 'Expense tracking', 'Suivi des dépenses'] },
  { icon: PiggyBank, title: ['المدخرات والأهداف', 'Savings and goals', 'Épargne et objectifs'] },
  { icon: TrendingUp, title: ['الاستثمارات وتحليلات السوق', 'Investments and market analysis', 'Investissements et analyse de marché'] },
  { icon: Calculator, title: ['الزكاة', 'Zakat', 'Zakat'] },
  { icon: FolderKanban, title: ['المشاريع التجارية', 'Business projects', 'Projets commerciaux'] },
  { icon: HandHeart, title: ['المشاريع الخيرية', 'Charity projects', 'Projets caritatifs'] },
  { icon: FileText, title: ['التقارير', 'Reports', 'Rapports'] },
  { icon: BellRing, title: ['الإشعارات الذكية', 'Smart notifications', 'Notifications intelligentes'] },
  { icon: BriefcaseBusiness, title: ['مركز الأعمال', 'Business Hub', 'Centre d’affaires'] },
  { icon: Presentation, title: ['Pitch Deck', 'Pitch Deck', 'Pitch Deck'] },
  {
    icon: BookOpen,
    href: '/financial-theories',
    title: ['النظريات المالية', 'Financial Theories', 'Théories financières'],
    description: [
      'تعلّم أهم قواعد إدارة المال والادخار والاستثمار بطريقة عملية.',
      'Learn the key principles of money management, saving, and investing in a practical way.',
      'Apprenez les principes clés de la gestion de l’argent, de l’épargne et de l’investissement de manière pratique.',
    ],
  },
] as const;

const audienceKeys = [
  ['الأفراد', 'Individuals', 'Particuliers'],
  ['رواد الأعمال', 'Founders', 'Fondateurs'],
  ['العائلات والفرق الصغيرة', 'Families and small teams', 'Familles et petites équipes'],
] as const;

function pick(list: readonly [string, string, string][], lang: Lang) {
  const index = lang === 'ar' ? 0 : lang === 'fr' ? 2 : 1;
  return list.map(item => item[index]);
}

function pickOne(item: readonly [string, string, string], lang: Lang) {
  const index = lang === 'ar' ? 0 : lang === 'fr' ? 2 : 1;
  return item[index];
}

export default function PublicLandingPage() {
  const { lang, dir } = useLanguage();
  const { session, isGuest } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const text = COPY[(lang as Lang) || 'ar'];
  const appHref = session || isGuest ? '/dashboard' : '/login';
  const primaryLabel = session || isGuest ? text.openDashboard : text.start;
  const aboutLabel = lang === 'ar' ? 'من نحن' : lang === 'fr' ? 'À propos' : 'About';
  const features = useMemo(() => featureItems.map(item => ({
    ...item,
    titleText: pickOne(item.title, lang as Lang),
    descriptionText: item.description ? pickOne(item.description, lang as Lang) : text.previewStatus,
  })), [lang, text.previewStatus]);
  const audiences = useMemo(() => pick(audienceKeys, lang as Lang), [lang]);
  const faqItems = FAQ_ITEMS[(lang as Lang) || 'ar'];

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

  return (
    <main className="landing-page" dir={dir}>
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
            <Link href="/login" className="sfm-button-secondary" onClick={() => setMenuOpen(false)}>{text.login}</Link>
            <Link href={appHref} className="sfm-button-primary" onClick={() => setMenuOpen(false)}>{primaryLabel}</Link>
          </div>
        </div>

        <div className="landing-actions">
          <LanguageSwitcher variant="gold" compact />
          <Link href="/login" className="nav-login sfm-button-secondary">{text.login}</Link>
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

      <section id="features" className="section-block">
        <div className="section-heading">
          <span>{text.navFeatures}</span>
          <h2>{text.featuresTitle}</h2>
          <p>{text.featuresSubtitle}</p>
        </div>
        <div id="tools" className="feature-grid">
          {features.map(feature => {
            const Icon = feature.icon ?? Zap;
            const content = (
              <>
                <div><Icon size={22} /></div>
                <h3>{feature.titleText}</h3>
                <p>{feature.descriptionText}</p>
              </>
            );

            return feature.href ? (
              <Link key={feature.titleText} href={feature.href} className="feature-card" aria-label={feature.titleText}>
                {content}
              </Link>
            ) : (
              <article key={feature.titleText} className="feature-card">
                {content}
              </article>
            );
          })}
        </div>
      </section>

      <section className="ai-section">
        <div className="ai-card">
          <div className="ai-icon"><Bot size={30} /></div>
          <div>
            <span>{text.aiExampleLabel}</span>
            <h2>{text.aiTitle}</h2>
            <p>{text.aiSubtitle}</p>
            <div className="ai-example">{text.aiExampleText}</div>
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
            <article key={item}>
              <ShieldCheck size={20} />
              <strong>{item}</strong>
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
        <div className="pricing-grid">
          {[text.planFree, text.planPro, text.planBusiness].map(plan => (
            <article key={plan} className="pricing-card">
              <h3>{plan}</h3>
              <strong>{text.pricingSubtitle}</strong>
              <p>{text.pricingNote}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stories-section">
        <div>
          <span>{text.comingSoon}</span>
          <h2>{text.testimonialsTitle}</h2>
          <p>{text.testimonialsSubtitle}</p>
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
        </div>
        <FooterColumn title={text.footerProduct} links={[['/login', text.login], ['/dashboard', text.openDashboard], ['/reports-center', text.navTools]]} />
        <FooterColumn title={text.footerTools} links={[['/business-hub', text.businessHub], ['/zakat', text.zakat], ['/reports-center', text.reportsCenter]]} />
        <FooterColumn title={text.footerCompany} links={[['/about', aboutLabel], ['/#faq', text.navFaq]]} />
        <FooterColumn title={text.footerAccount} links={[['/login', text.login], ['/setup', text.start]]} />
        <FooterColumn title={text.footerLegal} links={[['/privacy', text.privacy], ['/terms', text.terms]]} />
        <FooterColumn title={text.footerSupport} links={[[SUPPORT_EMAIL_MAILTO, `${text.supportEmailLabel} ${SUPPORT_EMAIL}`]]} />
      </footer>

      <style jsx>{landingStyles}</style>
    </main>
  );
}

function ProductPreview({ text }: { text: Record<string, string> }) {
  return (
    <aside className="product-preview" aria-label={text.previewLabel}>
      <div className="preview-label">{text.previewLabel}</div>
      <div className="preview-panel">
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
      {links.map(([href, label]) => href.startsWith('mailto:')
        ? <a key={`${title}-${href}-${label}`} href={href}>{label}</a>
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
      <a href={SUPPORT_EMAIL_MAILTO}>{SUPPORT_EMAIL}</a>
      {after}
    </>
  );
}

const landingStyles = `
  .landing-page {
    --landing-heading: var(--sfm-heading);
    --landing-body: var(--sfm-body);
    --landing-muted: var(--sfm-muted-readable);
    --landing-dark-text: #EAF6FF;
    --landing-dark-muted: #A7C7E7;
    --landing-border: rgba(29, 140, 255, 0.20);
    min-height: 100vh;
    overflow-x: hidden;
    color: var(--landing-body);
    background:
      radial-gradient(circle at 18% 8%, rgba(24, 212, 212, 0.18), transparent 26%),
      radial-gradient(circle at 85% 18%, rgba(29, 140, 255, 0.16), transparent 26%),
      linear-gradient(180deg, #EEF6FF 0%, #F8FBFF 50%, #FFFFFF 100%);
    font-family: Tajawal, Arial, sans-serif;
  }
  .landing-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    width: min(1180px, calc(100% - 32px));
    margin: 16px auto 0;
    min-height: 70px;
    border: 1px solid var(--landing-border);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.86);
    box-shadow: 0 18px 55px rgba(3, 18, 37, 0.1);
    backdrop-filter: blur(18px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 14px;
  }
  .landing-brand, .landing-actions, .landing-links, .hero-buttons, .trust-card, .feature-card div, .ai-icon, .audience-grid article, .footer-brand {
    display: flex;
    align-items: center;
  }
  .landing-brand {
    gap: 10px;
    color: var(--landing-heading);
    text-decoration: none;
    font-weight: 950;
  }
  .landing-logo {
    border-radius: 14px;
    object-fit: cover;
    box-shadow: 0 10px 24px rgba(3, 18, 37, 0.16);
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
    border-radius: 999px;
    color: var(--landing-body);
    text-decoration: none;
    font-weight: 900;
    font-size: 13px;
    padding: 8px 12px;
    border: 1px solid transparent;
  }
  .landing-links a:hover, .nav-login:hover {
    background: var(--sfm-surface-hover);
    color: var(--landing-heading);
    border-color: rgba(29, 140, 255, 0.24);
    box-shadow: 0 10px 26px rgba(3, 18, 37, 0.08);
    transform: translateY(-1px);
  }
  .landing-links a.active,
  .landing-links a[aria-current="location"] {
    background: linear-gradient(135deg, rgba(29, 140, 255, 0.14), rgba(24, 212, 212, 0.18));
    border-color: rgba(24, 212, 212, 0.42);
    color: var(--landing-heading);
    box-shadow: 0 10px 28px rgba(29, 140, 255, 0.16), inset 0 -2px 0 rgba(24, 212, 212, 0.78);
  }
  .landing-links a.active::after,
  .landing-links a[aria-current="location"]::after {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #18D4D4;
    box-shadow: 0 0 12px rgba(24, 212, 212, 0.72);
  }
  .landing-actions {
    gap: 8px;
    justify-content: flex-end;
  }
  .nav-primary, .primary-cta, .final-cta a {
    border: 1px solid rgba(24, 212, 212, 0.24);
    border-radius: 999px;
    background: linear-gradient(135deg, #1D8CFF 0%, #18D4D4 100%);
    color: #FFFFFF;
    box-shadow: 0 10px 30px rgba(29, 140, 255, 0.22);
    text-decoration: none;
    font-weight: 950;
    transition: transform 180ms var(--ease), box-shadow 180ms var(--ease), filter 180ms var(--ease), background 180ms var(--ease);
  }
  .nav-primary:hover, .primary-cta:hover, .final-cta a:hover {
    filter: saturate(1.08) brightness(1.04);
    transform: translateY(-2px);
    box-shadow: 0 16px 40px rgba(24, 212, 212, 0.30);
  }
  .nav-primary:active, .primary-cta:active, .final-cta a:active {
    transform: translateY(0) scale(0.98);
    box-shadow: 0 8px 22px rgba(29, 140, 255, 0.18);
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
    height: 40px;
    border-radius: 14px;
    border: 1px solid rgba(29, 140, 255, 0.26);
    background: #FFFFFF;
    color: var(--landing-heading);
  }
  .hero-section {
    width: min(1180px, calc(100% - 32px));
    margin: 26px auto 0;
    min-height: calc(100vh - 120px);
    display: grid;
    grid-template-columns: minmax(0, 1.04fr) minmax(340px, 0.96fr);
    align-items: center;
    gap: 28px;
    padding: 42px 0 70px;
  }
  .hero-copy {
    display: grid;
    gap: 20px;
  }
  .kicker {
    width: fit-content;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #18D4D4;
    background: #061B33;
    border: 1px solid rgba(167, 243, 240, 0.22);
    border-radius: 999px;
    padding: 8px 13px;
    font-size: 12px;
    font-weight: 950;
  }
  .hero-copy h1 {
    margin: 0;
    color: var(--landing-heading);
    font-size: clamp(36px, 6vw, 68px);
    line-height: 1.04;
    font-weight: 950;
    letter-spacing: 0;
  }
  .hero-copy p {
    max-width: 700px;
    margin: 0;
    color: var(--landing-muted);
    font-size: 18px;
    line-height: 1.9;
    font-weight: 700;
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
    border-radius: 999px;
    border: 1px solid rgba(29, 140, 255, 0.26);
    background: #FFFFFF;
    color: var(--landing-heading);
    text-decoration: none;
    font-weight: 950;
  }
  .secondary-cta:hover {
    border-color: rgba(24, 212, 212, 0.44);
    background: var(--sfm-surface-hover);
    color: var(--landing-heading);
    transform: translateY(-2px);
    box-shadow: 0 16px 38px rgba(3, 18, 37, 0.12);
  }
  .secondary-cta:active {
    transform: translateY(0) scale(0.985);
  }
  .product-preview {
    display: grid;
    gap: 12px;
  }
  .preview-label {
    justify-self: start;
    border: 1px solid rgba(29, 140, 255, 0.2);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
    color: #0B2748;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 950;
  }
  .preview-panel {
    position: relative;
    overflow: hidden;
    border-radius: 30px;
    background:
      radial-gradient(circle at 18% 12%, rgba(24, 212, 212, 0.26), transparent 28%),
      linear-gradient(135deg, #031225 0%, #061B33 48%, #0B2748 100%);
    color: #FFFFFF;
    border: 1px solid rgba(167, 243, 240, 0.18);
    box-shadow: 0 30px 90px rgba(3, 18, 37, 0.26);
    padding: 24px;
  }
  .preview-top {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 22px;
  }
  .preview-top span {
    color: #A7F3F0;
    font-weight: 950;
    font-size: 13px;
  }
  .preview-top p {
    margin: 7px 0 0;
    color: var(--landing-dark-muted);
    line-height: 1.7;
    font-weight: 700;
  }
  .preview-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .preview-grid div {
    min-width: 0;
    border: 1px solid rgba(167, 243, 240, 0.16);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.08);
    padding: 14px;
  }
  .preview-grid small {
    display: block;
    color: #A7F3F0;
    font-weight: 900;
  }
  .preview-grid strong {
    display: block;
    margin-top: 8px;
    color: #FFFFFF;
    font-size: 14px;
  }
  .preview-warning {
    margin-top: 14px;
    border: 1px solid rgba(167, 243, 240, 0.18);
    border-radius: 16px;
    padding: 12px;
    background: rgba(24, 212, 212, 0.1);
    color: #EAF6FF;
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 900;
  }
  .trust-section, .section-block, .ai-section, .stories-section, .final-cta, .landing-footer {
    width: min(1180px, calc(100% - 32px));
    margin: 0 auto;
  }
  .trust-section {
    display: grid;
    grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr);
    gap: 18px;
    align-items: center;
    border-radius: 28px;
    background: #FFFFFF;
    border: 1px solid rgba(29, 140, 255, 0.14);
    box-shadow: 0 18px 46px rgba(3, 18, 37, 0.08);
    padding: 22px;
  }
  .trust-section h2, .section-heading h2, .ai-card h2, .stories-section h2, .final-cta h2 {
    margin: 0;
    color: var(--landing-heading);
    font-weight: 950;
  }
  .trust-section p, .section-heading p, .ai-card p, .stories-section p, .final-cta p, .pricing-card p, .faq-answer p {
    margin: 8px 0 0;
    color: var(--landing-muted);
    line-height: 1.8;
    font-weight: 750;
  }
  .trust-grid, .feature-grid, .audience-grid, .pricing-grid, .faq-accordion {
    display: grid;
    gap: 14px;
  }
  .trust-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .trust-card {
    gap: 10px;
    min-width: 0;
    border-radius: 18px;
    background: #F8FBFF;
    border: 1px solid rgba(29, 140, 255, 0.12);
    padding: 14px;
    color: #0B2748;
    font-weight: 900;
  }
  .trust-card svg, .feature-card svg, .audience-grid svg {
    color: #18D4D4;
  }
  .section-block {
    padding: 88px 0 0;
  }
  .section-heading {
    max-width: 760px;
    margin-bottom: 24px;
  }
  .section-heading span, .ai-card span, .stories-section span {
    color: #0B76E0;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
  }
  .section-heading h2, .ai-card h2, .stories-section h2, .final-cta h2 {
    margin-top: 8px;
    font-size: clamp(28px, 4vw, 44px);
    line-height: 1.15;
  }
  .feature-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
  .feature-card, .pricing-card, .faq-item, .audience-grid article {
    min-width: 0;
    border-radius: 22px;
    background: #FFFFFF;
    border: 1px solid rgba(29, 140, 255, 0.13);
    box-shadow: 0 14px 36px rgba(3, 18, 37, 0.07);
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
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(29, 140, 255, 0.12), rgba(24, 212, 212, 0.14));
    border: 1px solid rgba(29, 140, 255, 0.14);
  }
  .feature-card h3, .pricing-card h3 {
    margin: 16px 0 7px;
    color: var(--landing-heading);
    font-size: 18px;
    transition: color 180ms var(--ease);
  }
  .feature-card:hover, .feature-card:focus-visible, .pricing-card:hover, .faq-item:hover, .audience-grid article:hover {
    border-color: rgba(24, 212, 212, 0.38);
    box-shadow: 0 18px 46px rgba(29, 140, 255, 0.13);
    transform: translateY(-2px);
  }
  .feature-card:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(24, 212, 212, 0.35), 0 18px 46px rgba(29, 140, 255, 0.13);
  }
  .feature-card:hover div, .feature-card:focus-visible div {
    border-color: rgba(24, 212, 212, 0.34);
    background: linear-gradient(135deg, rgba(29, 140, 255, 0.18), rgba(24, 212, 212, 0.22));
    box-shadow: 0 12px 28px rgba(24, 212, 212, 0.15);
  }
  .feature-card:hover h3, .feature-card:focus-visible h3, .pricing-card:hover h3 {
    color: #0B76E0;
  }
  .feature-card p {
    margin: 0;
    color: var(--landing-muted);
    font-size: 13px;
    line-height: 1.7;
    font-weight: 750;
  }
  .ai-section {
    padding-top: 90px;
  }
  .ai-card {
    border-radius: 32px;
    background:
      radial-gradient(circle at 12% 10%, rgba(24, 212, 212, 0.24), transparent 28%),
      linear-gradient(135deg, #031225, #061B33 48%, #0B2748);
    color: #FFFFFF;
    border: 1px solid rgba(167, 243, 240, 0.18);
    box-shadow: 0 24px 70px rgba(3, 18, 37, 0.2);
    padding: 30px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 18px;
  }
  .ai-card h2 {
    color: #FFFFFF;
  }
  .ai-card p {
    color: var(--landing-dark-muted);
  }
  .ai-example {
    margin-top: 16px;
    width: fit-content;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(167, 243, 240, 0.18);
    color: #EAF6FF;
    padding: 9px 13px;
    font-weight: 900;
  }
  .compact {
    padding-top: 82px;
  }
  .audience-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .audience-grid article {
    gap: 10px;
  }
  .pricing-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .pricing-card strong {
    color: #0B76E0;
    font-size: 18px;
  }
  .stories-section {
    margin-top: 86px;
    border: 1px dashed rgba(29, 140, 255, 0.28);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.9);
    padding: 30px;
    text-align: center;
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
    border-color: rgba(24, 212, 212, 0.38);
    background:
      linear-gradient(135deg, rgba(29, 140, 255, 0.06), rgba(24, 212, 212, 0.08)),
      #FFFFFF;
    box-shadow: 0 18px 46px rgba(29, 140, 255, 0.13);
  }
  .faq-question {
    width: 100%;
    min-height: 64px;
    border: 0;
    background: transparent;
    color: var(--landing-heading);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px;
    font: 950 17px/1.5 Tajawal, Arial, sans-serif;
    text-align: start;
    cursor: pointer;
    transition: color 180ms var(--ease), background 180ms var(--ease);
  }
  .faq-question:hover {
    background: rgba(29, 140, 255, 0.055);
    color: #0B76E0;
  }
  .faq-question:focus-visible {
    outline: 3px solid rgba(24, 212, 212, 0.55);
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
    border-radius: 999px;
    color: #0B76E0;
    background: rgba(29, 140, 255, 0.10);
    border: 1px solid rgba(29, 140, 255, 0.16);
    transition: transform 220ms var(--ease), background 180ms var(--ease), color 180ms var(--ease), border-color 180ms var(--ease);
  }
  .faq-item.open .faq-icon {
    transform: rotate(180deg);
    color: #FFFFFF;
    background: linear-gradient(135deg, #1D8CFF, #18D4D4);
    border-color: rgba(24, 212, 212, 0.35);
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
    color: #334155;
    font-size: 15px;
    line-height: 1.9;
    font-weight: 750;
  }
  .faq-answer a {
    color: #1D8CFF;
    font-weight: 950;
    text-decoration: none;
  }
  .faq-answer a:hover,
  .faq-answer a:focus-visible {
    color: #061B33;
    outline: none;
    text-decoration: underline;
  }
  .final-cta {
    margin-top: 90px;
    border-radius: 34px;
    text-align: center;
    padding: 46px 24px;
    color: #FFFFFF;
    background:
      radial-gradient(circle at 18% 16%, rgba(24, 212, 212, 0.24), transparent 30%),
      linear-gradient(135deg, #031225, #061B33 56%, #0B2748);
    box-shadow: 0 28px 80px rgba(3, 18, 37, 0.2);
  }
  .final-cta h2 {
    color: #FFFFFF;
  }
  .final-cta p {
    max-width: 720px;
    margin: 12px auto 22px;
    color: var(--landing-dark-muted);
  }
  .final-cta a {
    min-height: 50px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 22px;
    background: linear-gradient(135deg, #1D8CFF, #18D4D4);
  }
  .landing-footer {
    margin-top: 70px;
    padding: 34px 0 44px;
    display: grid;
    grid-template-columns: 1.25fr repeat(6, minmax(0, 1fr));
    gap: 18px;
  }
  .footer-brand {
    gap: 10px;
    align-self: start;
    color: var(--landing-heading);
    font-weight: 950;
  }
  .footer-column {
    display: grid;
    gap: 8px;
  }
  .footer-column strong {
    color: var(--landing-heading);
  }
  .footer-column a {
    color: var(--landing-muted);
    text-decoration: none;
    font-weight: 850;
    border-radius: 10px;
    padding: 2px 0;
    transition: color 180ms var(--ease), transform 180ms var(--ease), text-decoration-color 180ms var(--ease);
  }
  .footer-column a:hover {
    color: #0B76E0;
    text-decoration: underline;
    text-decoration-color: rgba(24, 212, 212, 0.72);
    transform: translateX(-2px);
  }
  a:focus-visible, button:focus-visible {
    outline: 3px solid rgba(24, 212, 212, 0.7);
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
    }
    .landing-links a {
      background: #F8FBFF;
    }
    .mobile-menu-ctas {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
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
      padding-top: 34px;
    }
    .trust-section, .ai-card, .landing-footer {
      grid-template-columns: 1fr;
    }
    .audience-grid, .pricing-grid, .faq-accordion {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 620px) {
    .landing-nav, .hero-section, .trust-section, .section-block, .ai-section, .stories-section, .final-cta, .landing-footer {
      width: min(100% - 24px, 1180px);
    }
    .landing-nav {
      margin-top: 12px;
      border-radius: 20px;
    }
    .landing-brand span {
      display: none;
    }
    .landing-actions {
      gap: 6px;
    }
    .hero-copy h1 {
      font-size: 36px;
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
    .preview-panel {
      padding: 18px;
      border-radius: 24px;
    }
    .preview-grid, .trust-grid {
      grid-template-columns: 1fr;
    }
    .section-block, .ai-section {
      padding-top: 64px;
    }
    .ai-card {
      padding: 22px;
    }
    .ai-example {
      width: 100%;
      border-radius: 16px;
    }
    .landing-footer {
      padding-bottom: 32px;
    }
  }
`;
