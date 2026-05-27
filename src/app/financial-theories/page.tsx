'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Gauge,
  GraduationCap,
  Landmark,
  Layers3,
  Lightbulb,
  PiggyBank,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  WalletCards,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { PageHero } from '@/components/layout/PageHero';
import { AppCard } from '@/components/layout/AppCard';
import { CardsGrid, StatGrid } from '@/components/layout/LayoutPrimitives';
import { PageTabs, type PageTabItem } from '@/components/layout/PageTabs';
import { EmptyState } from '@/components/layout/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import {
  FEATURED_FINANCIAL_THEORIES,
  FINANCIAL_THEORIES,
  FINANCIAL_THEORY_CATEGORIES,
  FINANCIAL_THEORY_TOOLS,
  getFinancialTheoryText,
  type FinancialTheory,
  type FinancialTheoryCategoryId,
  type FinancialTheoryLang,
  type LocalizedText,
} from '@/lib/financial-theories';

const THEORY_ICONS = [
  WalletCards,
  PiggyBank,
  Sparkles,
  Layers3,
  ShieldAlert,
  Landmark,
  Brain,
  Gauge,
  Target,
  Calculator,
];

const UI_COPY: Record<FinancialTheoryLang, Record<string, string>> = {
  ar: {
    title: 'النظريات المالية',
    subtitle: 'تعلّم أهم المفاهيم المالية بطريقة واضحة، ثم طبّقها على دخلك، مصروفاتك، ادخارك، استثماراتك، وقراراتك داخل THE SFM.',
    badge: 'مكتبة مالية ذكية',
    startNow: 'ابدأ الآن',
    exploreTools: 'استكشف الأدوات الذكية',
    showBest: 'عرض أفضل النظريات',
    searchPlaceholder: 'ابحث عن نظرية مالية...',
    searchLabel: 'بحث في النظريات المالية',
    categories: 'التصنيفات',
    theoryLibrary: 'مكتبة النظريات المالية',
    theoryLibrarySubtitle: 'اختر تصنيفاً أو ابحث عن مفهوم، ثم افتح النظرية التي تريد فهمها بدون إطالة الصفحة.',
    whyTitle: 'ليش تحتاج تفهم النظريات المالية؟',
    whyBody: 'النظريات المالية تساعدك على اتخاذ قرارات أفضل، فهم مخاطر الديون والاستثمار، تنظيم الدخل والمصروفات، وبناء خطة مالية أوضح.',
    whyPoint1: 'تنظيم دخلك ومصروفاتك',
    whyPoint2: 'تقليل القرارات العشوائية',
    whyPoint3: 'ربط المعرفة بالأدوات داخل THE SFM',
    readTheory: 'عرض النظرية',
    hideTheory: 'إخفاء النظرية',
    keyTakeaway: 'الخلاصة',
    educationalExample: 'مثال تعليمي',
    examples: 'أمثلة',
    details: 'الشرح',
    relatedSfmTool: 'الأداة المرتبطة في THE SFM',
    applyInSfm: 'كيف تطبقها داخل THE SFM',
    openTool: 'فتح الأداة',
    useNow: 'استخدم الآن',
    available: 'متاح',
    comingSoon: 'قريباً',
    bestTitle: 'أفضل النظريات داخل THE SFM',
    bestSubtitle: 'هذه النظريات هي الأقرب لأدوات المنصة وتساعدك على تحويل المعرفة إلى خطوات عملية.',
    applyInsideSfm: 'تطبيق داخل SFM',
    practicalTitle: 'أمثلة عملية',
    practicalSubtitle: 'أمثلة تعليمية فقط لفهم الفكرة. لا تعرض بيانات مستخدم ولا نتائج من حسابك.',
    scenario: 'الموقف',
    lesson: 'الدرس',
    relatedTheory: 'النظرية المرتبطة',
    smartToolsTitle: 'أدوات وحاسبات ذكية',
    smartToolsSubtitle: 'أدوات عملية مرتبطة بالنظريات المالية لمساعدتك على اتخاذ قرارات أفضل.',
    status: 'الحالة',
    noResults: 'لا توجد نظريات مطابقة.',
    noResultsDescription: 'جرّب بحثاً آخر أو اختر تصنيفاً مختلفاً.',
    ctaTitle: 'ابدأ بتطبيق النظريات على وضعك المالي',
    ctaSubtitle: 'حوّل المعرفة إلى خطوات عملية داخل THE SFM من خلال الدخل، المصروفات، الأهداف، والاستثمارات.',
    openDashboard: 'فتح لوحة القيادة',
    openGoals: 'فتح الأهداف المالية',
    openTools: 'فتح أدوات وحاسبات',
    educationNote: 'هذه صفحة تعليمية وليست استشارة مالية شخصية.',
  },
  en: {
    title: 'Financial Theories',
    subtitle: 'Learn the key financial concepts clearly, then apply them to your income, expenses, savings, investments, and decisions inside THE SFM.',
    badge: 'Smart Financial Library',
    startNow: 'Start Now',
    exploreTools: 'Explore Smart Tools',
    showBest: 'View Best Theories',
    searchPlaceholder: 'Search financial theories...',
    searchLabel: 'Search financial theories',
    categories: 'Categories',
    theoryLibrary: 'Financial Theory Library',
    theoryLibrarySubtitle: 'Choose a category or search for a concept, then open only the theory you want to study.',
    whyTitle: 'Why should you understand financial theories?',
    whyBody: 'Financial theories help you make better decisions, understand debt and investment risk, organize income and expenses, and build a clearer financial plan.',
    whyPoint1: 'Organize income and expenses',
    whyPoint2: 'Reduce random decisions',
    whyPoint3: 'Connect learning to THE SFM tools',
    readTheory: 'Read Theory',
    hideTheory: 'Hide Theory',
    keyTakeaway: 'Key Takeaway',
    educationalExample: 'Educational Example',
    examples: 'Examples',
    details: 'Explanation',
    relatedSfmTool: 'Related SFM Tool',
    applyInSfm: 'How to apply it in THE SFM',
    openTool: 'Open Tool',
    useNow: 'Use Now',
    available: 'Available',
    comingSoon: 'Coming Soon',
    bestTitle: 'Best Theories inside THE SFM',
    bestSubtitle: 'These theories map most closely to THE SFM tools and help turn learning into practical steps.',
    applyInsideSfm: 'Apply inside SFM',
    practicalTitle: 'Practical Examples',
    practicalSubtitle: 'Educational examples only. They do not show user data or results from your account.',
    scenario: 'Scenario',
    lesson: 'Lesson',
    relatedTheory: 'Related Theory',
    smartToolsTitle: 'Smart Tools and Calculators',
    smartToolsSubtitle: 'Practical tools connected to financial theories to help you make clearer decisions.',
    status: 'Status',
    noResults: 'No matching theories.',
    noResultsDescription: 'Try another search or choose a different category.',
    ctaTitle: 'Start applying theories to your financial life',
    ctaSubtitle: 'Turn learning into practical steps inside THE SFM through income, expenses, goals, and investments.',
    openDashboard: 'Open Dashboard',
    openGoals: 'Open Financial Goals',
    openTools: 'Open Tools',
    educationNote: 'This page is educational and is not personal financial advice.',
  },
  fr: {
    title: 'Théories financières',
    subtitle: 'Apprenez clairement les concepts financiers clés, puis appliquez-les à vos revenus, dépenses, épargne, investissements et décisions dans THE SFM.',
    badge: 'Bibliothèque financière intelligente',
    startNow: 'Commencer',
    exploreTools: 'Explorer les outils',
    showBest: 'Voir les meilleures théories',
    searchPlaceholder: 'Rechercher une théorie financière...',
    searchLabel: 'Rechercher des théories financières',
    categories: 'Catégories',
    theoryLibrary: 'Bibliothèque des théories financières',
    theoryLibrarySubtitle: 'Choisissez une catégorie ou recherchez un concept, puis ouvrez seulement la théorie à étudier.',
    whyTitle: 'Pourquoi comprendre les théories financières ?',
    whyBody: 'Les théories financières aident à prendre de meilleures décisions, comprendre les risques, organiser revenus et dépenses, et bâtir un plan plus clair.',
    whyPoint1: 'Organiser revenus et dépenses',
    whyPoint2: 'Réduire les décisions aléatoires',
    whyPoint3: 'Relier l’apprentissage aux outils THE SFM',
    readTheory: 'Lire la théorie',
    hideTheory: 'Masquer',
    keyTakeaway: 'À retenir',
    educationalExample: 'Exemple éducatif',
    examples: 'Exemples',
    details: 'Explication',
    relatedSfmTool: 'Outil SFM lié',
    applyInSfm: 'Comment l’appliquer dans THE SFM',
    openTool: 'Ouvrir l’outil',
    useNow: 'Utiliser',
    available: 'Disponible',
    comingSoon: 'Bientôt',
    bestTitle: 'Meilleures théories dans THE SFM',
    bestSubtitle: 'Ces théories sont les plus proches des outils THE SFM et transforment l’apprentissage en actions.',
    applyInsideSfm: 'Appliquer dans SFM',
    practicalTitle: 'Exemples pratiques',
    practicalSubtitle: 'Exemples éducatifs uniquement. Ils ne montrent pas de données utilisateur ni de résultats de votre compte.',
    scenario: 'Situation',
    lesson: 'Leçon',
    relatedTheory: 'Théorie liée',
    smartToolsTitle: 'Outils et calculateurs intelligents',
    smartToolsSubtitle: 'Des outils pratiques liés aux théories financières pour prendre des décisions plus claires.',
    status: 'Statut',
    noResults: 'Aucune théorie correspondante.',
    noResultsDescription: 'Essayez une autre recherche ou choisissez une catégorie différente.',
    ctaTitle: 'Commencez à appliquer les théories à votre situation financière',
    ctaSubtitle: 'Transformez l’apprentissage en étapes pratiques dans THE SFM avec revenus, dépenses, objectifs et investissements.',
    openDashboard: 'Ouvrir le tableau',
    openGoals: 'Ouvrir les objectifs',
    openTools: 'Ouvrir les outils',
    educationNote: 'Cette page est éducative et ne constitue pas un conseil financier personnel.',
  },
};

