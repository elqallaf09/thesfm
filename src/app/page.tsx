'use client';

import { useCallback, useMemo, useState } from 'react';
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
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { SUPPORT_EMAIL } from '@/lib/constants/contact';

type Lang = 'ar' | 'en' | 'fr';
type BillingInterval = 'monthly' | 'yearly';
type PaidPlan = 'premium' | 'company';

type Copy = {
  navFeatures: string; navPricing: string; navSecurity: string; navFaq: string; signIn: string; start: string; dashboard: string;
  heroKicker: string; heroTitle: string; heroSubtitle: string; heroPrimary: string; heroSecondary: string;
  demoBadge: string; demoTitle: string; demoSubtitle: string; demoIncome: string; demoExpenses: string; demoProjects: string; demoZakat: string; demoExample: string;
  trustTitle: string; trustSubtitle: string; trustItems: string[];
  featuresTitle: string; featuresSubtitle: string; allFeatures: string; lessFeatures: string;
  pricingTitle: string; pricingSubtitle: string; monthly: string; yearly: string; saveTwoMonths: string; free: string; pro: string; business: string;
  freePrice: string; proMonthly: string; proYearly: string; businessYearly: string; yearlyOnly: string; recommended: string;
  freeDesc: string; proDesc: string; businessDesc: string; subscribe: string; addCompany: string; checkoutLoading: string; checkoutError: string;
  securityTitle: string; securitySubtitle: string; securityCards: string[];
  faqTitle: string; faqSubtitle: string; more: string; less: string;
  finalTitle: string; finalSubtitle: string; footer: string;
};

