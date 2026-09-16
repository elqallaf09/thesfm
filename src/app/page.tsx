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
  demoBadge: string;
  demoTitle: string;
  demoSubtitle: string;
  demoIncome: string;
  demoExpenses: string;
  demoProjects: string;
  demoZakat: string;
  demoExample: string;
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
    navFeatures: 'المميزات', navPricing: 'الأسعار', navSecurity: 'الأمان', navFaq: 'الأسئلة', start: 'ابدأ الآن', dashboard: 'افتح حسابي',
    heroKicker: 'ذكاء مالي مبني للخليج', heroTitle: 'أدِر أموالك وزكاتك واستثماراتك ومشاريعك من مكان واحد — بالعربي.',
    heroSubtitle: 'THE SFM يجمع المال الشخصي، الزكاة، الاستثمار، الأعمال والتقارير في منصة واحدة واضحة، مع واجهة عربية وإنجليزية وفرنسية.', heroSecondary: 'جرّب حاسبة الزكاة',
    demoBadge: 'مثال', demoTitle: 'معاينة واضحة للمنتج', demoSubtitle: 'أرقام تجريبية معلّمة بوضوح حتى تعرف شكل التجربة قبل إضافة بياناتك الحقيقية.', demoIncome: 'الدخل الشهري', demoExpenses: 'المصروفات', demoProjects: 'المشاريع', demoZakat: 'الزكاة التقديرية', demoExample: 'بيانات تجريبية',
    trustTitle: 'أرقامك أنت، مو تقديرات', trustSubtitle: 'داخل حسابك، التحليلات تعتمد على بياناتك الفعلية. وإذا كانت البيانات ناقصة، نوضح ذلك بدل اختراع أرقام.', trustItems: ['مصادر وتواريخ تحديث عند توفرها', 'فصل واضح بين الحقيقي والتجريبي', 'واجهة عربية وإنجليزية وفرنسية', 'تحليلات بدون أرقام غير موثقة'],
    featuresTitle: 'أهم ما تحتاجه فعلاً', featuresSubtitle: 'نعرض القيمة الأساسية أولاً بدل إغراقك بعشرات المميزات. تقدر توسّع القائمة متى ما احتجت.', allFeatures: 'كل المميزات', lessFeatures: 'عرض أقل',
    pricingTitle: 'تسعير بسيط وواضح', pricingSubtitle: 'الأفراد: 5$ شهرياً أو 50$ سنوياً. الشركات: 50$ سنوياً.', monthly: 'شهري', yearly: 'سنوي', saveTwoMonths: 'وفّر شهرين', free: 'مجاني', pro: 'الأفراد', business: 'الشركات', freePrice: 'مجاني', yearlyOnly: 'سنوي فقط', recommended: 'الأكثر مناسبة', freeDesc: 'ابدأ بالأساسيات والحاسبات العامة.', proDesc: 'لإدارة أموالك واستثماراتك وزكاتك وتقاريرك وأدواتك المتقدمة.', businessDesc: 'للشركات والمشاريع التي تريد الظهور وخدمات الأعمال داخل المنصة.', subscribe: 'اشترك الآن', addCompany: 'أضف شركتك', checkoutLoading: 'جارٍ فتح الدفع...', checkoutError: 'تعذر فتح الدفع حالياً. حاول مرة أخرى.', currencyLabel: 'عرض السعر بـ', usdBillingNote: 'الأسعار المحلية للعرض التقريبي فقط. جلسة الدفع تستخدم سعر الاشتراك المحدد بالدولار الأمريكي في Stripe.', approximatePrice: 'تقريبي',
    securityKicker: 'الأمان والخصوصية', securityTitle: 'أمان واضح بدون كلام تسويقي مبهم', securitySubtitle: 'نوضح طبقات الحماية التي يعتمد عليها المنتج بدون ادعاءات غير قابلة للتحقق.', securityCards: ['HTTPS أثناء نقل البيانات', 'جلسات دخول وصلاحيات وصول للحساب', 'دعم المصادقة الثنائية', 'بنية بيانات مرتبطة بـ Supabase مع سياسات وصول'],
    faqTitle: 'أسئلة مهمة قبل التسجيل', faqSubtitle: 'أهم 6 أسئلة أولاً، والباقي عند الطلب.', more: 'عرض المزيد', less: 'عرض أقل', finalTitle: 'ابدأ بوضوح مالي أفضل اليوم', finalSubtitle: 'جرّب الأدوات العامة أو افتح حسابك وأضف بياناتك الحقيقية.', footer: 'THE SFM — منصة ذكاء مالي واقتصادي للأفراد والأعمال.',
  },
  en: {
    navFeatures: 'Features', navPricing: 'Pricing', navSecurity: 'Security', navFaq: 'FAQ', start: 'Get started', dashboard: 'Open dashboard',
    heroKicker: 'Financial intelligence built for the Gulf', heroTitle: 'Manage your money, zakat, investments, and projects in one place — in Arabic.', heroSubtitle: 'THE SFM brings personal finance, zakat, investing, business, and reporting into one clear platform with Arabic, English, and French interfaces.', heroSecondary: 'Try the zakat calculator',
    demoBadge: 'Example', demoTitle: 'A clear product preview', demoSubtitle: 'Clearly labeled demo values show the experience before you add your own real data.', demoIncome: 'Monthly income', demoExpenses: 'Expenses', demoProjects: 'Projects', demoZakat: 'Estimated zakat', demoExample: 'Demo data',
    trustTitle: 'Your numbers, not guesses', trustSubtitle: 'Inside your account, analysis is based on your saved data. When data is missing, THE SFM says so instead of inventing values.', trustItems: ['Sources and update dates when available', 'Clear separation of real and demo data', 'Arabic, English, and French interface', 'Analysis without unsupported numbers'],
    featuresTitle: 'The six things that matter first', featuresSubtitle: 'We show the core value first instead of overwhelming you with dozens of features. Expand the list when you need it.', allFeatures: 'All features', lessFeatures: 'Show less',
    pricingTitle: 'Simple pricing', pricingSubtitle: 'Individuals: $5/month or $50/year. Companies: $50/year.', monthly: 'Monthly', yearly: 'Yearly', saveTwoMonths: 'Save two months', free: 'Free', pro: 'Individuals', business: 'Companies', freePrice: 'Free', yearlyOnly: 'Yearly only', recommended: 'Recommended', freeDesc: 'Start with essentials and public calculators.', proDesc: 'For personal finance, investments, zakat, reports, and advanced tools.', businessDesc: 'For companies and projects that want a business presence and business services.', subscribe: 'Subscribe', addCompany: 'Add your company', checkoutLoading: 'Opening checkout...', checkoutError: 'Checkout is unavailable right now. Please try again.', currencyLabel: 'Display price in', usdBillingNote: 'Local-currency values are approximate display amounts only. Checkout uses the subscription price configured in USD in Stripe.', approximatePrice: 'Approx.',
    securityKicker: 'Security & privacy', securityTitle: 'Security explained clearly', securitySubtitle: 'We describe the product protections without vague or unverifiable claims.', securityCards: ['HTTPS for data in transit', 'Authenticated sessions and account access controls', 'Two-factor authentication support', 'Supabase-backed data infrastructure with access policies'],
    faqTitle: 'Questions before you join', faqSubtitle: 'The six most useful answers first, with more available on demand.', more: 'Show more', less: 'Show less', finalTitle: 'Start with a clearer financial picture', finalSubtitle: 'Try a public tool or create your account and add your real data.', footer: 'THE SFM — financial and economic intelligence for individuals and businesses.',
  },
  fr: {
    navFeatures: 'Fonctionnalités', navPricing: 'Prix', navSecurity: 'Sécurité', navFaq: 'FAQ', start: 'Commencer', dashboard: 'Ouvrir le tableau',
    heroKicker: 'Intelligence financière pensée pour le Golfe', heroTitle: 'Gérez argent, zakat, investissements et projets depuis un seul endroit — en arabe.', heroSubtitle: 'THE SFM réunit finances personnelles, zakat, investissement, business et rapports avec des interfaces arabe, anglaise et française.', heroSecondary: 'Essayer la calculatrice de zakat',
    demoBadge: 'Exemple', demoTitle: 'Un aperçu clair du produit', demoSubtitle: 'Des valeurs de démonstration clairement marquées montrent l’expérience avant vos propres données réelles.', demoIncome: 'Revenu mensuel', demoExpenses: 'Dépenses', demoProjects: 'Projets', demoZakat: 'Zakat estimée', demoExample: 'Données démo',
    trustTitle: 'Vos chiffres, pas des suppositions', trustSubtitle: 'Dans votre compte, les analyses reposent sur vos données enregistrées. S’il manque des données, THE SFM le signale.', trustItems: ['Sources et dates de mise à jour quand disponibles', 'Séparation claire entre réel et démo', 'Interface arabe, anglaise et française', 'Analyses sans chiffres non étayés'],
    featuresTitle: 'Les six fonctions essentielles', featuresSubtitle: 'Nous montrons d’abord la valeur principale. Vous pouvez développer la liste lorsque vous en avez besoin.', allFeatures: 'Toutes les fonctions', lessFeatures: 'Afficher moins',
    pricingTitle: 'Tarification simple', pricingSubtitle: 'Particuliers : 5 $/mois ou 50 $/an. Entreprises : 50 $/an.', monthly: 'Mensuel', yearly: 'Annuel', saveTwoMonths: 'Économisez deux mois', free: 'Gratuit', pro: 'Particuliers', business: 'Entreprises', freePrice: 'Gratuit', yearlyOnly: 'Annuel uniquement', recommended: 'Recommandé', freeDesc: 'Commencez avec les fonctions essentielles et les calculateurs publics.', proDesc: 'Pour finances personnelles, investissements, zakat, rapports et outils avancés.', businessDesc: 'Pour les entreprises et projets qui veulent une présence et des services business.', subscribe: 'S’abonner', addCompany: 'Ajouter votre société', checkoutLoading: 'Ouverture du paiement...', checkoutError: 'Le paiement est indisponible pour le moment.', currencyLabel: 'Afficher le prix en', usdBillingNote: 'Les montants en devise locale sont uniquement indicatifs. Le paiement utilise le prix d’abonnement configuré en USD dans Stripe.', approximatePrice: 'Approx.',
    securityKicker: 'Sécurité et confidentialité', securityTitle: 'Une sécurité expliquée clairement', securitySubtitle: 'Nous décrivons les protections du produit sans promesses vagues ou invérifiables.', securityCards: ['HTTPS pour les données en transit', 'Sessions authentifiées et contrôles d’accès', 'Prise en charge de la double authentification', 'Infrastructure de données liée à Supabase avec politiques d’accès'],
    faqTitle: 'Questions avant de commencer', faqSubtitle: 'Les six réponses les plus utiles d’abord, puis le reste à la demande.', more: 'Afficher plus', less: 'Afficher moins', finalTitle: 'Commencez avec une vision financière plus claire', finalSubtitle: 'Essayez un outil public ou créez votre compte et ajoutez vos données réelles.', footer: 'THE SFM — intelligence financière et économique pour particuliers et entreprises.',
  },
};