const SUMMARY_STATS: Array<{ label: LocalizedText; value: string; icon: typeof BookOpen }> = [
  {
    value: '15',
    label: { ar: 'نظرية مالية', en: 'Financial Theories', fr: 'Théories financières' },
    icon: BookOpen,
  },
  {
    value: '8',
    label: { ar: 'نظريات أساسية', en: 'Core Theories', fr: 'Théories clés' },
    icon: Sparkles,
  },
  {
    value: '5',
    label: { ar: 'أدوات ذكية', en: 'Smart Tools', fr: 'Outils intelligents' },
    icon: Calculator,
  },
  {
    value: '6',
    label: { ar: 'أمثلة عملية', en: 'Practical Examples', fr: 'Exemples pratiques' },
    icon: Lightbulb,
  },
];

const PRACTICAL_EXAMPLES: Array<{
  title: LocalizedText;
  scenario: LocalizedText;
  lesson: LocalizedText;
  theoryId: string;
}> = [
  {
    theoryId: 'personal-budgeting',
    title: {
      ar: 'تقسيم الراتب بدون عشوائية',
      en: 'Split salary without randomness',
      fr: 'Répartir le salaire sans hasard',
    },
    scenario: {
      ar: 'بدل أن يبدأ الشهر بدون خطة، يتم تقسيم الدخل إلى احتياجات، رغبات، وادخار قبل الصرف.',
      en: 'Instead of starting the month without a plan, income is split into needs, wants, and saving before spending.',
      fr: 'Au lieu de commencer le mois sans plan, le revenu est réparti en besoins, envies et épargne avant de dépenser.',
    },
    lesson: {
      ar: 'الميزانية تحول الراتب إلى خطة واضحة.',
      en: 'Budgeting turns salary into a clear plan.',
      fr: 'Le budget transforme le salaire en plan clair.',
    },
  },
  {
    theoryId: 'smart-goals',
    title: {
      ar: 'هدف مالي يتحول إلى خطة',
      en: 'A financial goal becomes a plan',
      fr: 'Un objectif financier devient un plan',
    },
    scenario: {
      ar: 'بدل عبارة عامة مثل “أبي أوفر”، يتم تحديد مبلغ ومدة وخطوة شهرية.',
      en: 'Instead of “I want to save,” define an amount, deadline, and monthly action.',
      fr: 'Au lieu de “je veux économiser”, définissez un montant, un délai et une action mensuelle.',
    },
    lesson: {
      ar: 'الهدف بدون رقم ومدة يبقى أمنية.',
      en: 'A goal without amount and time remains a wish.',
      fr: 'Un objectif sans montant ni délai reste un souhait.',
    },
  },
  {
    theoryId: 'opportunity-cost',
    title: {
      ar: 'قرار شراء له تكلفة فرصة',
      en: 'A purchase has opportunity cost',
      fr: 'Un achat a un coût d’opportunité',
    },
    scenario: {
      ar: 'أي مبلغ يصرف على رغبة اليوم قد يكون فرصة ضائعة لهدف أو ادخار أو استثمار.',
      en: 'Money spent on a want today may be a missed chance for a goal, saving, or investment.',
      fr: 'L’argent dépensé aujourd’hui pour une envie peut être une occasion manquée pour un objectif, une épargne ou un investissement.',
    },
    lesson: {
      ar: 'اسأل: شنو الخيار الثاني الأفضل لهذا المبلغ؟',
      en: 'Ask: what is the next best use of this money?',
      fr: 'Demandez : quelle est la meilleure autre utilisation de cet argent ?',
    },
  },
  {
    theoryId: 'emergency-fund',
    title: {
      ar: 'صندوق طوارئ محسوب',
      en: 'A calculated emergency fund',
      fr: 'Un fonds d’urgence calculé',
    },
    scenario: {
      ar: 'يتم تقدير صندوق الطوارئ بناءً على مصروفات شهرية معروفة، وليس رقماً عشوائياً.',
      en: 'The emergency fund is estimated from known monthly expenses, not a random number.',
      fr: 'Le fonds d’urgence est estimé à partir de dépenses mensuelles connues, pas d’un chiffre aléatoire.',
    },
    lesson: {
      ar: 'الاحتياط المالي يحمي الخطة من المفاجآت.',
      en: 'A reserve protects the plan from surprises.',
      fr: 'Une réserve protège le plan contre les imprévus.',
    },
  },
  {
    theoryId: 'reduce-bad-debt',
    title: {
      ar: 'تقليل دين سيئ',
      en: 'Reduce harmful debt',
      fr: 'Réduire une mauvaise dette',
    },
    scenario: {
      ar: 'قبل الدخول في دين جديد، تتم مقارنة فائدته بضغطه على الميزانية الشهرية.',
      en: 'Before taking new debt, compare its benefit with its pressure on the monthly budget.',
      fr: 'Avant une nouvelle dette, comparez son bénéfice à sa pression sur le budget mensuel.',
    },
    lesson: {
      ar: 'الدين الجيد يحتاج خطة سداد واضحة.',
      en: 'Useful debt still needs a clear repayment plan.',
      fr: 'Même une dette utile demande un plan de remboursement clair.',
    },
  },
  {
    theoryId: 'long-term-investing',
    title: {
      ar: 'استثمار طويل المدى',
      en: 'Long-term investing',
      fr: 'Investissement à long terme',
    },
    scenario: {
      ar: 'بدل محاولة توقيت السوق، يتم التركيز على الصبر، التوزيع، والاستمرار.',
      en: 'Instead of timing the market, focus on patience, diversification, and consistency.',
      fr: 'Au lieu de prévoir le marché, concentrez-vous sur patience, diversification et régularité.',
    },
    lesson: {
      ar: 'الاستثمار الحقيقي يحتاج وقت وانضباط.',
      en: 'Real investing needs time and discipline.',
      fr: 'Un vrai investissement demande du temps et de la discipline.',
    },
  },
];