const COPY: Record<Lang, Copy> = {
  ar: {
    navFeatures: 'المميزات', navPricing: 'الأسعار', navSecurity: 'الأمان', navFaq: 'الأسئلة', signIn: 'تسجيل الدخول', start: 'ابدأ الآن', dashboard: 'افتح حسابي',
    heroKicker: 'ذكاء مالي مبني للخليج', heroTitle: 'أدِر أموالك وزكاتك واستثماراتك ومشاريعك من مكان واحد — بالعربي.',
    heroSubtitle: 'THE SFM يجمع المال الشخصي، الزكاة، الاستثمار، الأعمال والتقارير في منصة واحدة واضحة، مع واجهة عربية وإنجليزية وفرنسية.',
    heroPrimary: 'ابدأ الآن', heroSecondary: 'جرّب حاسبة الزكاة',
    demoBadge: 'مثال', demoTitle: 'لوحة مالية حقيقية الشكل', demoSubtitle: 'أرقام تجريبية واضحة حتى تعرف كيف تبدو المنصة قبل إضافة بياناتك.',
    demoIncome: 'الدخل الشهري', demoExpenses: 'المصروفات', demoProjects: 'المشاريع', demoZakat: 'الزكاة التقديرية', demoExample: 'بيانات تجريبية',
    trustTitle: 'أرقامك أنت، مو تقديرات', trustSubtitle: 'داخل حسابك، التحليلات تعتمد على بياناتك الفعلية. وإذا كانت البيانات ناقصة، نوضح ذلك بدل اختراع أرقام.',
    trustItems: ['مصادر وتواريخ تحديث عند توفرها', 'فصل واضح بين الحقيقي والتجريبي', 'واجهة عربية وإنجليزية وفرنسية', 'تحليلات بدون أرقام غير موثقة'],
    featuresTitle: 'أهم ما تحتاجه فعلاً', featuresSubtitle: 'بدل عشرات البطاقات في وجهك، هذه أهم محاور THE SFM. تقدر تعرض الباقي متى ما احتجته.', allFeatures: 'كل المميزات', lessFeatures: 'عرض أقل',
    pricingTitle: 'تسعير بسيط وواضح', pricingSubtitle: 'للأفراد: 5$ شهرياً أو 50$ سنوياً. للشركات: 50$ سنوياً.', monthly: 'شهري', yearly: 'سنوي', saveTwoMonths: 'وفّر شهرين', free: 'مجاني', pro: 'الأفراد', business: 'الشركات',
    freePrice: 'مجاني', proMonthly: '5$ / شهر', proYearly: '50$ / سنة', businessYearly: '50$ / سنة', yearlyOnly: 'سنوي فقط', recommended: 'الأكثر مناسبة',
    freeDesc: 'ابدأ بالأساسيات والحاسبات العامة.', proDesc: 'لإدارة أموالك واستثماراتك وزكاتك وأدواتك المتقدمة.', businessDesc: 'للشركات والمشاريع التي تريد الظهور وخدمات الأعمال داخل المنصة.', subscribe: 'اشترك الآن', addCompany: 'أضف شركتك', checkoutLoading: 'جارٍ فتح الدفع...', checkoutError: 'تعذر فتح الدفع حالياً. حاول مرة أخرى.',
    securityTitle: 'أمان واضح بدون كلام تسويقي مبهم', securitySubtitle: 'نوضح طبقات الحماية التي يعتمد عليها المنتج بدون ادعاءات غير قابلة للتحقق.',
    securityCards: ['تشفير HTTPS أثناء نقل البيانات', 'تسجيل دخول وصلاحيات وصول للحساب', 'دعم المصادقة الثنائية للحسابات', 'بيانات التطبيق مخزنة عبر البنية المرتبطة بـ Supabase'],
    faqTitle: 'أسئلة مهمة قبل التسجيل', faqSubtitle: 'أهم 6 أسئلة أولاً، والباقي عند الطلب.', more: 'عرض المزيد', less: 'عرض أقل',
    finalTitle: 'ابدأ بوضوح مالي أفضل اليوم', finalSubtitle: 'جرّب الأدوات العامة أو افتح حسابك وأضف بياناتك الحقيقية.', footer: 'THE SFM — منصة ذكاء مالي واقتصادي للأفراد والأعمال.',
  },
  en: {
    navFeatures: 'Features', navPricing: 'Pricing', navSecurity: 'Security', navFaq: 'FAQ', signIn: 'Sign in', start: 'Get started', dashboard: 'Open dashboard',
    heroKicker: 'Financial intelligence built for the Gulf', heroTitle: 'Manage your money, zakat, investments, and projects in one place — in Arabic.',
    heroSubtitle: 'THE SFM brings personal finance, zakat, investing, business, and reporting into one clear platform with Arabic, English, and French interfaces.',
    heroPrimary: 'Get started', heroSecondary: 'Try the zakat calculator',
    demoBadge: 'Example', demoTitle: 'A dashboard that feels complete', demoSubtitle: 'Clearly marked demo values show how the platform looks before you add your own data.',
    demoIncome: 'Monthly income', demoExpenses: 'Expenses', demoProjects: 'Projects', demoZakat: 'Estimated zakat', demoExample: 'Demo data',
    trustTitle: 'Your numbers, not guesses', trustSubtitle: 'Inside your account, analysis is based on your saved data. When data is missing, THE SFM says so instead of inventing values.',
    trustItems: ['Sources and update dates when available', 'Clear separation of real and demo data', 'Arabic, English, and French interface', 'Analysis without unsupported numbers'],
    featuresTitle: 'The six things that matter first', featuresSubtitle: 'Start with the core value, then explore the full product when you need it.', allFeatures: 'All features', lessFeatures: 'Show less',
    pricingTitle: 'Simple pricing', pricingSubtitle: 'Individuals: $5/month or $50/year. Companies: $50/year.', monthly: 'Monthly', yearly: 'Yearly', saveTwoMonths: 'Save two months', free: 'Free', pro: 'Individuals', business: 'Companies',
    freePrice: 'Free', proMonthly: '$5 / month', proYearly: '$50 / year', businessYearly: '$50 / year', yearlyOnly: 'Yearly only', recommended: 'Recommended',
    freeDesc: 'Start with essentials and public calculators.', proDesc: 'For personal finance, investments, zakat, reports, and advanced tools.', businessDesc: 'For companies and projects that want a business presence and business services.', subscribe: 'Subscribe', addCompany: 'Add your company', checkoutLoading: 'Opening checkout...', checkoutError: 'Checkout is unavailable right now. Please try again.',
    securityTitle: 'Security explained clearly', securitySubtitle: 'We describe the product protections without vague or unverifiable claims.',
    securityCards: ['HTTPS encryption in transit', 'Account authentication and access controls', 'Two-factor authentication support', 'Application data stored through the Supabase-backed infrastructure'],
    faqTitle: 'Questions before you join', faqSubtitle: 'The six most useful answers first, with more available on demand.', more: 'Show more', less: 'Show less',
    finalTitle: 'Start with a clearer financial picture', finalSubtitle: 'Try a public tool or create your account and add your real data.', footer: 'THE SFM — financial and economic intelligence for individuals and businesses.',
  },
  fr: {
    navFeatures: 'Fonctionnalités', navPricing: 'Prix', navSecurity: 'Sécurité', navFaq: 'FAQ', signIn: 'Connexion', start: 'Commencer', dashboard: 'Ouvrir le tableau',
    heroKicker: 'Intelligence financière pensée pour le Golfe', heroTitle: 'Gérez argent, zakat, investissements et projets depuis un seul endroit — en arabe.',
    heroSubtitle: 'THE SFM réunit finances personnelles, zakat, investissement, business et rapports avec des interfaces arabe, anglaise et française.',
    heroPrimary: 'Commencer', heroSecondary: 'Essayer la calculatrice de zakat',
    demoBadge: 'Exemple', demoTitle: 'Un tableau de bord complet', demoSubtitle: 'Des valeurs de démonstration clairement marquées montrent le produit avant vos propres données.',
    demoIncome: 'Revenu mensuel', demoExpenses: 'Dépenses', demoProjects: 'Projets', demoZakat: 'Zakat estimée', demoExample: 'Données démo',
    trustTitle: 'Vos chiffres, pas des suppositions', trustSubtitle: 'Dans votre compte, les analyses reposent sur vos données enregistrées. S’il manque des données, THE SFM le signale.',
    trustItems: ['Sources et dates de mise à jour quand disponibles', 'Séparation claire entre réel et démo', 'Interface arabe, anglaise et française', 'Analyses sans chiffres non étayés'],
    featuresTitle: 'Les six fonctions essentielles', featuresSubtitle: 'Commencez par la valeur principale puis explorez le reste selon vos besoins.', allFeatures: 'Toutes les fonctions', lessFeatures: 'Afficher moins',
    pricingTitle: 'Tarification simple', pricingSubtitle: 'Particuliers : 5 $/mois ou 50 $/an. Entreprises : 50 $/an.', monthly: 'Mensuel', yearly: 'Annuel', saveTwoMonths: 'Économisez deux mois', free: 'Gratuit', pro: 'Particuliers', business: 'Entreprises',
    freePrice: 'Gratuit', proMonthly: '5 $ / mois', proYearly: '50 $ / an', businessYearly: '50 $ / an', yearlyOnly: 'Annuel uniquement', recommended: 'Recommandé',
    freeDesc: 'Commencez avec les fonctions essentielles et les calculateurs publics.', proDesc: 'Pour finances personnelles, investissements, zakat, rapports et outils avancés.', businessDesc: 'Pour les entreprises et projets qui veulent une présence et des services business.', subscribe: 'S’abonner', addCompany: 'Ajouter votre société', checkoutLoading: 'Ouverture du paiement...', checkoutError: 'Le paiement est indisponible pour le moment.',
    securityTitle: 'Une sécurité expliquée clairement', securitySubtitle: 'Nous décrivons les protections du produit sans promesses vagues ou invérifiables.',
    securityCards: ['Chiffrement HTTPS en transit', 'Authentification et contrôle d’accès', 'Prise en charge de la double authentification', 'Données applicatives stockées via l’infrastructure liée à Supabase'],
    faqTitle: 'Questions avant de commencer', faqSubtitle: 'Les six réponses les plus utiles d’abord, puis le reste à la demande.', more: 'Afficher plus', less: 'Afficher moins',
    finalTitle: 'Commencez avec une vision financière plus claire', finalSubtitle: 'Essayez un outil public ou créez votre compte et ajoutez vos données réelles.', footer: 'THE SFM — intelligence financière et économique pour particuliers et entreprises.',
  },
};