const FEATURES: readonly [React.ElementType, Trio, Trio][] = [
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
  ar: [['شنو THE SFM؟', 'منصة تجمع إدارة المال، الاستثمار، الزكاة، المشاريع، التقارير والذكاء المالي في مكان واحد.'], ['هل يستخدم أرقام وهمية؟', 'داخل الحساب نعتمد على بيانات المستخدم الفعلية. البيانات التجريبية تظهر فقط عندما تكون معلّمة بوضوح كمثال.'], ['هل حاسبة الزكاة تحتاج تسجيل؟', 'لا. حاسبة الزكاة العامة متاحة بدون تسجيل دخول، أما حفظ الحسابات وتتبعها فيكون داخل الحساب.'], ['هل يدعم العربية؟', 'نعم، ويدعم كذلك الإنجليزية والفرنسية.'], ['هل THE SFM يقدم استشارة مالية أو شرعية؟', 'لا. المنصة أداة تنظيم وتحليل وليست بديلاً عن مستشار مالي أو قانوني أو شرعي مختص.'], ['شلون تنحفظ بياناتي؟', 'التطبيق يعتمد على بنية مرتبطة بـ Supabase مع جلسات دخول وصلاحيات وصول، ويستخدم HTTPS أثناء النقل.'], ['هل مناسب للشركات؟', 'نعم، توجد خدمات ومزايا مخصصة للشركات والمشاريع إلى جانب حسابات الأفراد.'], ['هل أقدر أستخدمه بدون بيانات كثيرة؟', 'نعم. تبدأ تدريجياً، وتظهر حالات واضحة عندما تكون البيانات غير كافية.'], ['هل فيه تقارير؟', 'نعم، توجد تقارير مرتبطة بالدخل والمصروفات والاستثمارات والمشاريع والزكاة حسب البيانات المتوفرة.'], ['شلون أتواصل مع الدعم؟', `عبر البريد ${SUPPORT_EMAIL}.`]],
  en: [['What is THE SFM?', 'A platform that combines money management, investing, zakat, projects, reporting, and financial intelligence in one place.'], ['Does it use fake numbers?', 'Inside accounts, analysis relies on real user data. Demo data appears only when clearly labeled as an example.'], ['Does the zakat calculator require an account?', 'No. The public zakat calculator works without sign-in; saving and tracking calculations happens inside an account.'], ['Does it support Arabic?', 'Yes. Arabic, English, and French are supported.'], ['Is THE SFM financial or religious advice?', 'No. It is an organization and analysis tool, not a replacement for a qualified financial, legal, tax, or religious adviser.'], ['How is my data handled?', 'The app uses Supabase-backed infrastructure, authenticated sessions and access controls, with HTTPS in transit.'], ['Is it suitable for companies?', 'Yes. Business and project services sit alongside individual accounts.'], ['Can I start with little data?', 'Yes. You can build your account gradually and the product shows clear insufficient-data states.'], ['Are reports included?', 'Yes, reports can cover income, expenses, investments, projects, and zakat based on available data.'], ['How do I contact support?', `Email ${SUPPORT_EMAIL}.`]],
  fr: [['Qu’est-ce que THE SFM ?', 'Une plateforme qui réunit gestion financière, investissement, zakat, projets, rapports et intelligence financière.'], ['Utilise-t-elle de faux chiffres ?', 'Dans les comptes, les analyses reposent sur les données réelles. Les données démo sont toujours signalées comme exemple.'], ['La calculatrice de zakat nécessite-t-elle un compte ?', 'Non. La calculatrice publique fonctionne sans connexion ; l’enregistrement et le suivi se font dans le compte.'], ['La plateforme prend-elle en charge l’arabe ?', 'Oui, ainsi que l’anglais et le français.'], ['THE SFM fournit-il des conseils financiers ou religieux ?', 'Non. C’est un outil d’organisation et d’analyse, pas un substitut à un conseiller qualifié.'], ['Comment mes données sont-elles gérées ?', 'L’application utilise une infrastructure liée à Supabase, des sessions authentifiées, des contrôles d’accès et HTTPS en transit.'], ['Est-ce adapté aux entreprises ?', 'Oui. Des services business et projets existent en plus des comptes particuliers.'], ['Puis-je commencer avec peu de données ?', 'Oui. Vous pouvez progresser étape par étape et les données insuffisantes sont clairement signalées.'], ['Y a-t-il des rapports ?', 'Oui, selon les données disponibles : revenus, dépenses, investissements, projets et zakat.'], ['Comment contacter le support ?', `Par e-mail : ${SUPPORT_EMAIL}.`]],
} satisfies Record<Lang, [string, string][]>;

