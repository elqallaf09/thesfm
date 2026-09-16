import Link from 'next/link';

type Locale = 'ar' | 'en' | 'fr';

type LocalizedCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  primaryCta: string;
  zakatCta: string;
  featuresTitle: string;
  features: readonly string[];
  pricingTitle: string;
  individualMonthly: string;
  individualAnnual: string;
  companyAnnual: string;
  toolsTitle: string;
  tools: readonly [string, string][];
  securityTitle: string;
  security: readonly string[];
  faqTitle: string;
  faq: readonly [string, string][];
  disclaimer: string;
};

const COPY: Record<Locale, LocalizedCopy> = {
  ar: {
    eyebrow: 'ذكاء مالي مبني للخليج',
    title: 'أدِر أموالك وزكاتك واستثماراتك ومشاريعك من مكان واحد — بالعربي.',
    intro: 'THE SFM منصة مالية واقتصادية تجمع إدارة المال الشخصي والاستثمارات والزكاة والمشاريع والتقارير في تجربة واحدة واضحة، مع فصل صريح بين بياناتك الحقيقية وأي أمثلة توضيحية.',
    primaryCta: 'ابدأ الآن',
    zakatCta: 'حاسبة الزكاة المجانية',
    featuresTitle: 'أهم ما يقدمه THE SFM',
    features: ['إدارة الدخل والمصروفات والديون والمدخرات والأهداف', 'متابعة الاستثمارات والأسواق وقوائم المتابعة', 'مساحة مخصصة للزكاة والحاسبات المالية', 'إدارة المشاريع والأعمال والتقارير', 'مساعد وتحليلات مرتبطة بالبيانات المتاحة', 'تقارير ومستندات في مركز موحد'],
    pricingTitle: 'تسعير واضح',
    individualMonthly: 'الأفراد: 5$ شهرياً',
    individualAnnual: 'الأفراد: 50$ سنوياً — ما يعادل توفير شهرين',
    companyAnnual: 'الشركات: 50$ سنوياً',
    toolsTitle: 'أدوات عامة بدون تسجيل',
    tools: [['/zakat-calculator', 'حاسبة الزكاة'], ['/compound-interest-calculator', 'حاسبة الفائدة المركبة'], ['/loan-calculator', 'حاسبة القرض']],
    securityTitle: 'الأمان والخصوصية',
    security: ['استخدام HTTPS أثناء نقل البيانات', 'جلسات دخول وصلاحيات وصول للحساب', 'دعم المصادقة الثنائية', 'بنية بيانات مرتبطة بـ Supabase وسياسات وصول'],
    faqTitle: 'أسئلة سريعة',
    faq: [['هل يحتاج استخدام الحاسبات إلى حساب؟', 'لا. الحاسبات العامة متاحة بدون تسجيل دخول.'], ['هل تستخدم المنصة أرقاماً وهمية داخل الحساب؟', 'التحليلات داخل الحساب تعتمد على بيانات المستخدم المتاحة، وتوضح نقص البيانات بدلاً من اختراع أرقام.'], ['هل THE SFM استشارة مالية أو شرعية؟', 'لا. المنصة أداة تنظيم وتحليل ولا تستبدل المختص المالي أو القانوني أو الشرعي.']],
    disclaimer: 'المحتوى والحاسبات لأغراض التنظيم والتعليم وليست نصيحة مالية أو قانونية أو فتوى شرعية.',
  },
  en: {
    eyebrow: 'Financial intelligence built for the Gulf',
    title: 'Manage money, zakat, investments, and projects in one place.',
    intro: 'THE SFM is a financial and economic platform that brings personal finance, investments, zakat, projects, and reporting into one clear experience, with an explicit separation between your real data and illustrative examples.',
    primaryCta: 'Get started',
    zakatCta: 'Free zakat calculator',
    featuresTitle: 'What THE SFM brings together',
    features: ['Income, expenses, debt, savings, and goals', 'Investments, markets, and watchlists', 'A dedicated zakat workspace and financial calculators', 'Projects, business operations, and reporting', 'AI-assisted analysis tied to available evidence', 'Reports and documents in one center'],
    pricingTitle: 'Clear pricing',
    individualMonthly: 'Individuals: $5/month',
    individualAnnual: 'Individuals: $50/year — equivalent to two months saved',
    companyAnnual: 'Companies: $50/year',
    toolsTitle: 'Public tools with no sign-in',
    tools: [['/zakat-calculator', 'Zakat calculator'], ['/compound-interest-calculator', 'Compound interest calculator'], ['/loan-calculator', 'Loan calculator']],
    securityTitle: 'Security and privacy',
    security: ['HTTPS for data in transit', 'Authenticated sessions and account access controls', 'Two-factor authentication support', 'Supabase-backed data infrastructure and access policies'],
    faqTitle: 'Quick answers',
    faq: [['Do public calculators require an account?', 'No. The public calculators work without signing in.'], ['Does the platform invent account numbers?', 'Account analysis uses available user data and shows insufficient-data states instead of fabricating values.'], ['Is THE SFM financial or religious advice?', 'No. It is an organization and analysis tool, not a replacement for qualified professional advice.']],
    disclaimer: 'Content and calculators are for organization and education, not financial, legal, tax, or religious advice.',
  },
  fr: {
    eyebrow: 'Intelligence financière pensée pour le Golfe',
    title: 'Gérez argent, zakat, investissements et projets depuis un seul endroit.',
    intro: 'THE SFM est une plateforme financière et économique qui réunit finances personnelles, investissements, zakat, projets et rapports dans une expérience claire, avec une séparation explicite entre vos données réelles et les exemples illustratifs.',
    primaryCta: 'Commencer',
    zakatCta: 'Calculatrice de zakat gratuite',
    featuresTitle: 'Ce que THE SFM réunit',
    features: ['Revenus, dépenses, dettes, épargne et objectifs', 'Investissements, marchés et listes de suivi', 'Un espace zakat dédié et des calculateurs financiers', 'Projets, opérations business et rapports', 'Analyses assistées par IA liées aux données disponibles', 'Rapports et documents dans un centre unifié'],
    pricingTitle: 'Tarification claire',
    individualMonthly: 'Particuliers : 5 $/mois',
    individualAnnual: 'Particuliers : 50 $/an — soit deux mois économisés',
    companyAnnual: 'Entreprises : 50 $/an',
    toolsTitle: 'Outils publics sans connexion',
    tools: [['/zakat-calculator', 'Calculatrice de zakat'], ['/compound-interest-calculator', 'Calculatrice d’intérêts composés'], ['/loan-calculator', 'Calculatrice de prêt']],
    securityTitle: 'Sécurité et confidentialité',
    security: ['HTTPS pour les données en transit', 'Sessions authentifiées et contrôles d’accès', 'Prise en charge de la double authentification', 'Infrastructure liée à Supabase et politiques d’accès'],
    faqTitle: 'Réponses rapides',
    faq: [['Les calculateurs publics nécessitent-ils un compte ?', 'Non. Les calculateurs publics sont disponibles sans connexion.'], ['La plateforme invente-t-elle des chiffres dans le compte ?', 'Les analyses utilisent les données disponibles et signalent les informations insuffisantes au lieu de fabriquer des valeurs.'], ['THE SFM fournit-il des conseils financiers ou religieux ?', 'Non. C’est un outil d’organisation et d’analyse, pas un substitut à un professionnel qualifié.']],
    disclaimer: 'Le contenu et les calculateurs servent à l’organisation et à l’éducation, et ne constituent pas un conseil financier, juridique, fiscal ou religieux.',
  },
};