const FEATURES = [
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
] as const;

const FAQ = {
  ar: [
    ['شنو THE SFM؟', 'منصة تجمع إدارة المال، الاستثمار، الزكاة، المشاريع، التقارير والذكاء المالي في مكان واحد.'],
    ['هل يستخدم أرقام وهمية؟', 'داخل الحساب نعتمد على بيانات المستخدم الفعلية. البيانات التجريبية تظهر فقط عندما تكون معلّمة بوضوح كمثال.'],
    ['هل حاسبة الزكاة تحتاج تسجيل؟', 'لا. حاسبة الزكاة العامة متاحة بدون تسجيل دخول، أما حفظ الحسابات وتتبعها فيكون داخل الحساب.'],
    ['هل يدعم العربية؟', 'نعم، ويدعم كذلك الإنجليزية والفرنسية.'],
    ['هل THE SFM يقدم استشارة مالية أو شرعية؟', 'لا. المنصة أداة تنظيم وتحليل وليست بديلاً عن مستشار مالي أو قانوني أو شرعي مختص.'],
    ['شلون تنحفظ بياناتي؟', 'التطبيق يعتمد على بنية مرتبطة بـ Supabase مع جلسات دخول وصلاحيات وصول، ويستخدم HTTPS أثناء النقل.'],
    ['هل مناسب للشركات؟', 'نعم، توجد خدمات ومزايا مخصصة للشركات والمشاريع إلى جانب حسابات الأفراد.'],
    ['هل أقدر أستخدمه بدون بيانات كثيرة؟', 'نعم. تبدأ تدريجياً، وتظهر حالات واضحة عندما تكون البيانات غير كافية.'],
    ['هل فيه تقارير؟', 'نعم، توجد تقارير مرتبطة بالدخل والمصروفات والاستثمارات والمشاريع والزكاة حسب البيانات المتوفرة.'],
    ['شلون أتواصل مع الدعم؟', `عبر البريد ${SUPPORT_EMAIL}.`],
  ],
  en: [
    ['What is THE SFM?', 'A platform that combines money management, investing, zakat, projects, reporting, and financial intelligence in one place.'],
    ['Does it use fake numbers?', 'Inside accounts, analysis relies on real user data. Demo data appears only when clearly labeled as an example.'],
    ['Does the zakat calculator require an account?', 'No. The public zakat calculator works without sign-in; saving and tracking calculations happens inside an account.'],
    ['Does it support Arabic?', 'Yes. Arabic, English, and French are supported.'],
    ['Is THE SFM financial or religious advice?', 'No. It is an organization and analysis tool, not a replacement for a qualified financial, legal, tax, or religious adviser.'],
    ['How is my data handled?', 'The app uses Supabase-backed infrastructure, authenticated sessions and access controls, with HTTPS in transit.'],
    ['Is it suitable for companies?', 'Yes. Business and project services sit alongside individual accounts.'],
    ['Can I start with little data?', 'Yes. You can build your account gradually and the product shows clear insufficient-data states.'],
    ['Are reports included?', 'Yes, reports can cover income, expenses, investments, projects, and zakat based on available data.'],
    ['How do I contact support?', `Email ${SUPPORT_EMAIL}.`],
  ],
  fr: [
    ['Qu’est-ce que THE SFM ?', 'Une plateforme qui réunit gestion financière, investissement, zakat, projets, rapports et intelligence financière.'],
    ['Utilise-t-elle de faux chiffres ?', 'Dans les comptes, les analyses reposent sur les données réelles. Les données démo sont toujours signalées comme exemple.'],
    ['La calculatrice de zakat nécessite-t-elle un compte ?', 'Non. La calculatrice publique fonctionne sans connexion ; l’enregistrement et le suivi se font dans le compte.'],
    ['La plateforme prend-elle en charge l’arabe ?', 'Oui, ainsi que l’anglais et le français.'],
    ['THE SFM fournit-il des conseils financiers ou religieux ?', 'Non. C’est un outil d’organisation et d’analyse, pas un substitut à un conseiller qualifié.'],
    ['Comment mes données sont-elles gérées ?', 'L’application utilise une infrastructure liée à Supabase, des sessions authentifiées, des contrôles d’accès et HTTPS en transit.'],
    ['Est-ce adapté aux entreprises ?', 'Oui. Des services business et projets existent en plus des comptes particuliers.'],
    ['Puis-je commencer avec peu de données ?', 'Oui. Vous pouvez progresser étape par étape et les données insuffisantes sont clairement signalées.'],
    ['Y a-t-il des rapports ?', 'Oui, selon les données disponibles : revenus, dépenses, investissements, projets et zakat.'],
    ['Comment contacter le support ?', `Par e-mail : ${SUPPORT_EMAIL}.`],
  ],
} satisfies Record<Lang, [string, string][]>;