const DISPLAY_CURRENCIES: readonly DisplayCurrency[] = ['USD', 'KWD', 'SAR', 'AED'];

function pick(tuple: Trio, lang: Lang) { return tuple[lang === 'ar' ? 0 : lang === 'fr' ? 2 : 1]; }
function asDisplayCurrency(value: string): DisplayCurrency { return DISPLAY_CURRENCIES.includes(value as DisplayCurrency) ? value as DisplayCurrency : 'USD'; }
function localizedPrice(usdAmount: number, currency: DisplayCurrency) {
  if (currency === 'USD') return `$${usdAmount}`;
  const converted = convertCurrencyAmount(usdAmount, 'USD', currency);
  if (converted === null) return `$${usdAmount}`;
  return `≈ ${converted.toLocaleString('en-US', { maximumFractionDigits: currency === 'KWD' ? 3 : 2 })} ${currency}`;
}

export default function PublicLandingPage() {
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
      const response = await fetch('/api/stripe/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ plan, billingInterval: interval }) });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; url?: string };
      if (!response.ok || !payload.ok || !payload.url) throw new Error('checkout');
      window.location.assign(payload.url);
    } catch { setMessage(text.checkoutError); } finally { setCheckoutLoading(null); }
  }, [billing, router, session, text.checkoutError]);

  const structuredData = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': 'https://www.the-sfm.com/#organization', name: 'THE SFM', url: 'https://www.the-sfm.com' },
    { '@type': 'SoftwareApplication', name: 'THE SFM', applicationCategory: 'FinanceApplication', operatingSystem: 'Web', url: 'https://www.the-sfm.com', offers: [
      { '@type': 'Offer', name: 'Individuals monthly', price: '5', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Individuals annual', price: '50', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Companies annual', price: '50', priceCurrency: 'USD' },
    ] },
  ] };

  return (
    <main dir={dir} className="landing-page min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold"><Image src="/sfm-logo.png" alt="THE SFM" width={38} height={38} className="rounded-[var(--radius-card)]" priority /><span>THE SFM</span></Link>
          <nav className="hidden items-center gap-1 lg:flex">{[[ '#features', text.navFeatures ], [ '#pricing', text.navPricing ], [ '#security', text.navSecurity ], [ '#faq', text.navFaq ]].map(([href, label]) => <a key={href} className="rounded-[var(--radius-pill)] px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" href={href}>{label}</a>)}</nav>
          <div className="flex items-center gap-2"><LanguageSwitcher variant="gold" compact /><ThemeToggle /><Link href={appHref} prefetch={false} className="hidden rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:inline-flex">{ctaLabel}</Link><button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border border-border lg:hidden" onClick={() => setMenuOpen(value => !value)} aria-label="menu" aria-expanded={menuOpen}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button></div>
        </div>
        {menuOpen ? <div className="border-t border-border bg-background px-4 py-3 lg:hidden"><div className="mx-auto grid max-w-7xl gap-2">{[[ '#features', text.navFeatures ], [ '#pricing', text.navPricing ], [ '#security', text.navSecurity ], [ '#faq', text.navFaq ]].map(([href, label]) => <a key={href} href={href} className="rounded-[var(--radius-control)] px-3 py-2 hover:bg-muted" onClick={() => setMenuOpen(false)}>{label}</a>)}</div></div> : null}
      </header>

      <section className="landing-hero relative overflow-hidden border-b border-border"><div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24">
        <div><span className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-primary/25 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary"><Sparkles size={15} />{text.heroKicker}</span><h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">{text.heroTitle}</h1><p className="landing-secondary mt-5 max-w-3xl text-base leading-8 md:text-lg">{text.heroSubtitle}</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link href={appHref} prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-6 font-semibold text-primary-foreground">{ctaLabel}</Link><Link href="/zakat-calculator" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border bg-card px-6 font-semibold hover:bg-muted">{text.heroSecondary}<ArrowLeft size={17} /></Link></div></div>
        <aside className="rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-[var(--shadow-lg)] md:p-6" aria-label={text.demoTitle}><div className="mb-5 flex items-start justify-between gap-4"><div><span className="rounded-[var(--radius-pill)] bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{text.demoBadge}</span><h2 className="mt-3 text-xl font-bold">{text.demoTitle}</h2><p className="landing-muted mt-1 text-sm leading-6">{text.demoSubtitle}</p></div><BarChart3 className="text-primary" /></div><div className="grid grid-cols-2 gap-3">{[[text.demoIncome, '1,250 KWD'], [text.demoExpenses, '680 KWD'], [text.demoProjects, '3'], [text.demoZakat, '312.50 KWD']].map(([label, value]) => <div key={label} className="rounded-[var(--radius-card)] border border-border bg-muted/30 p-4"><small className="landing-muted">{label}</small><strong className="mt-2 block text-xl">{value}</strong><span className="mt-2 inline-block rounded-[var(--radius-pill)] bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">{text.demoExample}</span></div>)}</div></aside>
      </div></section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6"><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-start"><div><h2 className="text-3xl font-bold">{text.trustTitle}</h2><p className="landing-secondary mt-3 leading-7">{text.trustSubtitle}</p></div><div className="grid gap-3 sm:grid-cols-2">{text.trustItems.map(item => <div key={item} className="flex items-start gap-3 rounded-[var(--radius-card)] border border-border bg-card p-4"><CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={20} /><span>{item}</span></div>)}</div></div></section>

      <section id="features" className="border-y border-border bg-muted/25"><div className="mx-auto max-w-7xl px-4 py-14 md:px-6"><div className="max-w-3xl"><h2 className="text-3xl font-bold md:text-4xl">{text.featuresTitle}</h2><p className="landing-secondary mt-3 leading-7">{text.featuresSubtitle}</p></div><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{featureItems.map(([Icon, title, description]) => <article key={pick(title, currentLang)} className="rounded-[var(--radius-card)] border border-border bg-card p-5 shadow-[var(--shadow-xs)]"><span className="inline-flex rounded-[var(--radius-control)] bg-primary/10 p-2.5 text-primary"><Icon size={21} /></span><h3 className="mt-4 text-lg font-bold">{pick(title, currentLang)}</h3><p className="landing-muted mt-2 text-sm leading-7">{pick(description, currentLang)}</p></article>)}</div><button type="button" onClick={() => setShowAllFeatures(value => !value)} className="mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border bg-card px-4 font-semibold hover:bg-muted">{showAllFeatures ? text.lessFeatures : text.allFeatures}</button></div></section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-14 md:px-6"><div className="max-w-3xl"><h2 className="text-3xl font-bold md:text-4xl">{text.pricingTitle}</h2><p className="landing-secondary mt-3 leading-7">{text.pricingSubtitle}</p></div>
        <div className="mt-6 flex flex-wrap items-center gap-3"><div className="inline-flex rounded-[var(--radius-control)] border border-border bg-muted/40 p-1">{(['monthly', 'yearly'] as const).map(interval => <button type="button" key={interval} onClick={() => setBilling(interval)} className={`rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold ${billing === interval ? 'bg-card shadow-[var(--shadow-xs)]' : 'text-muted-foreground'}`}>{interval === 'monthly' ? text.monthly : text.yearly}</button>)}</div>{billing === 'yearly' ? <span className="inline-flex rounded-[var(--radius-pill)] bg-success/10 px-3 py-1 text-sm font-semibold text-success">{text.saveTwoMonths}</span> : null}</div>
        <div className="mt-5 rounded-[var(--radius-card)] border border-border bg-card p-4"><div className="flex flex-wrap items-center gap-3"><span className="text-sm font-semibold">{text.currencyLabel}</span><div className="flex flex-wrap gap-2" aria-label={text.currencyLabel}>{DISPLAY_CURRENCIES.map(code => <button type="button" key={code} aria-pressed={displayCurrency === code} onClick={() => setCurrency(code)} className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-sm font-semibold ${displayCurrency === code ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>{code}</button>)}</div></div><p className="landing-muted mt-3 text-xs leading-6">{text.usdBillingNote}</p></div>
        {message ? <div className="mt-4 rounded-[var(--radius-control)] border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{message}</div> : null}
        <div className="mt-8 grid gap-5 lg:grid-cols-3"><PricingCard title={text.free} price={text.freePrice} description={text.freeDesc} features={PLAN_FEATURES.free.map(item => pick(item, currentLang))} action={<Link href={appHref} className="mt-auto inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-border font-semibold hover:bg-muted">{ctaLabel}</Link>} /><PricingCard featured badge={text.recommended} title={text.pro} price={localizedPrice(billing === 'yearly' ? 50 : 5, displayCurrency)} priceMeta={displayCurrency === 'USD' ? undefined : text.approximatePrice} description={text.proDesc} features={PLAN_FEATURES.premium.map(item => pick(item, currentLang))} action={<button type="button" disabled={loading || checkoutLoading !== null} onClick={() => void startCheckout('premium')} className="mt-auto min-h-11 rounded-[var(--radius-control)] bg-primary font-semibold text-primary-foreground disabled:opacity-60">{checkoutLoading === 'premium' ? text.checkoutLoading : text.subscribe}</button>} /><PricingCard title={text.business} price={localizedPrice(50, displayCurrency)} priceMeta={displayCurrency === 'USD' ? text.yearlyOnly : `${text.approximatePrice} · ${text.yearlyOnly}`} description={text.businessDesc} features={PLAN_FEATURES.company.map(item => pick(item, currentLang))} action={<button type="button" disabled={loading || checkoutLoading !== null} onClick={() => void startCheckout('company')} className="mt-auto min-h-11 rounded-[var(--radius-control)] border border-border font-semibold hover:bg-muted disabled:opacity-60">{checkoutLoading === 'company' ? text.checkoutLoading : text.addCompany}</button>} /></div>
      </section>

      <section id="security" className="border-y border-border bg-muted/25"><div className="mx-auto max-w-7xl px-4 py-14 md:px-6"><div className="max-w-3xl"><div className="inline-flex items-center gap-2 text-primary"><LockKeyhole size={20} /><span className="font-semibold">{text.securityKicker}</span></div><h2 className="mt-3 text-3xl font-bold md:text-4xl">{text.securityTitle}</h2><p className="landing-secondary mt-3 leading-7">{text.securitySubtitle}</p></div><div className="mt-8 grid gap-4 md:grid-cols-2">{text.securityCards.map(item => <div key={item} className="flex items-start gap-3 rounded-[var(--radius-card)] border border-border bg-card p-5"><ShieldCheck className="mt-0.5 shrink-0 text-primary" /><span>{item}</span></div>)}</div></div></section>

      <section id="faq" className="mx-auto max-w-4xl px-4 py-14 md:px-6"><div className="text-center"><h2 className="text-3xl font-bold md:text-4xl">{text.faqTitle}</h2><p className="landing-secondary mt-3">{text.faqSubtitle}</p></div><div className="mt-8 grid gap-3">{faqItems.map(([question, answer], index) => { const open = openFaq === index; return <article key={question} className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card"><button type="button" onClick={() => setOpenFaq(open ? -1 : index)} className="flex w-full items-center justify-between gap-4 p-4 text-start font-semibold" aria-expanded={open}><span>{question}</span><ChevronDown size={18} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open ? <p className="landing-muted border-t border-border px-4 py-4 text-sm leading-7">{answer}</p> : null}</article>; })}</div><div className="mt-5 text-center"><button type="button" onClick={() => setShowAllFaq(value => !value)} className="rounded-[var(--radius-control)] border border-border bg-card px-4 py-2.5 font-semibold hover:bg-muted">{showAllFaq ? text.less : text.more}</button></div></section>

      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-6"><div className="rounded-[var(--radius-panel)] border border-primary/20 bg-primary/10 p-7 text-center md:p-10"><h2 className="text-3xl font-bold">{text.finalTitle}</h2><p className="landing-secondary mx-auto mt-3 max-w-2xl">{text.finalSubtitle}</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href={appHref} className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-6 font-semibold text-primary-foreground">{ctaLabel}</Link><Link href="/zakat-calculator" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border border-border bg-card px-6 font-semibold">{text.heroSecondary}</Link></div></div></section>
      <div className="fixed inset-x-3 bottom-3 z-40 sm:hidden"><Link href={appHref} className="flex min-h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-5 font-bold text-primary-foreground shadow-[var(--shadow-lg)]">{ctaLabel}</Link></div>
      <footer className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground"><p>{text.footer}</p><div className="mt-3 flex justify-center gap-4"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link></div></footer>
      <style jsx>{landingStyles}</style>
    </main>
  );
}

function PricingCard({ title, price, description, features, action, featured, badge, priceMeta }: { title: string; price: string; description: string; features: string[]; action: React.ReactNode; featured?: boolean; badge?: string; priceMeta?: string }) {
  return <article className={`flex min-h-[430px] flex-col rounded-[var(--radius-panel)] border bg-card p-6 ${featured ? 'border-primary shadow-[var(--shadow-lg)] ring-1 ring-primary/20' : 'border-border'}`}>{badge ? <span className="mb-3 w-fit rounded-[var(--radius-pill)] bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{badge}</span> : null}<h3 className="text-xl font-bold">{title}</h3><strong data-financial-value="true" className="mt-4 text-3xl">{price}</strong>{priceMeta ? <span className="landing-muted mt-1 text-xs">{priceMeta}</span> : null}<p className="landing-muted mt-4 text-sm leading-7">{description}</p><ul className="my-6 grid gap-3">{features.map(item => <li key={item} className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className="text-primary" />{item}</li>)}</ul>{action}</article>;
}

const landingStyles = `
  .landing-page {
    color: var(--foreground);
    background: var(--background);
    font-family: var(--font-ui);
  }
  .landing-page .landing-secondary {
    color: var(--foreground-secondary);
  }
  .landing-page .landing-muted {
    color: var(--foreground-muted);
  }
  .landing-page .landing-hero {
    background: var(--hero-gradient);
  }
  .landing-page header,
  .landing-page aside,
  .landing-page article {
    background: var(--surface-elevated);
  }
`;
