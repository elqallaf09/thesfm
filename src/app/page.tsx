'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  BellRing,
  Bot,
  BriefcaseBusiness,
  Calculator,
  CheckCircle2,
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
    faqRealDataQ: 'هل تعرض المنصة بيانات تجريبية؟',
    faqRealDataA: 'لا. داخل التطبيق تظهر البيانات الحقيقية فقط، أو حالات فارغة عند عدم توفر البيانات.',
    faqLandingQ: 'هل الأرقام في معاينة الواجهة حقيقية؟',
    faqLandingA: 'لا. المعاينة توضيحية وموسومة بوضوح بأنها لا تعرض بيانات مستخدم حقيقية.',
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
    faqTitle: 'FAQ',
    faqRealDataQ: 'Does the platform show demo data?',
    faqRealDataA: 'No. Inside the app, it shows real data only, or empty states when data is unavailable.',
    faqLandingQ: 'Are the numbers in the interface preview real?',
    faqLandingA: 'No. The preview is illustrative and clearly labeled as not real user data.',
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
    faqTitle: 'FAQ',
    faqRealDataQ: 'La plateforme affiche-t-elle des données de démonstration ?',
    faqRealDataA: 'Non. Dans l’application, elle affiche uniquement des données réelles ou des états vides lorsque les données sont indisponibles.',
    faqLandingQ: 'Les chiffres de l’aperçu sont-ils réels ?',
    faqLandingA: 'Non. L’aperçu est illustratif et clairement marqué comme ne contenant pas de données utilisateur réelles.',
  },
} satisfies Record<Lang, Record<string, string>>;

const featureIcons = [Wallet, ReceiptText, PiggyBank, TrendingUp, Calculator, FolderKanban, HandHeart, FileText, BellRing, BriefcaseBusiness, Presentation];
const featureKeys = [
  ['إدارة الدخل', 'Income management', 'Gestion des revenus'],
  ['تتبع المصروفات', 'Expense tracking', 'Suivi des dépenses'],
  ['المدخرات والأهداف', 'Savings and goals', 'Épargne et objectifs'],
  ['الاستثمارات وتحليلات السوق', 'Investments and market analysis', 'Investissements et analyse de marché'],
  ['الزكاة', 'Zakat', 'Zakat'],
  ['المشاريع التجارية', 'Business projects', 'Projets commerciaux'],
  ['المشاريع الخيرية', 'Charity projects', 'Projets caritatifs'],
  ['التقارير', 'Reports', 'Rapports'],
  ['الإشعارات الذكية', 'Smart notifications', 'Notifications intelligentes'],
  ['مركز الأعمال', 'Business Hub', 'Centre d’affaires'],
  ['Pitch Deck', 'Pitch Deck', 'Pitch Deck'],
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

export default function PublicLandingPage() {
  const { lang, dir } = useLanguage();
  const { session, isGuest } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const text = COPY[(lang as Lang) || 'ar'];
  const appHref = session || isGuest ? '/dashboard' : '/login';
  const primaryLabel = session || isGuest ? text.openDashboard : text.start;
  const aboutLabel = lang === 'ar' ? 'من نحن' : lang === 'fr' ? 'À propos' : 'About';
  const features = useMemo(() => pick(featureKeys, lang as Lang), [lang]);
  const audiences = useMemo(() => pick(audienceKeys, lang as Lang), [lang]);

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
          {features.map((feature, index) => {
            const Icon = featureIcons[index] ?? Zap;
            return (
              <article key={feature} className="feature-card">
                <div><Icon size={22} /></div>
                <h3>{feature}</h3>
                <p>{text.previewStatus}</p>
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
        </div>
        <div className="faq-grid">
          <article>
            <h3>{text.faqRealDataQ}</h3>
            <p>{text.faqRealDataA}</p>
          </article>
          <article>
            <h3>{text.faqLandingQ}</h3>
            <p>{text.faqLandingA}</p>
          </article>
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
        <FooterColumn title={text.footerCompany} links={[['/about', aboutLabel], ['#faq', text.navFaq]]} />
        <FooterColumn title={text.footerAccount} links={[['/login', text.login], ['/setup', text.start]]} />
        <FooterColumn title={text.footerLegal} links={[['#', text.privacy], ['#', text.terms]]} />
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
      {links.map(([href, label]) => <Link key={`${title}-${href}-${label}`} href={href}>{label}</Link>)}
    </div>
  );
}

const landingStyles = `
  .landing-page {
    --landing-heading: var(--sfm-heading);
    --landing-body: var(--sfm-body);
    --landing-muted: var(--sfm-muted-readable);
    --landing-dark-text: #EAF6FF;
    --landing-dark-muted: rgba(234, 246, 255, 0.88);
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
  .landing-actions {
    gap: 8px;
    justify-content: flex-end;
  }
  .nav-primary, .primary-cta, .final-cta a {
    border: 1px solid rgba(24, 212, 212, 0.24);
    border-radius: 999px;
    background: linear-gradient(135deg, #061B33, #1D8CFF 58%, #18D4D4);
    color: #FFFFFF;
    box-shadow: 0 14px 34px rgba(29, 140, 255, 0.26);
    text-decoration: none;
    font-weight: 950;
    transition: transform 180ms var(--ease), box-shadow 180ms var(--ease), filter 180ms var(--ease), background 180ms var(--ease);
  }
  .nav-primary:hover, .primary-cta:hover, .final-cta a:hover {
    filter: saturate(1.08) brightness(1.04);
    transform: translateY(-2px);
    box-shadow: 0 20px 52px rgba(29, 140, 255, 0.34);
  }
  .nav-primary:active, .primary-cta:active, .final-cta a:active {
    transform: translateY(0) scale(0.985);
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
  .trust-section p, .section-heading p, .ai-card p, .stories-section p, .final-cta p, .pricing-card p, .faq-grid p {
    margin: 8px 0 0;
    color: var(--landing-muted);
    line-height: 1.8;
    font-weight: 750;
  }
  .trust-grid, .feature-grid, .audience-grid, .pricing-grid, .faq-grid {
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
  .feature-card, .pricing-card, .faq-grid article, .audience-grid article {
    min-width: 0;
    border-radius: 22px;
    background: #FFFFFF;
    border: 1px solid rgba(29, 140, 255, 0.13);
    box-shadow: 0 14px 36px rgba(3, 18, 37, 0.07);
    padding: 18px;
  }
  .feature-card div, .ai-icon {
    width: 46px;
    height: 46px;
    justify-content: center;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(29, 140, 255, 0.12), rgba(24, 212, 212, 0.14));
    border: 1px solid rgba(29, 140, 255, 0.14);
  }
  .feature-card h3, .pricing-card h3, .faq-grid h3 {
    margin: 16px 0 7px;
    color: var(--landing-heading);
    font-size: 18px;
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
  .faq-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
    grid-template-columns: 1.3fr repeat(5, minmax(0, 1fr));
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
    .audience-grid, .pricing-grid, .faq-grid {
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