function pick(tuple: readonly [string, string, string], lang: Lang) {
  return tuple[lang === 'ar' ? 0 : lang === 'fr' ? 2 : 1];
}

export default function PublicLandingPage() {
  const { lang, dir } = useLanguage();
  const currentLang = (lang as Lang) || 'ar';
  const text = COPY[currentLang];
  const { session, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [showAllFaq, setShowAllFaq] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [billing, setBilling] = useState<BillingInterval>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<PaidPlan | null>(null);
  const [message, setMessage] = useState('');
  const appHref = session ? '/dashboard' : '/login?mode=register&next=%2Fdashboard';
  const ctaLabel = session ? text.dashboard : text.start;

  const featureItems = useMemo(() => (showAllFeatures ? FEATURES : FEATURES.slice(0, 6)), [showAllFeatures]);
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
      { '@type': 'SoftwareApplication', name: 'THE SFM', applicationCategory: 'FinanceApplication', operatingSystem: 'Web', url: 'https://www.the-sfm.com', offers: { '@type': 'Offer', price: '5', priceCurrency: 'USD' } },
    ],
  };

  return (
    <main dir={dir} className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Image src="/sfm-logo.png" alt="THE SFM" width={38} height={38} className="rounded-xl" priority />
            <span>THE SFM</span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            <a className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" href="#features">{text.navFeatures}</a>
            <a className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" href="#pricing">{text.navPricing}</a>
            <a className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" href="#security">{text.navSecurity}</a>
            <a className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" href="#faq">{text.navFaq}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="gold" compact />
            <ThemeToggle />
            <Link href={appHref} prefetch={false} className="hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:inline-flex">{ctaLabel}</Link>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border lg:hidden" onClick={() => setMenuOpen(value => !value)} aria-label="menu">{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
          </div>
        </div>
        {menuOpen ? (
          <div className="border-t border-border bg-background px-4 py-3 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-2">
              {[['#features', text.navFeatures], ['#pricing', text.navPricing], ['#security', text.navSecurity], ['#faq', text.navFaq]].map(([href, label]) => <a key={href} href={href} className="rounded-xl px-3 py-2 hover:bg-muted" onClick={() => setMenuOpen(false)}>{label}</a>)}
            </div>
          </div>
        ) : null}
      </header>

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary"><Sparkles size={15} />{text.heroKicker}</span>
            <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">{text.heroTitle}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">{text.heroSubtitle}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={appHref} prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground">{ctaLabel}</Link>
              <Link href="/zakat-calculator" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 font-semibold hover:bg-muted">{text.heroSecondary}<ArrowLeft size={17} /></Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-card/95 p-4 shadow-xl md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{text.demoBadge}</span><h2 className="mt-3 text-xl font-bold">{text.demoTitle}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{text.demoSubtitle}</p></div>
              <BarChart3 className="text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[[text.demoIncome, '1,250 KWD'], [text.demoExpenses, '680 KWD'], [text.demoProjects, '3'], [text.demoZakat, '312.50 KWD']].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-border bg-muted/30 p-4"><span className="text-xs text-muted-foreground">{label}</span><strong className="mt-2 block text-xl">{value}</strong><span className="mt-2 inline-block rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">{text.demoExample}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div><h2 className="text-3xl font-bold">{text.trustTitle}</h2><p className="mt-3 leading-7 text-muted-foreground">{text.trustSubtitle}</p></div>
          <div className="grid gap-3 sm:grid-cols-2">{text.trustItems.map(item => <div key={item} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"><CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={20} /><span>{item}</span></div>)}</div>
        </div>
      </section>

      <section id="features" className="border-y border-border bg-muted/25">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-6">
          <div className="max-w-3xl"><h2 className="text-3xl font-bold md:text-4xl">{text.featuresTitle}</h2><p className="mt-3 leading-7 text-muted-foreground">{text.featuresSubtitle}</p></div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featureItems.map(([Icon, title, desc]) => <article key={pick(title, currentLang)} className="rounded-2xl border border-border bg-card p-5"><span className="inline-flex rounded-xl bg-primary/10 p-2.5 text-primary"><Icon size={21} /></span><h3 className="mt-4 text-lg font-bold">{pick(title, currentLang)}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{pick(desc, currentLang)}</p></article>)}
          </div>
          <button onClick={() => setShowAllFeatures(value => !value)} className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-border bg-card px-4 font-semibold hover:bg-muted">{showAllFeatures ? text.lessFeatures : text.allFeatures}</button>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <div className="max-w-3xl"><h2 className="text-3xl font-bold md:text-4xl">{text.pricingTitle}</h2><p className="mt-3 leading-7 text-muted-foreground">{text.pricingSubtitle}</p></div>
        <div className="mt-6 inline-flex rounded-xl border border-border bg-muted/40 p-1">
          {(['monthly', 'yearly'] as const).map(interval => <button key={interval} onClick={() => setBilling(interval)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${billing === interval ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>{interval === 'monthly' ? text.monthly : text.yearly}</button>)}
        </div>
        {billing === 'yearly' ? <span className="ms-3 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{text.saveTwoMonths}</span> : null}
        {message ? <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</div> : null}
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <PricingCard title={text.free} price={text.freePrice} description={text.freeDesc} features={['Income & expenses', 'Goals & savings', 'Public calculators']} action={<Link href={appHref} className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl border border-border font-semibold hover:bg-muted">{ctaLabel}</Link>} />
          <PricingCard featured badge={text.recommended} title={text.pro} price={billing === 'yearly' ? text.proYearly : text.proMonthly} description={text.proDesc} features={['Personal finance', 'Investments & markets', 'Zakat workspace', 'AI tools & reports']} action={<button disabled={loading || checkoutLoading !== null} onClick={() => void startCheckout('premium')} className="mt-auto min-h-11 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60">{checkoutLoading === 'premium' ? text.checkoutLoading : text.subscribe}</button>} />
          <PricingCard title={text.business} price={text.businessYearly} description={text.businessDesc} features={['Company presence', 'Business services', 'Review before publishing']} interval={text.yearlyOnly} action={<button disabled={loading || checkoutLoading !== null} onClick={() => void startCheckout('company')} className="mt-auto min-h-11 rounded-xl border border-border font-semibold hover:bg-muted disabled:opacity-60">{checkoutLoading === 'company' ? text.checkoutLoading : text.addCompany}</button>} />
        </div>
      </section>

      <section id="security" className="border-y border-border bg-muted/25">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-6">
          <div className="max-w-3xl"><div className="inline-flex items-center gap-2 text-primary"><LockKeyhole size={20} /><span className="font-semibold">Security</span></div><h2 className="mt-3 text-3xl font-bold md:text-4xl">{text.securityTitle}</h2><p className="mt-3 leading-7 text-muted-foreground">{text.securitySubtitle}</p></div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">{text.securityCards.map(item => <div key={item} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5"><ShieldCheck className="mt-0.5 shrink-0 text-primary" /><span>{item}</span></div>)}</div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-4xl px-4 py-14 md:px-6">
        <div className="text-center"><h2 className="text-3xl font-bold md:text-4xl">{text.faqTitle}</h2><p className="mt-3 text-muted-foreground">{text.faqSubtitle}</p></div>
        <div className="mt-8 grid gap-3">{faqItems.map(([question, answer], index) => { const open = openFaq === index; return <article key={question} className="overflow-hidden rounded-2xl border border-border bg-card"><button onClick={() => setOpenFaq(open ? -1 : index)} className="flex w-full items-center justify-between gap-4 p-4 text-start font-semibold"><span>{question}</span><ChevronDown size={18} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open ? <p className="border-t border-border px-4 py-4 text-sm leading-7 text-muted-foreground">{answer}</p> : null}</article>; })}</div>
        <div className="mt-5 text-center"><button onClick={() => setShowAllFaq(value => !value)} className="rounded-xl border border-border bg-card px-4 py-2.5 font-semibold hover:bg-muted">{showAllFaq ? text.less : text.more}</button></div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
        <div className="rounded-[28px] border border-primary/20 bg-primary/10 p-7 text-center md:p-10"><h2 className="text-3xl font-bold">{text.finalTitle}</h2><p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{text.finalSubtitle}</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href={appHref} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground">{ctaLabel}</Link><Link href="/zakat-calculator" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-6 font-semibold">{text.heroSecondary}</Link></div></div>
      </section>

      <div className="fixed inset-x-3 bottom-3 z-40 sm:hidden"><Link href={appHref} className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground shadow-xl">{ctaLabel}</Link></div>

      <footer className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground"><p>{text.footer}</p><div className="mt-3 flex justify-center gap-4"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link></div></footer>
    </main>
  );
}

function PricingCard({ title, price, description, features, action, featured, badge, interval }: { title: string; price: string; description: string; features: string[]; action: React.ReactNode; featured?: boolean; badge?: string; interval?: string }) {
  return <article className={`flex min-h-[430px] flex-col rounded-3xl border bg-card p-6 ${featured ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'border-border'}`}>{badge ? <span className="mb-3 w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{badge}</span> : null}<h3 className="text-xl font-bold">{title}</h3><strong className="mt-4 text-3xl">{price}</strong>{interval ? <span className="mt-1 text-xs text-muted-foreground">{interval}</span> : null}<p className="mt-4 text-sm leading-7 text-muted-foreground">{description}</p><ul className="my-6 grid gap-3">{features.map(item => <li key={item} className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className="text-primary" />{item}</li>)}</ul>{action}</article>;
}
