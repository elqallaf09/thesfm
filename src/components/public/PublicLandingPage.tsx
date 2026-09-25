'use client';

import { useCallback, useMemo, useState, type ElementType, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Calculator,
  CheckCircle2,
  ChevronDown,
  FileText,
  HandCoins,
  LockKeyhole,
  Menu,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import styles from './PublicLandingPage.module.css';
import { LandingWorkspacePreview } from './LandingWorkspacePreview';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { SUPPORT_EMAIL } from '@/lib/constants/contact';
import { convertCurrencyAmount } from '@/lib/currencyConversion';
import { useCurrency } from '@/lib/useCurrency';

type Lang = 'ar' | 'en' | 'fr';
type BillingInterval = 'monthly' | 'yearly';
type PaidPlan = 'premium' | 'company';
type DisplayCurrency = 'USD' | 'KWD' | 'SAR' | 'AED';
type Trio = readonly [string, string, string];

type Copy = {
  navFeatures: string;
  navPricing: string;
  navSecurity: string;
  navFaq: string;
  start: string;
  dashboard: string;
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  heroSecondary: string;
  login: string;
  navigation: string;
  privacy: string;
  terms: string;
  contact: string;
  trustTitle: string;
  trustSubtitle: string;
  trustItems: string[];
  featuresTitle: string;
  featuresSubtitle: string;
  allFeatures: string;
  lessFeatures: string;
  pricingTitle: string;
  pricingSubtitle: string;
  monthly: string;
  yearly: string;
  saveTwoMonths: string;
  free: string;
  pro: string;
  business: string;
  freePrice: string;
  yearlyOnly: string;
  recommended: string;
  freeDesc: string;
  proDesc: string;
  businessDesc: string;
  subscribe: string;
  addCompany: string;
  checkoutLoading: string;
  checkoutError: string;
  currencyLabel: string;
  usdBillingNote: string;
  approximatePrice: string;
  securityKicker: string;
  securityTitle: string;
  securitySubtitle: string;
  securityCards: string[];
  faqTitle: string;
  faqSubtitle: string;
  more: string;
  less: string;
  finalTitle: string;
  finalSubtitle: string;
  footer: string;
};

const COPY: Record<Lang, Copy> = {
  ar: {
    login: 'تسجيل الدخول', navigation: 'القائمة الرئيسية', privacy: 'الخصوصية', terms: 'الشروط', contact: 'تواصل معنا',
    navFeatures: 'المميزات', navPricing: 'الأسعار', navSecurity: 'الأمان', navFaq: 'الأسئلة', start: 'ابدأ الآن', dashboard: 'افتح حسابي',
    heroKicker: 'ذكاء مالي مبني للخليج', heroTitle: 'أموالك وأسواقك وأعمالك. رؤية واحدة.',
    heroSubtitle: 'THE SFM يجمع المال الشخصي، الزكاة، الاستثمار، الأعمال والتقارير في منصة واحدة واضحة، مع واجهة عربية وإنجليزية وفرنسية.', heroSecondary: 'جرّب حاسبة الزكاة',
    trustTitle: 'بياناتك أساس كل قرار', trustSubtitle: 'تابع الصورة المالية بوضوح، مع مصادر البيانات وحالة توفرها وحدود التحليل.', trustItems: ['مصادر وتواريخ تحديث عند توفرها', 'فصل واضح بين الحقيقي والتجريبي', 'واجهة عربية وإنجليزية وفرنسية', 'تحليلات بدون أرقام غير موثقة'],
    featuresTitle: 'مساحة لكل جانب من حياتك المالية', featuresSubtitle: 'من أول ميزانية إلى متابعة الأسواق وإدارة مشروعك، أدواتك مترابطة في حساب واحد.', allFeatures: 'كل المميزات', lessFeatures: 'عرض أقل',
    pricingTitle: 'تسعير بسيط وواضح', pricingSubtitle: 'الأفراد: 5$ شهرياً أو 50$ سنوياً. الشركات: 50$ سنوياً.', monthly: 'شهري', yearly: 'سنوي', saveTwoMonths: 'وفّر شهرين', free: 'مجاني', pro: 'الأفراد', business: 'الشركات', freePrice: 'مجاني', yearlyOnly: 'سنوي فقط', recommended: 'الأكثر مناسبة', freeDesc: 'ابدأ بالأساسيات والحاسبات العامة.', proDesc: 'لإدارة أموالك واستثماراتك وزكاتك وتقاريرك وأدواتك المتقدمة.', businessDesc: 'للشركات والمشاريع التي تريد الظهور وخدمات الأعمال داخل المنصة.', subscribe: 'اشترك الآن', addCompany: 'أضف شركتك', checkoutLoading: 'جارٍ فتح الدفع...', checkoutError: 'تعذر فتح الدفع حالياً. حاول مرة أخرى.', currencyLabel: 'عرض السعر بـ', usdBillingNote: 'التحويل للعملات المحلية تقريبي. يتم الدفع بالدولار الأمريكي.', approximatePrice: 'تقريبي',
    securityKicker: 'الأمان والخصوصية', securityTitle: 'بياناتك خاصة. وصولك تحت سيطرتك.', securitySubtitle: 'تحكّم في جلسات حسابك، وفعّل المصادقة الثنائية لإضافة طبقة حماية عند تسجيل الدخول.', securityCards: ['HTTPS أثناء نقل البيانات', 'جلسات دخول وصلاحيات وصول للحساب', 'دعم المصادقة الثنائية', 'صلاحيات وصول مرتبطة بحسابك'],
    faqTitle: 'أسئلة مهمة قبل التسجيل', faqSubtitle: 'تعرّف على المنصة وطريقة استخدام أدواتها.', more: 'عرض المزيد', less: 'عرض أقل', finalTitle: 'ابدأ بوضوح مالي أفضل اليوم', finalSubtitle: 'جرّب الأدوات العامة أو افتح حسابك وأضف بياناتك الحقيقية.', footer: 'THE SFM — منصة ذكاء مالي واقتصادي للأفراد والأعمال.',
  },
  en: {
    login: 'Log in', navigation: 'Main navigation', privacy: 'Privacy', terms: 'Terms', contact: 'Contact',
    navFeatures: 'Features', navPricing: 'Pricing', navSecurity: 'Security', navFaq: 'FAQ', start: 'Get started', dashboard: 'Open dashboard',
    heroKicker: 'Financial intelligence built for the Gulf', heroTitle: 'Your money. Your markets. One clear picture.', heroSubtitle: 'THE SFM brings personal finance, zakat, investing, business, and reporting into one clear platform with Arabic, English, and French interfaces.', heroSecondary: 'Try the zakat calculator',
    trustTitle: 'Your numbers, not guesses', trustSubtitle: 'Inside your account, analysis is based on your saved data. When data is missing, THE SFM says so instead of inventing values.', trustItems: ['Sources and update dates when available', 'Clear separation of real and demo data', 'Arabic, English, and French interface', 'Analysis without unsupported numbers'],
    featuresTitle: 'One home for your financial life', featuresSubtitle: 'From your first budget to the markets and your next project, connected tools in one account.', allFeatures: 'All features', lessFeatures: 'Show less',
    pricingTitle: 'Simple pricing', pricingSubtitle: 'Individuals: $5/month or $50/year. Companies: $50/year.', monthly: 'Monthly', yearly: 'Yearly', saveTwoMonths: 'Save two months', free: 'Free', pro: 'Individuals', business: 'Companies', freePrice: 'Free', yearlyOnly: 'Yearly only', recommended: 'Recommended', freeDesc: 'Start with essentials and public calculators.', proDesc: 'For personal finance, investments, zakat, reports, and advanced tools.', businessDesc: 'For companies and projects that want a business presence and business services.', subscribe: 'Subscribe', addCompany: 'Add your company', checkoutLoading: 'Opening checkout...', checkoutError: 'Checkout is unavailable right now. Please try again.', currencyLabel: 'Display price in', usdBillingNote: 'Local-currency prices are approximate. Payment is charged in US dollars.', approximatePrice: 'Approx.',
    securityKicker: 'Security & privacy', securityTitle: 'Private by design. Access in your hands.', securitySubtitle: 'Manage your account sessions and enable two-factor authentication for an extra layer of sign-in protection.', securityCards: ['HTTPS for data in transit', 'Authenticated sessions and account access controls', 'Two-factor authentication support', 'Account-level access controls'],
    faqTitle: 'Questions before you join', faqSubtitle: 'Get to know the platform and how its tools work.', more: 'Show more', less: 'Show less', finalTitle: 'Start with a clearer financial picture', finalSubtitle: 'Try a public tool or create your account and add your real data.', footer: 'THE SFM — financial and economic intelligence for individuals and businesses.',
  },
  fr: {
    login: 'Se connecter', navigation: 'Navigation principale', privacy: 'Confidentialité', terms: 'Conditions', contact: 'Contact',
    navFeatures: 'Fonctionnalités', navPricing: 'Prix', navSecurity: 'Sécurité', navFaq: 'FAQ', start: 'Commencer', dashboard: 'Ouvrir le tableau',
    heroKicker: 'Intelligence financière pensée pour le Golfe', heroTitle: 'Vos finances. Vos marchés. Une vision claire.', heroSubtitle: 'THE SFM réunit finances personnelles, zakat, investissement, business et rapports avec des interfaces arabe, anglaise et française.', heroSecondary: 'Essayer la calculatrice de zakat',
    trustTitle: 'Vos chiffres, pas des suppositions', trustSubtitle: 'Dans votre compte, les analyses reposent sur vos données enregistrées. S’il manque des données, THE SFM le signale.', trustItems: ['Sources et dates de mise à jour quand disponibles', 'Séparation claire entre réel et démo', 'Interface arabe, anglaise et française', 'Analyses sans chiffres non étayés'],
    featuresTitle: 'Un espace pour votre vie financière', featuresSubtitle: 'De votre premier budget aux marchés et à vos projets, des outils réunis dans un seul compte.', allFeatures: 'Toutes les fonctions', lessFeatures: 'Afficher moins',
    pricingTitle: 'Tarification simple', pricingSubtitle: 'Particuliers : 5 $/mois ou 50 $/an. Entreprises : 50 $/an.', monthly: 'Mensuel', yearly: 'Annuel', saveTwoMonths: 'Économisez deux mois', free: 'Gratuit', pro: 'Particuliers', business: 'Entreprises', freePrice: 'Gratuit', yearlyOnly: 'Annuel uniquement', recommended: 'Recommandé', freeDesc: 'Commencez avec les fonctions essentielles et les calculateurs publics.', proDesc: 'Pour finances personnelles, investissements, zakat, rapports et outils avancés.', businessDesc: 'Pour les entreprises et projets qui veulent une présence et des services business.', subscribe: 'S’abonner', addCompany: 'Ajouter votre société', checkoutLoading: 'Ouverture du paiement...', checkoutError: 'Le paiement est indisponible pour le moment.', currencyLabel: 'Afficher le prix en', usdBillingNote: 'Les montants en devise locale sont indicatifs. Le paiement est en dollars américains.', approximatePrice: 'Approx.',
    securityKicker: 'Sécurité et confidentialité', securityTitle: 'Vos données privées. Vos accès maîtrisés.', securitySubtitle: 'Gérez vos sessions et activez la double authentification pour mieux protéger votre connexion.', securityCards: ['HTTPS pour les données en transit', 'Sessions authentifiées et contrôles d’accès', 'Prise en charge de la double authentification', 'Accès aux données liés à votre compte'],
    faqTitle: 'Questions avant de commencer', faqSubtitle: 'Découvrez la plateforme et le fonctionnement de ses outils.', more: 'Afficher plus', less: 'Afficher moins', finalTitle: 'Commencez avec une vision financière plus claire', finalSubtitle: 'Essayez un outil public ou créez votre compte et ajoutez vos données réelles.', footer: 'THE SFM — intelligence financière et économique pour particuliers et entreprises.',
  },
};

const FEATURES: readonly [ElementType, Trio, Trio][] = [
  [Wallet, ['إدارة المال الشخصي', 'Personal finance', 'Finances personnelles'], ['الدخل والمصروفات والديون والمدخرات والأهداف.', 'Income, expenses, debt, savings, and goals.', 'Revenus, dépenses, dettes, épargne et objectifs.']],
  [TrendingUp, ['الاستثمارات والأسواق', 'Investments & markets', 'Investissements et marchés'], ['تابع أصولك وتحليلاتك وقوائم المتابعة.', 'Track assets, analysis, and watchlists.', 'Suivez actifs, analyses et listes de suivi.']],
  [Calculator, ['الزكاة والحاسبات', 'Zakat & calculators', 'Zakat et calculateurs'], ['حاسبات عملية مع قسم زكاة مخصص داخل الحساب.', 'Public calculators plus a dedicated zakat workspace.', 'Calculateurs publics et espace zakat dédié.']],
  [BriefcaseBusiness, ['المشاريع والأعمال', 'Projects & business', 'Projets et business'], ['من دراسة الجدوى إلى التقارير والعروض الاستثمارية.', 'From feasibility studies to reports and pitch decks.', 'Des études de faisabilité aux rapports et pitch decks.']],
  [Bot, ['المساعد الذكي', 'AI assistant', 'Assistant IA'], ['تحليل واقتراحات مرتبطة ببياناتك الفعلية.', 'Analysis and suggestions tied to your real data.', 'Analyses et suggestions liées à vos données réelles.']],
  [FileText, ['التقارير والمستندات', 'Reports & documents', 'Rapports et documents'], ['مركز موحد للتقارير والمستندات المالية.', 'A unified center for financial reports and documents.', 'Un centre unifié pour rapports et documents financiers.']],
  [HandCoins, ['الأعمال الخيرية', 'Charity', 'Charité'], ['نظم التبرعات والمستفيدين والمشاريع الخيرية.', 'Organize donations, beneficiaries, and charity projects.', 'Organisez dons, bénéficiaires et projets caritatifs.']],
  [BookOpen, ['التعليم المالي', 'Financial education', 'Éducation financière'], ['مكتبة نظريات وكتب وأدوات عملية.', 'Theories, books, and practical learning tools.', 'Théories, livres et outils pratiques.']],
  [BarChart3, ['مركز القرارات', 'Decision center', 'Centre de décision'], ['حوّل البيانات إلى قرارات وخطوات قابلة للتنفيذ.', 'Turn data into decisions and actionable steps.', 'Transformez les données en décisions et actions.']],
  [PiggyBank, ['الأهداف والمدخرات', 'Goals & savings', 'Objectifs et épargne'], ['تابع أهدافك وتقدمك المالي بوضوح.', 'Track goals and financial progress clearly.', 'Suivez clairement vos objectifs et progrès.']],
];

const PLAN_FEATURES = {
  free: [['إدارة الدخل والمصروفات', 'Income and expense basics', 'Gestion de base des revenus et dépenses'], ['الأهداف والمدخرات', 'Goals and savings', 'Objectifs et épargne'], ['الحاسبات العامة', 'Public calculators', 'Calculateurs publics']],
  premium: [['المال الشخصي', 'Personal finance', 'Finances personnelles'], ['الاستثمارات والأسواق', 'Investments and markets', 'Investissements et marchés'], ['مساحة الزكاة', 'Zakat workspace', 'Espace zakat'], ['الذكاء والتقارير', 'AI tools and reports', 'IA et rapports']],
  company: [['ظهور الشركة', 'Company presence', 'Présence de l’entreprise'], ['خدمات الأعمال', 'Business services', 'Services business'], ['مراجعة قبل النشر', 'Review before publishing', 'Révision avant publication']],
} satisfies Record<string, Trio[]>;

const FAQ = {
  ar: [['ما هي THE SFM؟', 'منصة تجمع إدارة المال، الاستثمار، الزكاة، المشاريع، التقارير والذكاء المالي في مكان واحد.'], ['هل يستخدم أرقام وهمية؟', 'داخل الحساب نعتمد على بيانات المستخدم الفعلية. البيانات التجريبية تظهر فقط عندما تكون معلّمة بوضوح كمثال.'], ['هل حاسبة الزكاة تحتاج تسجيل؟', 'لا. حاسبة الزكاة العامة متاحة بدون تسجيل دخول، أما حفظ الحسابات وتتبعها فيكون داخل الحساب.'], ['هل يدعم العربية؟', 'نعم، ويدعم كذلك الإنجليزية والفرنسية.'], ['هل THE SFM يقدم استشارة مالية أو شرعية؟', 'لا. المنصة أداة تنظيم وتحليل وليست بديلاً عن مستشار مالي أو قانوني أو شرعي مختص.'], ['كيف تُحمى بياناتي؟', 'التطبيق يعتمد على بنية مرتبطة بـ Supabase مع جلسات دخول وصلاحيات وصول، ويستخدم HTTPS أثناء النقل.'], ['هل مناسب للشركات؟', 'نعم، توجد خدمات ومزايا مخصصة للشركات والمشاريع إلى جانب حسابات الأفراد.'], ['هل يمكنني البدء ببيانات قليلة؟', 'نعم. تبدأ تدريجياً، وتظهر حالات واضحة عندما تكون البيانات غير كافية.'], ['هل فيه تقارير؟', 'نعم، توجد تقارير مرتبطة بالدخل والمصروفات والاستثمارات والمشاريع والزكاة حسب البيانات المتوفرة.'], ['كيف أتواصل مع الدعم؟', `عبر البريد ${SUPPORT_EMAIL}.`]],
  en: [['What is THE SFM?', 'A platform that combines money management, investing, zakat, projects, reporting, and financial intelligence in one place.'], ['Does it use fake numbers?', 'Inside accounts, analysis relies on real user data. Demo data appears only when clearly labeled as an example.'], ['Does the zakat calculator require an account?', 'No. The public zakat calculator works without sign-in; saving and tracking calculations happens inside an account.'], ['Does it support Arabic?', 'Yes. Arabic, English, and French are supported.'], ['Is THE SFM financial or religious advice?', 'No. It is an organization and analysis tool, not a replacement for a qualified financial, legal, tax, or religious adviser.'], ['How is my data handled?', 'The app uses Supabase-backed infrastructure, authenticated sessions and access controls, with HTTPS in transit.'], ['Is it suitable for companies?', 'Yes. Business and project services sit alongside individual accounts.'], ['Can I start with little data?', 'Yes. You can build your account gradually and the product shows clear insufficient-data states.'], ['Are reports included?', 'Yes, reports can cover income, expenses, investments, projects, and zakat based on available data.'], ['How do I contact support?', `Email ${SUPPORT_EMAIL}.`]],
  fr: [['Qu’est-ce que THE SFM ?', 'Une plateforme qui réunit gestion financière, investissement, zakat, projets, rapports et intelligence financière.'], ['Utilise-t-elle de faux chiffres ?', 'Dans les comptes, les analyses reposent sur les données réelles. Les données démo sont toujours signalées comme exemple.'], ['La calculatrice de zakat nécessite-t-elle un compte ?', 'Non. La calculatrice publique fonctionne sans connexion ; l’enregistrement et le suivi se font dans le compte.'], ['La plateforme prend-elle en charge l’arabe ?', 'Oui, ainsi que l’anglais et le français.'], ['THE SFM fournit-il des conseils financiers ou religieux ?', 'Non. C’est un outil d’organisation et d’analyse, pas un substitut à un conseiller qualifié.'], ['Comment mes données sont-elles gérées ?', 'L’application utilise une infrastructure liée à Supabase, des sessions authentifiées, des contrôles d’accès et HTTPS en transit.'], ['Est-ce adapté aux entreprises ?', 'Oui. Des services business et projets existent en plus des comptes particuliers.'], ['Puis-je commencer avec peu de données ?', 'Oui. Vous pouvez progresser étape par étape et les données insuffisantes sont clairement signalées.'], ['Y a-t-il des rapports ?', 'Oui, selon les données disponibles : revenus, dépenses, investissements, projets et zakat.'], ['Comment contacter le support ?', `Par e-mail : ${SUPPORT_EMAIL}.`]],
} satisfies Record<Lang, [string, string][]>;

const DISPLAY_CURRENCIES: readonly DisplayCurrency[] = ['USD', 'KWD', 'SAR', 'AED'];

function pick(tuple: Trio, lang: Lang) {
  return tuple[lang === 'ar' ? 0 : lang === 'fr' ? 2 : 1];
}

function asDisplayCurrency(value: string): DisplayCurrency {
  return DISPLAY_CURRENCIES.includes(value as DisplayCurrency) ? value as DisplayCurrency : 'USD';
}

function localizedPrice(usdAmount: number, currency: DisplayCurrency) {
  if (currency === 'USD') return `$${usdAmount}`;
  const converted = convertCurrencyAmount(usdAmount, 'USD', currency);
  if (converted === null) return `$${usdAmount}`;
  return `≈ ${converted.toLocaleString('en-US', { maximumFractionDigits: currency === 'KWD' ? 3 : 2 })} ${currency}`;
}

export default function PublicLandingPage({ languageControl }: { languageControl: ReactNode }) {
  const { lang, dir } = useLanguage();
  const currentLang = (lang as Lang) || 'ar';
  const text = COPY[currentLang];
  const { session, loading } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [showAllFaq, setShowAllFaq] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [billing, setBilling] = useState<BillingInterval>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<PaidPlan | null>(null);
  const [message, setMessage] = useState('');
  const displayCurrency = asDisplayCurrency(currency);
  const appHref = session ? '/dashboard' : '/login?mode=register&next=%2Fdashboard';
  const ctaLabel = session ? text.dashboard : text.start;
  const featureItems = useMemo(() => showAllFeatures ? FEATURES : FEATURES.slice(0, 6), [showAllFeatures]);
  const faqItems = showAllFaq ? FAQ[currentLang] : FAQ[currentLang].slice(0, 6);

  const startCheckout = useCallback(async (plan: PaidPlan) => {
    const interval = plan === 'company' ? 'yearly' : billing;
    setMessage('');
    if (!session) {
      if (typeof window !== 'undefined') window.sessionStorage.setItem('sfm_pending_checkout', JSON.stringify({ plan, billingInterval: interval }));
      router.push('/login?next=%2F%23pricing');
      return;
    }
    setCheckoutLoading(plan);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan, billingInterval: interval }),
      });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; url?: string };
      if (!response.ok || !payload.ok || !payload.url) throw new Error('checkout');
      window.location.assign(payload.url);
    } catch {
      setMessage(text.checkoutError);
    } finally {
      setCheckoutLoading(null);
    }
  }, [billing, router, session, text.checkoutError]);

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': 'https://www.the-sfm.com/#organization', name: 'THE SFM', url: 'https://www.the-sfm.com' },
      {
        '@type': 'SoftwareApplication',
        name: 'THE SFM',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        url: 'https://www.the-sfm.com',
        offers: [
          { '@type': 'Offer', name: 'Individuals monthly', price: '5', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'Individuals annual', price: '50', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'Companies annual', price: '50', priceCurrency: 'USD' },
        ],
      },
    ],
  };

  const navItems = [['#features', text.navFeatures], ['#pricing', text.navPricing], ['#security', text.navSecurity], ['#faq', text.navFaq]];

  return (
    <main dir={dir} className={`landing-page ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <Link href="/" className={styles.brand} aria-label="THE SFM">
            <Image src="/sfm-logo.png" alt="" width={38} height={38} priority />
            <span dir="ltr">THE SFM</span>
          </Link>
          <nav className={`landing-links ${styles.desktopNav}`} aria-label={text.navigation}>
            {navItems.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
          </nav>
          <div className={styles.headerActions}>
            {languageControl}<ThemeToggle />
            {!session && <Link href="/login" prefetch={false} className={styles.login}>{text.login}</Link>}
            <Link href={appHref} prefetch={false} className={`${styles.primaryButton} ${styles.headerCta}`}>{ctaLabel}</Link>
            <button type="button" className={styles.menuButton} onClick={() => setMenuOpen(value => !value)} aria-label={text.navigation} aria-expanded={menuOpen} aria-controls="landing-mobile-menu">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && <nav id="landing-mobile-menu" className={`landing-links ${styles.mobileNav}`} aria-label={text.navigation}>
          {navItems.map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
          <Link href={appHref}>{ctaLabel}</Link>
          {!session && <Link href="/login">{text.login}</Link>}
        </nav>}
      </header>

      <section className={styles.hero}>
        <div className={`${styles.container} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}><Sparkles size={16} />{text.heroKicker}</span>
            <h1>{text.heroTitle}</h1>
            <p>{text.heroSubtitle}</p>
            <div className={styles.actions}>
              <Link href={appHref} prefetch={false} className={styles.primaryButton}>{ctaLabel}<ArrowLeft size={18} className={styles.directionArrow} /></Link>
              <Link href="/zakat-calculator" className={styles.secondaryButton}><Calculator size={18} />{text.heroSecondary}</Link>
            </div>
            <div className={styles.heroNote}><CheckCircle2 size={17} />{text.trustItems[2]}</div>
          </div>
          <LandingWorkspacePreview lang={currentLang} />
        </div>
      </section>

      <section className={`${styles.container} ${styles.trust}`}>
        <div><h2>{text.trustTitle}</h2><p>{text.trustSubtitle}</p></div>
        <ul>{text.trustItems.map(item => <li key={item}><CheckCircle2 size={19} /><span>{item}</span></li>)}</ul>
      </section>

      <section id="features" className={styles.sectionTint}>
        <div className={`${styles.container} ${styles.section}`}>
          <div className={styles.sectionHeading}><span className={styles.eyebrow}>{text.navFeatures}</span><h2>{text.featuresTitle}</h2><p>{text.featuresSubtitle}</p></div>
          <div className={styles.featureGrid} id="landing-features">
            {featureItems.map(([Icon, title, description], index) => <article key={pick(title, currentLang)} className={styles.featureCard}>
              <div className={styles.featureTop}><span className={styles.iconTile}><Icon size={24} /></span><span className={styles.featureIndex} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span></div>
              <h3>{pick(title, currentLang)}</h3><p>{pick(description, currentLang)}</p>
            </article>)}
          </div>
          <div className={styles.centerAction}><button type="button" onClick={() => setShowAllFeatures(value => !value)} className={styles.secondaryButton} aria-expanded={showAllFeatures} aria-controls="landing-features">{showAllFeatures ? text.lessFeatures : text.allFeatures}<ChevronDown size={17} /></button></div>
        </div>
      </section>

      <section id="pricing" className={`${styles.container} ${styles.section}`}>
        <div className={styles.sectionHeading}><h2>{text.pricingTitle}</h2><p>{text.pricingSubtitle}</p></div>
        <div className={styles.pricingControls}>
          <div className={styles.segments}>
            {(['monthly', 'yearly'] as const).map(interval => <button type="button" key={interval} aria-pressed={billing === interval} onClick={() => setBilling(interval)}>{interval === 'monthly' ? text.monthly : text.yearly}</button>)}
          </div>
          {billing === 'yearly' && <span className={styles.badge}>{text.saveTwoMonths}</span>}
          <div className={styles.currency}><span>{text.currencyLabel}</span><div className={styles.segments} aria-label={text.currencyLabel}>
            {DISPLAY_CURRENCIES.map(code => <button type="button" key={code} aria-pressed={displayCurrency === code} onClick={() => setCurrency(code)}>{code}</button>)}
          </div></div>
        </div>
        <p className={styles.billingNote}>{text.usdBillingNote}</p>
        {message && <p role="alert" className={styles.error}>{message}</p>}
        <div className={styles.pricingGrid}>
          <PricingCard title={text.free} price={text.freePrice} description={text.freeDesc} features={PLAN_FEATURES.free.map(item => pick(item, currentLang))} action={<Link href={appHref} className={styles.secondaryButton}>{ctaLabel}</Link>} />
          <PricingCard featured badge={text.recommended} title={text.pro} price={localizedPrice(billing === 'yearly' ? 50 : 5, displayCurrency)} priceMeta={`${billing === 'yearly' ? text.yearly : text.monthly}${displayCurrency === 'USD' ? '' : ` · ${text.approximatePrice}`}`} description={text.proDesc} features={PLAN_FEATURES.premium.map(item => pick(item, currentLang))} action={<button type="button" disabled={loading || checkoutLoading !== null} onClick={() => void startCheckout('premium')} className={styles.primaryButton}>{checkoutLoading === 'premium' ? text.checkoutLoading : text.subscribe}</button>} />
          <PricingCard title={text.business} price={localizedPrice(50, displayCurrency)} priceMeta={displayCurrency === 'USD' ? text.yearlyOnly : `${text.approximatePrice} · ${text.yearlyOnly}`} description={text.businessDesc} features={PLAN_FEATURES.company.map(item => pick(item, currentLang))} action={<button type="button" disabled={loading || checkoutLoading !== null} onClick={() => void startCheckout('company')} className={styles.secondaryButton}>{checkoutLoading === 'company' ? text.checkoutLoading : text.addCompany}</button>} />
        </div>
      </section>

      <section id="security" className={`${styles.container} ${styles.section}`}>
        <div className={styles.securityPanel}>
          <div className={styles.securityCopy}><span className={styles.eyebrow}><LockKeyhole size={17} />{text.securityKicker}</span><h2>{text.securityTitle}</h2><p>{text.securitySubtitle}</p></div>
          <ul className={styles.securityList}>{text.securityCards.map(item => <li key={item}><ShieldCheck size={21} /><span>{item}</span></li>)}</ul>
        </div>
      </section>

      <section id="faq" className={`${styles.container} ${styles.faqSection}`}>
        <div className={styles.sectionHeading}><h2>{text.faqTitle}</h2><p>{text.faqSubtitle}</p></div>
        <div className={styles.faqList} id="landing-faq-list">{faqItems.map(([question, answer], index) => {
          const open = openFaq === index;
          return <article key={question} className={styles.faqItem}>
            <button type="button" id={`landing-question-${index}`} onClick={() => setOpenFaq(open ? -1 : index)} aria-expanded={open} aria-controls={`landing-answer-${index}`}><span>{question}</span><ChevronDown size={20} /></button>
            <div id={`landing-answer-${index}`} role="region" aria-labelledby={`landing-question-${index}`} hidden={!open}><p>{answer}</p></div>
          </article>;
        })}</div>
        <div className={styles.centerAction}><button type="button" onClick={() => setShowAllFaq(value => !value)} className={styles.secondaryButton} aria-expanded={showAllFaq} aria-controls="landing-faq-list">{showAllFaq ? text.less : text.more}</button></div>
      </section>

      <section className={`${styles.container} ${styles.finalSection}`}>
        <div className={styles.finalPanel}><Sparkles size={28} /><h2>{text.finalTitle}</h2><p>{text.finalSubtitle}</p><div className={styles.actions}><Link href={appHref} className={styles.primaryButton}>{ctaLabel}<ArrowLeft size={18} className={styles.directionArrow} /></Link><Link href="/zakat-calculator" className={styles.secondaryButton}>{text.heroSecondary}</Link></div></div>
      </section>
      <footer className={styles.footer}><div className={`${styles.container} ${styles.footerInner}`}><div><span className={styles.brand} dir="ltr">THE SFM</span><p>{text.footer}</p></div><nav aria-label={text.contact}><Link href="/privacy">{text.privacy}</Link><Link href="/terms">{text.terms}</Link><Link href="/contact">{text.contact}</Link></nav></div></footer>
    </main>
  );
}

function PricingCard({ title, price, description, features, action, featured, badge, priceMeta }: { title: string; price: string; description: string; features: string[]; action: ReactNode; featured?: boolean; badge?: string; priceMeta?: string }) {
  return <article className={`${styles.pricingCard} ${featured ? styles.featuredPlan : ''}`}>
    <div className={styles.planTitle}><h3>{title}</h3>{badge && <span className={styles.badge}>{badge}</span>}</div>
    <strong data-financial-value="true" dir="ltr" className={styles.price}>{price}</strong>
    {priceMeta && <span className={styles.priceMeta}>{priceMeta}</span>}
    <p>{description}</p><ul>{features.map(item => <li key={item}><CheckCircle2 size={17} />{item}</li>)}</ul>
    {action}
  </article>;
}