function localeFrom(value: string): FinancialTheoryLang {
  return value === 'en' || value === 'fr' ? value : 'ar';
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function relatedTheory(id: string) {
  return FINANCIAL_THEORIES.find(theory => theory.id === id);
}

function applyCopy(lang: FinancialTheoryLang, tool: string) {
  if (lang === 'en') {
    return `Use ${tool} as the practical workspace for this idea when your real data is available.`;
  }
  if (lang === 'fr') {
    return `Utilisez ${tool} comme espace pratique pour cette idée lorsque vos données réelles sont disponibles.`;
  }
  return `استخدم ${tool} كمساحة عملية لتطبيق هذه الفكرة عندما تكون بياناتك الحقيقية متوفرة.`;
}

function TheoryCard({
  theory,
  lang,
  text,
  isOpen,
  onToggle,
}: {
  theory: FinancialTheory;
  lang: FinancialTheoryLang;
  text: Record<string, string>;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = THEORY_ICONS[(theory.number - 1) % THEORY_ICONS.length];
  const title = getFinancialTheoryText(theory.title, lang);
  const short = getFinancialTheoryText(theory.short, lang);
  const category = FINANCIAL_THEORY_CATEGORIES.find(item => item.id === theory.category);
  const categoryLabel = category ? getFinancialTheoryText(category.label, lang) : '';
  const takeaway = getFinancialTheoryText(theory.keyTakeaway, lang);
  const tool = getFinancialTheoryText(theory.sfmTool, lang);
  const detailId = `theory-details-${theory.id}`;
  const examples = theory.examples?.[lang] ?? [];
  const rows = theory.tableRows?.[lang] ?? [];

  return (
    <article className={`theory-card ${isOpen ? 'expanded' : ''}`}>
      <div className="theory-card-head">
        <span className="theory-number">{String(theory.number).padStart(2, '0')}</span>
        <span className="theory-icon" aria-hidden="true"><Icon size={22} /></span>
        <div>
          <span className="theory-category">{categoryLabel}</span>
          <h3>{title}</h3>
        </div>
      </div>

      <p className="theory-short">{short}</p>

      <div className="theory-meta-row">
        <span>{text.keyTakeaway}</span>
        <strong>{takeaway}</strong>
      </div>

      <div className="theory-tool-pill">
        <span>{text.relatedSfmTool}</span>
        <strong>{tool}</strong>
      </div>

      <div className="theory-actions">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={detailId}
          onClick={onToggle}
        >
          {isOpen ? text.hideTheory : text.readTheory}
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {theory.sfmToolHref ? (
          <Link href={theory.sfmToolHref} aria-label={`${text.openTool}: ${tool}`}>
            {text.openTool}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <span className="coming-soon-pill">{text.comingSoon}</span>
        )}
      </div>

      <div id={detailId} className="theory-details" hidden={!isOpen}>
        <div className="detail-block">
          <h4>{text.details}</h4>
          {theory.details[lang].map(line => <p key={line}>{line}</p>)}
        </div>

        {examples.length > 0 ? (
          <div className="detail-block">
            <h4>{text.educationalExample}</h4>
            <ul>
              {examples.map(example => <li key={example}>{example}</li>)}
            </ul>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <div className="detail-block table-block">
            <table>
              <tbody>
                {rows.map(row => (
                  <tr key={`${row.label}-${row.value}`}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="detail-block tool-block">
          <h4>{text.applyInSfm}</h4>
          <p>{applyCopy(lang, tool)}</p>
        </div>
      </div>
    </article>
  );
}

export default function FinancialTheoriesPage() {
  const { lang, dir } = useLanguage();
  const locale = localeFrom(lang);
  const text = UI_COPY[locale];
  const [activeCategory, setActiveCategory] = useState<FinancialTheoryCategoryId>('all');
  const [query, setQuery] = useState('');
  const [openTheory, setOpenTheory] = useState<string | null>(null);

  const categoryTabs: PageTabItem[] = useMemo(() => (
    FINANCIAL_THEORY_CATEGORIES.map(category => ({
      id: category.id,
      label: getFinancialTheoryText(category.label, locale),
      count: category.id === 'all'
        ? FINANCIAL_THEORIES.length
        : FINANCIAL_THEORIES.filter(theory => theory.category === category.id).length,
    }))
  ), [locale]);

  const filteredTheories = useMemo(() => {
    const normalizedQuery = normalize(query);
    return FINANCIAL_THEORIES.filter(theory => {
      const matchesCategory = activeCategory === 'all' || theory.category === activeCategory;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        theory.number.toString(),
        getFinancialTheoryText(theory.title, locale),
        getFinancialTheoryText(theory.short, locale),
        getFinancialTheoryText(theory.keyTakeaway, locale),
        getFinancialTheoryText(theory.sfmTool, locale),
        ...theory.details[locale],
        ...(theory.examples?.[locale] ?? []),
      ].join(' ');
      return normalize(haystack).includes(normalizedQuery);
    });
  }, [activeCategory, locale, query]);

  const featuredTheories = useMemo(() => (
    FEATURED_FINANCIAL_THEORIES
      .map(item => {
        const theory = relatedTheory(item.theoryId);
        return theory ? { theory, why: item.why } : null;
      })
      .filter(Boolean) as Array<{ theory: FinancialTheory; why: LocalizedText }>
  ), []);

  return (
    <div className="financial-theories-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.title} contentClassName="financial-theories-content">
        <div className="sfm-page-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <PageHero
          className="financial-theories-hero"
          eyebrow={text.badge}
          title={text.title}
          subtitle={text.subtitle}
          icon={<GraduationCap size={30} />}
          status={<span className="hero-note">{text.educationNote}</span>}
          actions={(
            <>
              <a className="theory-primary-link" href="#theory-library">{text.startNow}</a>
              <a className="theory-secondary-link" href="#smart-tools">{text.exploreTools}</a>
              <a className="theory-secondary-link" href="#featured-theories">{text.showBest}</a>
            </>
          )}
        />

        <section className="learning-overview" aria-labelledby="why-theories-matter">
          <StatGrid className="learning-stats-grid">
            {SUMMARY_STATS.map(stat => {
              const Icon = stat.icon;
              return (
                <AppCard key={getFinancialTheoryText(stat.label, locale)} className="theory-stat-card">
                  <span aria-hidden="true"><Icon size={20} /></span>
                  <div>
                    <strong>{stat.value}</strong>
                    <p>{getFinancialTheoryText(stat.label, locale)}</p>
                  </div>
                </AppCard>
              );
            })}
          </StatGrid>

          <AppCard className="why-card">
            <div className="why-icon" aria-hidden="true"><Brain size={26} /></div>
            <div className="why-copy">
              <span>{text.educationNote}</span>
              <h2 id="why-theories-matter">{text.whyTitle}</h2>
              <p>{text.whyBody}</p>
            </div>
            <ul className="why-list">
              {[text.whyPoint1, text.whyPoint2, text.whyPoint3].map(point => (
                <li key={point}>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </AppCard>
        </section>

        <section id="theory-library" className="theory-section library-section section-panel" aria-labelledby="theory-library-title">
          <div className="theory-section-head">
            <span>{text.categories}</span>
            <h2 id="theory-library-title">{text.theoryLibrary}</h2>
            <p>{text.theoryLibrarySubtitle}</p>
          </div>

          <div className="theory-controls">
            <label className="theory-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">{text.searchLabel}</span>
              <input
                type="search"
                value={query}
                placeholder={text.searchPlaceholder}
                onChange={event => {
                  setQuery(event.target.value);
                  setOpenTheory(null);
                }}
              />
            </label>

            <PageTabs
              tabs={categoryTabs}
              active={activeCategory}
              onChange={id => {
                setActiveCategory(id as FinancialTheoryCategoryId);
                setOpenTheory(null);
              }}
              ariaLabel={text.categories}
              className="financial-theory-tabs"
            />
          </div>

          {filteredTheories.length > 0 ? (
            <div className="theory-grid">
              {filteredTheories.map(theory => (
                <TheoryCard
                  key={theory.id}
                  theory={theory}
                  lang={locale}
                  text={text}
                  isOpen={openTheory === theory.id}
                  onToggle={() => setOpenTheory(current => current === theory.id ? null : theory.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen size={28} />}
              title={text.noResults}
              description={text.noResultsDescription}
            />
          )}
        </section>

        <section id="featured-theories" className="theory-section featured-section section-panel" aria-labelledby="featured-theories-title">
          <div className="theory-section-head">
            <span>{text.relatedSfmTool}</span>
            <h2 id="featured-theories-title">{text.bestTitle}</h2>
            <p>{text.bestSubtitle}</p>
          </div>

          <CardsGrid className="featured-theory-grid">
            {featuredTheories.map(({ theory, why }) => {
              const tool = getFinancialTheoryText(theory.sfmTool, locale);
              return (
                <AppCard key={theory.id} className="featured-theory-card">
                  <span className="featured-index">{String(theory.number).padStart(2, '0')}</span>
                  <h3>{getFinancialTheoryText(theory.title, locale)}</h3>
                  <p>{getFinancialTheoryText(why, locale)}</p>
                  <div className="featured-tool">
                    <small>{text.relatedSfmTool}</small>
                    <strong>{tool}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('all');
                      setQuery('');
                      setOpenTheory(theory.id);
                      document.getElementById('theory-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    aria-label={`${text.readTheory}: ${getFinancialTheoryText(theory.title, locale)}`}
                  >
                    {text.readTheory}
                  </button>
                </AppCard>
              );
            })}
          </CardsGrid>
        </section>

        <section className="theory-section examples-section section-panel" aria-labelledby="practical-examples-title">
          <div className="theory-section-head">
            <span>{text.educationalExample}</span>
            <h2 id="practical-examples-title">{text.practicalTitle}</h2>
            <p>{text.practicalSubtitle}</p>
          </div>

          <CardsGrid className="examples-grid">
            {PRACTICAL_EXAMPLES.map(example => {
              const theory = relatedTheory(example.theoryId);
              return (
                <AppCard key={getFinancialTheoryText(example.title, locale)} className="practical-example-card">
                  <span className="example-label">
                    <Lightbulb size={16} aria-hidden="true" />
                    {text.educationalExample}
                  </span>
                  <h3>{getFinancialTheoryText(example.title, locale)}</h3>
                  <div>
                    <small>{text.scenario}</small>
                    <p>{getFinancialTheoryText(example.scenario, locale)}</p>
                  </div>
                  <div>
                    <small>{text.lesson}</small>
                    <p>{getFinancialTheoryText(example.lesson, locale)}</p>
                  </div>
                  {theory ? (
                    <strong>{text.relatedTheory}: {getFinancialTheoryText(theory.title, locale)}</strong>
                  ) : null}
                </AppCard>
              );
            })}
          </CardsGrid>
        </section>

        <section id="smart-tools" className="theory-section tools-section section-panel" aria-labelledby="smart-tools-title">
          <div className="theory-section-head">
            <span>{text.smartToolsTitle}</span>
            <h2 id="smart-tools-title">{text.smartToolsTitle}</h2>
            <p>{text.smartToolsSubtitle}</p>
          </div>

          <CardsGrid className="tools-grid">
            {FINANCIAL_THEORY_TOOLS.map((tool, index) => {
              const Icon = [Calculator, Landmark, ShieldAlert, Target, Gauge][index] ?? Calculator;
              const title = getFinancialTheoryText(tool.title, locale);
              const available = Boolean(tool.href);
              return (
                <AppCard key={tool.id} className="smart-tool-card">
                  <div className="smart-tool-top">
                    <div className="smart-tool-icon" aria-hidden="true"><Icon size={22} /></div>
                    <span className={available ? 'status available' : 'status soon'}>
                      {available ? text.available : text.comingSoon}
                    </span>
                  </div>
                  <h3>{title}</h3>
                  <p>{getFinancialTheoryText(tool.description, locale)}</p>
                  {tool.href ? (
                    <Link href={tool.href} aria-label={`${text.useNow}: ${title}`}>
                      {text.useNow}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  ) : (
                    <button type="button" disabled aria-label={`${title}: ${text.comingSoon}`}>
                      {text.comingSoon}
                    </button>
                  )}
                </AppCard>
              );
            })}
          </CardsGrid>
        </section>

        <section className="theories-cta" aria-labelledby="financial-theories-cta-title">
          <div>
            <span>{text.badge}</span>
            <h2 id="financial-theories-cta-title">{text.ctaTitle}</h2>
            <p>{text.ctaSubtitle}</p>
          </div>
          <div className="cta-actions">
            <Link href="/dashboard">{text.openDashboard}</Link>
            <Link href="/goals">{text.openGoals}</Link>
            <a href="#smart-tools">{text.openTools}</a>
          </div>
        </section>
      </DashboardPageShell>

      <style jsx>{`
        .financial-theories-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 12% 8%, rgba(29, 140, 255, .10), transparent 32%),
            linear-gradient(160deg, var(--sfm-background) 0%, #F8FBFF 58%, #E7F1FF 100%);
          color: var(--sfm-foreground);
          overflow-x: clip;
          scroll-behavior: smooth;
        }

        .financial-theories-content {
          display: grid;
          gap: 14px;
          min-width: 0;
        }

        :global(.financial-theories-hero) {
          position: relative;
          overflow: hidden;
          min-height: 220px;
          padding: 26px !important;
          align-items: center !important;
        }

        :global(.financial-theories-hero)::before {
          content: '';
          position: absolute;
          inset: 18px 22px auto auto;
          width: min(360px, 42%);
          height: 138px;
          opacity: .42;
          border-radius: 999px;
          background:
            repeating-linear-gradient(
              150deg,
              rgba(167, 243, 240, .2) 0 2px,
              transparent 2px 22px
            );
          transform: rotate(-7deg);
          pointer-events: none;
        }

        .hero-note {
          display: inline-flex;
          max-width: 330px;
          border-radius: 14px;
          border: 1px solid rgba(167, 243, 240, .18);
          background: rgba(255, 255, 255, .08);
          color: #D9ECFF;
          padding: 9px 11px;
          line-height: 1.55;
          font-size: 12px;
          font-weight: 900;
        }

        .theory-primary-link,
        .theory-secondary-link,
        .featured-theory-card button,
        .smart-tool-card a,
        .smart-tool-card button,
        .cta-actions a {
          min-height: 40px;
          border-radius: 13px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: 950 13px Tajawal, Arial, sans-serif;
          text-decoration: none;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease, color .18s ease;
          white-space: nowrap;
        }

        .theory-primary-link,
        .featured-theory-card button,
        .cta-actions a:first-child {
          border: 0;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          box-shadow: 0 16px 38px rgba(24, 212, 212, .24);
        }

        .theory-secondary-link,
        .cta-actions a {
          border: 1px solid rgba(167, 243, 240, .25);
          background: rgba(255, 255, 255, .09);
          color: #EAF6FF;
        }

        .theory-primary-link:hover,
        .theory-secondary-link:hover,
        .featured-theory-card button:hover,
        .smart-tool-card a:hover,
        .cta-actions a:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 44px rgba(24, 212, 212, .24);
        }

        .learning-overview {
          display: grid;
          grid-template-columns: minmax(250px, .42fr) minmax(0, 1fr);
          gap: 12px;
          align-items: stretch;
          min-width: 0;
        }

        .learning-stats-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 10px !important;
          align-content: stretch;
        }

        .theory-stat-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 10px;
          min-height: 74px;
          padding: 12px !important;
        }

        .theory-stat-card > span,
        .why-icon,
        .theory-icon,
        .smart-tool-icon {
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
          border: 1px solid rgba(29, 140, 255, .13);
        }

        .theory-stat-card > span {
          width: 38px;
          height: 38px;
          border-radius: 13px;
        }

        .theory-stat-card strong {
          display: block;
          color: var(--sfm-midnight);
          font-size: 23px;
          line-height: 1;
        }

        .theory-stat-card p {
          margin: 3px 0 0;
          color: var(--sfm-muted-readable);
          font-weight: 900;
          line-height: 1.25;
          font-size: 12px;
        }

        .why-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) minmax(260px, .72fr);
          gap: 14px;
          align-items: center;
          padding: 16px !important;
          background:
            radial-gradient(circle at 0% 0%, rgba(24, 212, 212, .16), transparent 30%),
            var(--sfm-card) !important;
        }

        .why-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
        }

        .why-copy span,
        .theory-section-head span {
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
        }

        .why-copy h2,
        .theory-section-head h2,
        .theories-cta h2 {
          margin: 6px 0;
          color: var(--sfm-midnight);
          font-size: clamp(22px, 2.6vw, 30px);
          line-height: 1.15;
        }

        .why-copy p,
        .theory-section-head p,
        .theories-cta p {
          margin: 0;
          color: var(--sfm-muted-readable);
          line-height: 1.7;
          font-weight: 780;
        }

        .why-list {
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
          list-style: none;
        }

        .why-list li {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 9px;
          align-items: center;
          border: 1px solid rgba(24, 212, 212, .16);
          border-radius: 13px;
          background: rgba(24, 212, 212, .07);
          padding: 8px 10px;
          color: var(--sfm-primary-dark);
          font-weight: 900;
        }

        .why-list svg {
          color: var(--sfm-success);
        }

        .theory-section {
          display: grid;
          gap: 12px;
          min-width: 0;
          scroll-margin-top: 22px;
        }

        .section-panel {
          border: 1px solid rgba(29, 140, 255, .12);
          border-radius: 26px;
          background: rgba(255, 255, 255, .55);
          box-shadow: 0 14px 34px rgba(3, 18, 37, .045);
          padding: 16px;
        }

        .theory-section-head {
          max-width: 860px;
          min-width: 0;
        }

        .theory-controls {
          display: grid;
          grid-template-columns: minmax(240px, .36fr) minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          min-width: 0;
          border: 1px solid rgba(29, 140, 255, .13);
          border-radius: 18px;
          background: rgba(255, 255, 255, .72);
          padding: 10px;
          box-shadow: 0 12px 30px rgba(3, 18, 37, .05);
        }

        .theory-search {
          min-width: 0;
          min-height: 42px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          border: 1px solid rgba(29, 140, 255, .18);
          border-radius: 14px;
          background: #FFFFFF;
          color: var(--sfm-primary-hover);
          padding: 0 14px;
        }

        .theory-search input {
          min-width: 0;
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--sfm-midnight);
          font: 900 14px Tajawal, Arial, sans-serif;
        }

        .theory-search input::placeholder {
          color: var(--sfm-muted);
          opacity: .9;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        :global(.financial-theory-tabs) {
          padding-bottom: 0 !important;
        }

        .theory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
          gap: 12px;
          align-items: start;
          min-width: 0;
        }

        .theory-card {
          position: relative;
          display: grid;
          gap: 10px;
          min-width: 0;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(29, 140, 255, .14);
          background: var(--sfm-card);
          box-shadow: 0 10px 26px rgba(3, 18, 37, .055);
          overflow: hidden;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }

        .theory-card:hover,
        .theory-card.expanded {
          border-color: rgba(24, 212, 212, .35);
          box-shadow: 0 18px 42px rgba(3, 18, 37, .10);
          transform: translateY(-2px);
        }

        .theory-card-head {
          display: grid;
          grid-template-columns: auto auto minmax(0, 1fr);
          gap: 9px;
          align-items: start;
          min-width: 0;
        }

        .theory-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: var(--sfm-midnight);
          color: var(--sfm-soft-cyan);
          font-size: 13px;
          font-weight: 950;
          box-shadow: inset 0 -2px 0 rgba(24, 212, 212, .28);
        }

        .theory-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
        }

        .theory-category {
          display: inline-flex;
          width: fit-content;
          max-width: 100%;
          border-radius: 999px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary-hover);
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 950;
          line-height: 1;
          overflow-wrap: anywhere;
        }

        .theory-card h3 {
          margin: 8px 0 0;
          color: var(--sfm-midnight);
          font-size: 17px;
          line-height: 1.3;
        }

        .theory-short {
          margin: 0;
          color: var(--sfm-muted-readable);
          line-height: 1.62;
          font-weight: 780;
        }

        .theory-meta-row {
          min-width: 0;
          border: 1px solid rgba(24, 212, 212, .14);
          border-radius: 13px;
          background: rgba(24, 212, 212, .065);
          padding: 9px 10px;
        }

        .theory-meta-row span,
        .theory-tool-pill span,
        .featured-tool small,
        .practical-example-card small {
          display: block;
          color: var(--sfm-muted);
          font-size: 11px;
          font-weight: 950;
          margin-bottom: 3px;
        }

        .theory-meta-row strong,
        .theory-tool-pill strong {
          display: block;
          color: var(--sfm-primary-dark);
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .theory-tool-pill {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
          border-radius: 999px;
          border: 1px solid rgba(29, 140, 255, .12);
          background: rgba(29, 140, 255, .055);
          padding: 8px 10px;
        }

        .theory-tool-pill span {
          margin: 0;
          flex: 0 0 auto;
        }

        .theory-tool-pill strong {
          min-width: 0;
          text-align: end;
          font-size: 12px;
        }

        .theory-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
        }

        .theory-actions button,
        .theory-actions a,
        .coming-soon-pill {
          min-height: 36px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 12px;
          font: 950 12px Tajawal, Arial, sans-serif;
          text-decoration: none;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease, color .18s ease;
        }

        .theory-actions button {
          border: 0;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          cursor: pointer;
        }

        .theory-actions button svg {
          transition: transform .18s ease;
        }

        .theory-card.expanded .theory-actions button svg {
          transform: rotate(180deg);
        }

        .theory-actions a {
          border: 1px solid rgba(29, 140, 255, .18);
          background: var(--sfm-light-card);
          color: var(--sfm-midnight);
        }

        .coming-soon-pill {
          border: 1px dashed rgba(29, 140, 255, .22);
          background: rgba(29, 140, 255, .07);
          color: var(--sfm-primary-hover);
        }

        .theory-actions button:hover,
        .theory-actions a:hover {
          transform: translateY(-1px);
          border-color: rgba(24, 212, 212, .34);
          box-shadow: 0 10px 28px rgba(3, 18, 37, .08);
        }

        .theory-details {
          display: grid;
          gap: 12px;
          border-top: 1px solid rgba(29, 140, 255, .12);
          padding-top: 14px;
        }

        .theory-details[hidden] {
          display: none;
        }

        .detail-block {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .detail-block h4 {
          margin: 0;
          color: var(--sfm-midnight);
          font-size: 15px;
        }

        .detail-block p,
        .detail-block li {
          margin: 0;
          color: var(--sfm-muted-readable);
          line-height: 1.72;
          font-weight: 760;
        }

        .detail-block ul {
          margin: 0;
          padding-inline-start: 20px;
          display: grid;
          gap: 7px;
        }

        .detail-block table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 8px;
        }

        .detail-block th,
        .detail-block td {
          border: 1px solid rgba(29, 140, 255, .12);
          background: var(--sfm-light-card);
          color: var(--sfm-primary-dark);
          padding: 10px 12px;
          text-align: start;
          line-height: 1.55;
        }

        .detail-block th {
          width: 104px;
          border-radius: 13px;
          color: var(--sfm-primary-hover);
          white-space: nowrap;
        }

        .detail-block td {
          border-radius: 13px;
          font-weight: 850;
        }

        .tool-block {
          border-radius: 16px;
          background: rgba(29, 140, 255, .07);
          border: 1px solid rgba(29, 140, 255, .12);
          padding: 12px;
        }

        .featured-theory-grid,
        .examples-grid,
        .tools-grid {
          align-items: stretch;
          grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)) !important;
          gap: 12px !important;
        }

        .featured-theory-card,
        .smart-tool-card,
        .practical-example-card {
          display: grid;
          align-content: start;
          gap: 9px;
          min-width: 0;
          padding: 14px !important;
        }

        .featured-index {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: var(--sfm-midnight);
          color: var(--sfm-soft-cyan);
          font-weight: 950;
          font-size: 12px;
        }

        .featured-theory-card h3,
        .smart-tool-card h3,
        .practical-example-card h3 {
          margin: 0;
          color: var(--sfm-midnight);
          font-size: 16px;
          line-height: 1.35;
        }

        .featured-theory-card p,
        .smart-tool-card p,
        .practical-example-card p {
          margin: 0;
          color: var(--sfm-muted-readable);
          line-height: 1.6;
          font-weight: 780;
        }

        .featured-tool {
          display: grid;
          gap: 4px;
          margin-top: auto;
          border-radius: 13px;
          border: 1px solid rgba(29, 140, 255, .12);
          background: rgba(29, 140, 255, .06);
          padding: 8px 9px;
        }

        .featured-tool strong {
          color: var(--sfm-primary-dark);
          line-height: 1.45;
        }

        .featured-theory-card button {
          width: fit-content;
          cursor: pointer;
        }

        .example-label {
          width: fit-content;
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          border: 1px solid rgba(24, 212, 212, .18);
          background: rgba(24, 212, 212, .09);
          color: var(--sfm-primary-hover);
          padding: 0 10px;
          font-size: 11px;
          font-weight: 950;
        }

        .practical-example-card strong {
          margin-top: auto;
          color: var(--sfm-primary-dark);
          line-height: 1.55;
          font-size: 13px;
        }

        .smart-tool-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .smart-tool-icon {
          width: 40px;
          height: 40px;
          border-radius: 14px;
        }

        .status {
          min-height: 26px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0 10px;
          font-size: 11px;
          font-weight: 950;
        }

        .status.available {
          background: rgba(22, 163, 74, .1);
          color: #15803D;
          border: 1px solid rgba(22, 163, 74, .18);
        }

        .status.soon {
          background: rgba(245, 158, 11, .11);
          color: #B45309;
          border: 1px solid rgba(245, 158, 11, .18);
        }

        .smart-tool-card a,
        .smart-tool-card button {
          width: fit-content;
          margin-top: auto;
        }

        .smart-tool-card a {
          border: 1px solid rgba(29, 140, 255, .18);
          background: var(--sfm-light-card);
          color: var(--sfm-midnight);
        }

        .smart-tool-card button {
          border: 1px dashed rgba(29, 140, 255, .22);
          background: rgba(29, 140, 255, .07);
          color: var(--sfm-primary-hover);
          cursor: not-allowed;
        }

        .theories-cta {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          border-radius: 24px;
          padding: 22px;
          color: #EAF6FF;
          background:
            radial-gradient(circle at 14% 14%, rgba(24, 212, 212, .22), transparent 30%),
            linear-gradient(135deg, #031225, #061B33 56%, #0B2748);
          box-shadow: 0 24px 70px rgba(3, 18, 37, .18);
        }

        .theories-cta span {
          color: #A7F3F0;
          font-size: 12px;
          font-weight: 950;
        }

        .theories-cta h2 {
          color: #FFFFFF;
        }

        .theories-cta p {
          color: #D9ECFF;
        }

        .cta-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 9px;
        }

        .cta-actions a {
          color: #EAF6FF;
        }

        a:focus-visible,
        button:focus-visible,
        input:focus-visible {
          outline: 3px solid rgba(24, 212, 212, .56);
          outline-offset: 3px;
        }

        @media (min-width: 1320px) {
          .theory-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1024px) {
          .learning-overview,
          .why-card,
          .theories-cta {
            grid-template-columns: 1fr;
          }

          .cta-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 720px) {
          .financial-theories-content {
            gap: 16px;
          }

          :global(.financial-theories-hero) {
            min-height: auto;
            padding: 22px !important;
          }

          :global(.financial-theories-hero)::before {
            width: 80%;
            opacity: .24;
          }

          .theory-primary-link,
          .theory-secondary-link,
          .theory-actions button,
          .theory-actions a,
          .coming-soon-pill,
          .smart-tool-card a,
          .smart-tool-card button,
          .featured-theory-card button,
          .cta-actions a {
            width: 100%;
          }

          .theory-card-head {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .theory-controls {
            grid-template-columns: 1fr;
          }

          .section-panel {
            padding: 12px;
            border-radius: 22px;
          }

          .learning-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .theory-icon {
            display: none;
          }

          .theory-grid {
            grid-template-columns: 1fr;
          }

          .detail-block table,
          .detail-block tbody,
          .detail-block tr,
          .detail-block th,
          .detail-block td {
            display: block;
            width: 100%;
          }

          .detail-block tr {
            display: grid;
            gap: 4px;
            margin-bottom: 8px;
          }

          .smart-tool-top {
            align-items: flex-start;
          }

          .theory-tool-pill {
            align-items: flex-start;
            border-radius: 14px;
            flex-direction: column;
          }

          .theory-tool-pill strong {
            text-align: start;
          }
        }

        @media (max-width: 460px) {
          .learning-stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