const LOCALE_LABELS: Record<Locale, string> = { ar: 'العربية', en: 'English', fr: 'Français' };

export function LocalizedSeoLandingPage({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <main lang={locale} dir={dir} className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/" className="font-bold">THE SFM</Link>
          <nav aria-label="Language" className="flex flex-wrap gap-2 text-sm">
            {(['ar', 'en', 'fr'] as const).map(code => (
              <Link key={code} href={`/${code}`} hrefLang={code} className={`rounded-[var(--radius-pill)] px-3 py-1.5 ${code === locale ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
                {LOCALE_LABELS[code]}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <section className="border-b border-border bg-[var(--hero-gradient)]">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <span className="inline-flex rounded-[var(--radius-pill)] bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">{copy.eyebrow}</span>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight md:text-6xl">{copy.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-foreground-secondary md:text-lg">{copy.intro}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/login?mode=register&next=%2Fdashboard" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-6 font-semibold text-primary-foreground">{copy.primaryCta}</Link>
            <Link href="/zakat-calculator" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border border-border bg-card px-6 font-semibold">{copy.zakatCta}</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <h2 className="text-3xl font-bold">{copy.featuresTitle}</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {copy.features.map(feature => <article key={feature} className="rounded-[var(--radius-card)] border border-border bg-card p-5"><span className="text-sm leading-7">{feature}</span></article>)}
        </div>
      </section>

      <section className="border-y border-border bg-muted/25">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">{copy.pricingTitle}</h2>
            <div className="mt-5 grid gap-3">
              {[copy.individualMonthly, copy.individualAnnual, copy.companyAnnual].map(line => <div key={line} className="rounded-[var(--radius-card)] border border-border bg-card p-4 font-semibold">{line}</div>)}
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold">{copy.toolsTitle}</h2>
            <div className="mt-5 grid gap-3">
              {copy.tools.map(([href, label]) => <Link key={href} href={href} className="rounded-[var(--radius-card)] border border-border bg-card p-4 font-semibold hover:border-primary/40">{label}</Link>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <h2 className="text-3xl font-bold">{copy.securityTitle}</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {copy.security.map(item => <div key={item} className="rounded-[var(--radius-card)] border border-border bg-card p-5">{item}</div>)}
        </div>
      </section>

      <section className="border-t border-border bg-muted/25">
        <div className="mx-auto max-w-4xl px-4 py-14 md:px-6">
          <h2 className="text-3xl font-bold">{copy.faqTitle}</h2>
          <div className="mt-6 grid gap-4">
            {copy.faq.map(([question, answer]) => <article key={question} className="rounded-[var(--radius-card)] border border-border bg-card p-5"><h3 className="font-bold">{question}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{answer}</p></article>)}
          </div>
          <p className="mt-8 text-sm leading-7 text-muted-foreground">{copy.disclaimer}</p>
        </div>
      </section>
    </main>
  );
}
