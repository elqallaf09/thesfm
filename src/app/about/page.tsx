'use client';

import type { ComponentType, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  FolderKanban,
  HandHeart,
  Instagram,
  LineChart,
  LockKeyhole,
  Menu,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { INSTAGRAM_ARIA_LABEL, INSTAGRAM_URL, SUPPORT_EMAIL, SUPPORT_EMAIL_ARIA_LABEL, SUPPORT_EMAIL_SUPPORT_MAILTO } from '@/lib/constants/contact';

type Lang = 'ar' | 'en' | 'fr';

const COPY = {
  ar: {
    about: 'من نحن',
    features: 'المميزات',
    mission: 'مهمتنا',
    trust: 'الثقة',
    vision: 'الرؤية',
    login: 'تسجيل الدخول',
    getStarted: 'ابدأ الآن',
    exploreFeatures: 'استكشف المميزات',
    openDashboard: 'فتح لوحة التحكم',
    heroTitle: 'من نحن',
    heroSubtitle: 'THE SFM هو مدير مالي ذكي يساعد الأفراد، العائلات، المستثمرين، ورواد الأعمال على تنظيم أموالهم، مشاريعهم، زكاتهم، تقاريرهم، وقراراتهم المالية في مكان واحد.',
    missionTitle: 'مهمتنا',
    missionText: 'مهمتنا هي تبسيط الإدارة المالية وجعل القرارات المالية أوضح، أذكى، وأكثر تنظيماً. نريد أن نساعد المستخدم على فهم دخله، مصروفاته، أهدافه، زكاته، استثماراته، ومشاريعه من خلال منصة واحدة مترابطة تعتمد على بياناته الفعلية.',
    whatTitle: 'ما هو THE SFM؟',
    whatText: 'THE SFM ليس مجرد تطبيق مصروفات. هو مركز قيادة مالي يجمع بين المال الشخصي، الاستثمار، الزكاة، المشاريع التجارية، الأعمال الخيرية، التقارير، الإشعارات، والمستندات في تجربة واحدة منظمة.',
    whoTitle: 'لمن صُمم THE SFM؟',
    areasTitle: 'ماذا يقدم THE SFM؟',
    realDataTitle: 'مبدأنا: لا بيانات وهمية',
    realDataText: 'نؤمن أن المنصة المالية يجب أن تكون موثوقة. لذلك يجب أن تعتمد THE SFM على بيانات المستخدم الفعلية فقط. إذا لم تكن البيانات متوفرة، نعرض حالة فارغة أو رسالة “بيانات غير كافية” بدلاً من أرقام تخمينية أو وهمية.',
    realDataBadge: 'بياناتك أولاً',
    privacyTitle: 'الخصوصية والثقة',
    privacyText: 'بياناتك المالية خاصة. THE SFM مصمم ليحترم خصوصية المستخدم ويعرض التحليلات بناءً على البيانات المحفوظة داخل حسابه. لا يجب عرض بيانات مستخدم لغيره، ولا يجب استخدام بيانات وهمية داخل حسابات المستخدمين.',
    visionTitle: 'رؤيتنا',
    visionText: 'نسعى لأن يصبح THE SFM مركز القيادة المالي الذكي للأفراد، العائلات، المستثمرين، ورواد الأعمال في الخليج والعالم. رؤيتنا هي بناء منصة تساعد المستخدم على الانتقال من تسجيل الأرقام إلى فهمها، تحليلها، واتخاذ قرارات أفضل بناءً عليها.',
    valuesTitle: 'قيمنا',
    disclaimerTitle: 'تنبيه مهم',
    disclaimerText: 'THE SFM هو أداة للتنظيم، التخطيط، والتحليل. لا يعتبر بديلاً عن مستشار مالي أو قانوني أو ضريبي أو شرعي مختص. يجب مراجعة الجهات المختصة عند اتخاذ قرارات مالية أو قانونية أو شرعية مهمة.',
    ctaTitle: 'ابدأ تنظيم حياتك المالية بذكاء',
    ctaText: 'ابدأ بإضافة دخلك، مصروفاتك، أهدافك، أو مشروعك الأول، ودع THE SFM يساعدك على رؤية الصورة الكاملة.',
    todayCenter: 'افتح مركز اليوم',
    openMenu: 'فتح القائمة',
    closeMenu: 'إغلاق القائمة',
    footerProduct: 'المنتج',
    footerCompany: 'الشركة',
    footerAccount: 'الحساب',
    footerSupport: 'الدعم',
    contact: 'تواصل معنا',
    supportContactLine: 'للتواصل أو الدعم:',
    reportsCenter: 'مركز التقارير',
    businessHub: 'مركز الأعمال',
    security: 'الأمان والخصوصية',
    individuals: 'الأفراد',
    individualsText: 'لتنظيم الدخل، المصروفات، المدخرات، والأهداف المالية.',
    families: 'العائلات',
    familiesText: 'لتخطيط الميزانية، الزكاة، الأعمال الخيرية، والقرارات المالية المشتركة.',
    investors: 'المستثمرون',
    investorsText: 'لمتابعة الاستثمارات، السوق، قائمة المتابعة، والتنبيهات.',
    founders: 'رواد الأعمال',
    foundersText: 'لإدارة المشاريع، دراسة الجدوى، النموذج المالي، المهام، المستندات، وPitch Deck.',
    smallBusiness: 'أصحاب الأعمال الصغيرة',
    smallBusinessText: 'لتنظيم التقارير، المشاريع، النفقات، والجاهزية للتمويل.',
    personalFinance: 'المال الشخصي',
    personalFinanceText: 'الدخل، المصروفات، المدخرات، والأهداف.',
    market: 'الاستثمار والسوق',
    marketText: 'الاستثمارات، تحليلات السوق، التنبيهات، وقائمة المتابعة.',
    zakatCharity: 'الزكاة والأعمال الخيرية',
    zakatCharityText: 'حاسبة الزكاة، تتبع الحول، المشاريع الخيرية، المستفيدين، والتقارير.',
    businessProjects: 'الأعمال والمشاريع',
    businessProjectsText: 'دراسة الجدوى، النموذج المالي، المهام، المستندات، المؤشرات، وPitch Deck.',
    reportsNotifications: 'التقارير والإشعارات',
    reportsNotificationsText: 'مركز التقارير، الإشعارات الذكية، المهام، والمستندات.',
    financialAi: 'الذكاء المالي',
    financialAiText: 'مساعد ذكي يعتمد على بيانات المستخدم الفعلية لتقديم تنظيم وتحليل أفضل.',
    clarity: 'الوضوح',
    clarityText: 'نحول البيانات المالية إلى معلومات مفهومة.',
    organization: 'التنظيم',
    organizationText: 'نجمع المال، المشاريع، الزكاة، التقارير، والمستندات في مكان واحد.',
    confidence: 'الثقة',
    confidenceText: 'لا نعرض أرقاماً وهمية داخل حساب المستخدم.',
    privacy: 'الخصوصية',
    privacyValueText: 'نتعامل مع البيانات المالية باعتبارها بيانات حساسة وخاصة.',
    practicalAi: 'الذكاء العملي',
    practicalAiText: 'نستخدم الذكاء الاصطناعي للمساعدة في التنظيم والتحليل، وليس لاختراع معلومات غير موجودة.',
  },
  en: {
    about: 'About',
    features: 'Features',
    mission: 'Mission',
    trust: 'Trust',
    vision: 'Vision',
    login: 'Sign in',
    getStarted: 'Get Started',
    exploreFeatures: 'Explore Features',
    openDashboard: 'Open Dashboard',
    heroTitle: 'About THE SFM',
    heroSubtitle: 'THE SFM is an intelligent financial management platform that helps individuals, families, investors, and entrepreneurs organize their money, projects, zakat, reports, and financial decisions in one connected place.',
    missionTitle: 'Our Mission',
    missionText: 'Our mission is to simplify financial management and make financial decisions clearer, smarter, and more organized. We help users understand their income, expenses, goals, zakat, investments, and projects through one connected platform based on their real data.',
    whatTitle: 'What is THE SFM?',
    whatText: 'THE SFM is not just an expense tracker. It is a financial command center that brings together personal finance, investing, zakat, business projects, charity, reports, notifications, and documents into one organized experience.',
    whoTitle: 'Who is THE SFM for?',
    areasTitle: 'What does THE SFM offer?',
    realDataTitle: 'Our Principle: No Fake Data',
    realDataText: 'We believe a financial platform must be trustworthy. THE SFM is designed to rely only on the user’s real data. If data is missing, the platform should show an empty state or “insufficient data” instead of guessed or fake numbers.',
    realDataBadge: 'Your data first',
    privacyTitle: 'Privacy and Trust',
    privacyText: 'Your financial data is private. THE SFM is designed to respect user privacy and show analysis based on data saved in the user’s account. User data should remain private, and fake data should not be shown inside real user accounts.',
    visionTitle: 'Our Vision',
    visionText: 'Our vision is for THE SFM to become an intelligent financial command center for individuals, families, investors, and entrepreneurs in the Gulf region and beyond. We aim to help users move from simply recording numbers to understanding them, analyzing them, and making better decisions based on them.',
    valuesTitle: 'Our Values',
    disclaimerTitle: 'Important Disclaimer',
    disclaimerText: 'THE SFM is a tool for organization, planning, and analysis. It is not a replacement for a qualified financial, legal, tax, or religious advisor. Users should consult qualified professionals before making important financial, legal, tax, or religious decisions.',
    ctaTitle: 'Start organizing your financial life intelligently',
    ctaText: 'Start by adding your income, expenses, goals, or first project, and let THE SFM help you see the full picture.',
    todayCenter: 'Open Today Center',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    footerProduct: 'Product',
    footerCompany: 'Company',
    footerAccount: 'Account',
    footerSupport: 'Support',
    contact: 'Contact Us',
    supportContactLine: 'For contact or support:',
    reportsCenter: 'Reports Center',
    businessHub: 'Business Hub',
    security: 'Security & Privacy',
    individuals: 'Individuals',
    individualsText: 'To organize income, expenses, savings, and financial goals.',
    families: 'Families',
    familiesText: 'To plan budgets, zakat, charity, and shared financial decisions.',
    investors: 'Investors',
    investorsText: 'To follow investments, markets, watchlists, and alerts.',
    founders: 'Entrepreneurs',
    foundersText: 'To manage projects, feasibility, financial models, tasks, documents, and Pitch Decks.',
    smallBusiness: 'Small business owners',
    smallBusinessText: 'To organize reports, projects, expenses, and funding readiness.',
    personalFinance: 'Personal Finance',
    personalFinanceText: 'Income, expenses, savings, and goals.',
    market: 'Investment & Market',
    marketText: 'Investments, market analysis, alerts, and watchlists.',
    zakatCharity: 'Zakat & Charity',
    zakatCharityText: 'Zakat calculator, hawl tracking, charity projects, beneficiaries, and reports.',
    businessProjects: 'Business & Projects',
    businessProjectsText: 'Feasibility, financial model, tasks, documents, KPIs, and Pitch Deck.',
    reportsNotifications: 'Reports & Notifications',
    reportsNotificationsText: 'Reports Center, smart notifications, tasks, and documents.',
    financialAi: 'Financial AI',
    financialAiText: 'An intelligent assistant that relies on real user data for better organization and analysis.',
    clarity: 'Clarity',
    clarityText: 'We turn financial data into understandable information.',
    organization: 'Organization',
    organizationText: 'We bring money, projects, zakat, reports, and documents into one place.',
    confidence: 'Trust',
    confidenceText: 'We do not show fake numbers inside the user account.',
    privacy: 'Privacy',
    privacyValueText: 'We treat financial data as sensitive and private.',
    practicalAi: 'Practical intelligence',
    practicalAiText: 'We use AI to help with organization and analysis, not to invent missing information.',
  },
  fr: {
    about: 'À propos',
    features: 'Fonctionnalités',
    mission: 'Mission',
    trust: 'Confiance',
    vision: 'Vision',
    login: 'Connexion',
    getStarted: 'Commencer',
    exploreFeatures: 'Explorer les fonctionnalités',
    openDashboard: 'Ouvrir le tableau',
    heroTitle: 'À propos de THE SFM',
    heroSubtitle: 'THE SFM est une plateforme intelligente de gestion financière qui aide les particuliers, les familles, les investisseurs et les entrepreneurs à organiser leur argent, leurs projets, leur zakat, leurs rapports et leurs décisions financières au même endroit.',
    missionTitle: 'Notre mission',
    missionText: 'Notre mission est de simplifier la gestion financière et de rendre les décisions financières plus claires, plus intelligentes et mieux organisées. Nous aidons les utilisateurs à comprendre leurs revenus, dépenses, objectifs, zakat, investissements et projets grâce à une plateforme connectée basée sur leurs données réelles.',
    whatTitle: 'Qu’est-ce que THE SFM ?',
    whatText: 'THE SFM n’est pas seulement un outil de suivi des dépenses. C’est un centre de commande financier qui réunit finances personnelles, investissement, zakat, projets d’affaires, charité, rapports, notifications et documents dans une expérience organisée.',
    whoTitle: 'À qui s’adresse THE SFM ?',
    areasTitle: 'Que propose THE SFM ?',
    realDataTitle: 'Notre principe : aucune donnée fictive',
    realDataText: 'Nous pensons qu’une plateforme financière doit être fiable. THE SFM est conçue pour s’appuyer uniquement sur les données réelles de l’utilisateur. Si les données manquent, la plateforme doit afficher un état vide ou “données insuffisantes” au lieu de chiffres estimés ou fictifs.',
    realDataBadge: 'Vos données d’abord',
    privacyTitle: 'Confidentialité et confiance',
    privacyText: 'Vos données financières sont privées. THE SFM est conçue pour respecter la confidentialité des utilisateurs et afficher les analyses à partir des données enregistrées dans leur compte. Les données utilisateur doivent rester privées, et aucune donnée fictive ne doit être affichée dans les comptes réels.',
    visionTitle: 'Notre vision',
    visionText: 'Notre vision est que THE SFM devienne un centre de commande financier intelligent pour les particuliers, les familles, les investisseurs et les entrepreneurs dans la région du Golfe et au-delà. Nous voulons aider les utilisateurs à passer de la simple saisie de chiffres à leur compréhension, leur analyse et de meilleures décisions.',
    valuesTitle: 'Nos valeurs',
    disclaimerTitle: 'Avertissement important',
    disclaimerText: 'THE SFM est un outil d’organisation, de planification et d’analyse. Il ne remplace pas un conseiller financier, juridique, fiscal ou religieux qualifié. Les utilisateurs doivent consulter des professionnels qualifiés avant de prendre des décisions importantes.',
    ctaTitle: 'Commencez à organiser votre vie financière intelligemment',
    ctaText: 'Ajoutez vos revenus, vos dépenses, vos objectifs ou votre premier projet, et laissez THE SFM vous aider à voir l’ensemble.',
    todayCenter: 'Ouvrir le Centre du jour',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    footerProduct: 'Produit',
    footerCompany: 'Entreprise',
    footerAccount: 'Compte',
    footerSupport: 'Support',
    contact: 'Contactez-nous',
    supportContactLine: 'Pour contact ou assistance :',
    reportsCenter: 'Centre des rapports',
    businessHub: 'Centre d’affaires',
    security: 'Sécurité et confidentialité',
    individuals: 'Particuliers',
    individualsText: 'Pour organiser revenus, dépenses, épargne et objectifs financiers.',
    families: 'Familles',
    familiesText: 'Pour planifier le budget, la zakat, la charité et les décisions financières partagées.',
    investors: 'Investisseurs',
    investorsText: 'Pour suivre les investissements, le marché, la liste de suivi et les alertes.',
    founders: 'Entrepreneurs',
    foundersText: 'Pour gérer projets, faisabilité, modèles financiers, tâches, documents et Pitch Deck.',
    smallBusiness: 'Petites entreprises',
    smallBusinessText: 'Pour organiser rapports, projets, dépenses et préparation au financement.',
    personalFinance: 'Finances personnelles',
    personalFinanceText: 'Revenus, dépenses, épargne et objectifs.',
    market: 'Investissement et marché',
    marketText: 'Investissements, analyse de marché, alertes et liste de suivi.',
    zakatCharity: 'Zakat et charité',
    zakatCharityText: 'Calculateur de zakat, suivi du hawl, projets caritatifs, bénéficiaires et rapports.',
    businessProjects: 'Affaires et projets',
    businessProjectsText: 'Faisabilité, modèle financier, tâches, documents, KPI et Pitch Deck.',
    reportsNotifications: 'Rapports et notifications',
    reportsNotificationsText: 'Centre des rapports, notifications intelligentes, tâches et documents.',
    financialAi: 'IA financière',
    financialAiText: 'Un assistant intelligent qui s’appuie sur les données réelles de l’utilisateur pour mieux organiser et analyser.',
    clarity: 'Clarté',
    clarityText: 'Nous transformons les données financières en informations compréhensibles.',
    organization: 'Organisation',
    organizationText: 'Nous réunissons argent, projets, zakat, rapports et documents en un seul endroit.',
    confidence: 'Confiance',
    confidenceText: 'Nous n’affichons pas de chiffres fictifs dans le compte utilisateur.',
    privacy: 'Confidentialité',
    privacyValueText: 'Nous traitons les données financières comme sensibles et privées.',
    practicalAi: 'Intelligence pratique',
    practicalAiText: 'Nous utilisons l’IA pour aider à organiser et analyser, pas pour inventer des informations manquantes.',
  },
} satisfies Record<Lang, Record<string, string>>;

export default function AboutPage() {
  const { lang, dir } = useLanguage();
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const locale = (['ar', 'en', 'fr'].includes(lang) ? lang : 'ar') as Lang;
  const text = COPY[locale];
  const appHref = session ? '/dashboard' : '/login';
  const primaryLabel = session ? text.openDashboard : text.getStarted;

  const audiences = useMemo(() => [
    { title: text.individuals, body: text.individualsText, icon: Wallet },
    { title: text.families, body: text.familiesText, icon: UsersRound },
    { title: text.investors, body: text.investorsText, icon: LineChart },
    { title: text.founders, body: text.foundersText, icon: FolderKanban },
    { title: text.smallBusiness, body: text.smallBusinessText, icon: BriefcaseBusiness },
  ], [text]);

  const productAreas = useMemo(() => [
    { title: text.personalFinance, body: text.personalFinanceText, icon: Wallet },
    { title: text.market, body: text.marketText, icon: LineChart },
    { title: text.zakatCharity, body: text.zakatCharityText, icon: HandHeart },
    { title: text.businessProjects, body: text.businessProjectsText, icon: FolderKanban },
    { title: text.reportsNotifications, body: text.reportsNotificationsText, icon: FileText },
    { title: text.financialAi, body: text.financialAiText, icon: Bot },
  ], [text]);

  const values = useMemo(() => [
    { title: text.clarity, body: text.clarityText },
    { title: text.organization, body: text.organizationText },
    { title: text.confidence, body: text.confidenceText },
    { title: text.privacy, body: text.privacyValueText },
    { title: text.practicalAi, body: text.practicalAiText },
  ], [text]);

  const navLinks = [
    { href: '/', label: 'THE SFM' },
    { href: '#features', label: text.features },
    { href: '#mission', label: text.mission },
    { href: '#trust', label: text.trust },
    { href: '#vision', label: text.vision },
  ];

  return (
    <main className="about-page" dir={dir}>
      <nav className="about-nav" aria-label={text.about}>
        <Link href="/" className="about-brand" aria-label="THE SFM">
          <Image src="/sfm-logo.png" alt="THE SFM" width={46} height={46} priority className="about-logo" />
          <span>THE SFM</span>
        </Link>

        <div className={menuOpen ? 'about-links open' : 'about-links'}>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} aria-current={link.href === '#mission' ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{link.label}</Link>
          ))}
        </div>

        <div className="about-actions">
          <LanguageSwitcher variant="gold" compact />
          <ThemeToggle />
          <Link href={appHref} className="nav-primary">{primaryLabel}</Link>
          <button
            type="button"
            className="mobile-menu-button"
            aria-label={menuOpen ? text.closeMenu : text.openMenu}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(value => !value)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <section className="about-hero">
        <div className="hero-copy">
          <span className="hero-badge"><Sparkles size={16} />{text.realDataBadge}</span>
          <h1>{text.heroTitle}</h1>
          <p>{text.heroSubtitle}</p>
          <div className="hero-actions">
            <Link href={appHref} className="primary-cta" aria-label={text.getStarted}>{primaryLabel}</Link>
            <a href="#features" className="secondary-cta" aria-label={text.exploreFeatures}>{text.exploreFeatures}</a>
          </div>
        </div>
        <div className="hero-panel" aria-label={text.whatTitle}>
          <div className="hero-orbit" aria-hidden="true">
            <span><Wallet size={22} /></span>
            <span><FolderKanban size={22} /></span>
            <span><ShieldCheck size={22} /></span>
            <span><Bot size={22} /></span>
          </div>
          <h2>{text.whatTitle}</h2>
          <p>{text.whatText}</p>
        </div>
      </section>

      <section id="mission" className="statement-grid single">
        <InfoCard title={text.missionTitle} body={text.missionText} icon={<Target size={24} />} featured />
      </section>

      <section className="section-block" aria-labelledby="who-title">
        <SectionHeading eyebrow={text.about} title={text.whoTitle} />
        <div className="audience-grid">
          {audiences.map(item => <IconCard key={item.title} title={item.title} body={item.body} icon={item.icon} />)}
        </div>
      </section>

      <section id="features" className="section-block" aria-labelledby="areas-title">
        <SectionHeading eyebrow={text.features} title={text.areasTitle} />
        <div className="areas-grid">
          {productAreas.map(item => <IconCard key={item.title} title={item.title} body={item.body} icon={item.icon} />)}
        </div>
      </section>

      <section id="trust" className="trust-band">
        <div>
          <span><CheckCircle2 size={16} />{text.realDataBadge}</span>
          <h2>{text.realDataTitle}</h2>
          <p>{text.realDataText}</p>
        </div>
        <div className="trust-card">
          <LockKeyhole size={30} />
          <h3>{text.privacyTitle}</h3>
          <p>{text.privacyText}</p>
        </div>
      </section>

      <section id="vision" className="statement-grid">
        <InfoCard title={text.visionTitle} body={text.visionText} icon={<Sparkles size={24} />} featured />
        <InfoCard title={text.disclaimerTitle} body={text.disclaimerText} icon={<ShieldCheck size={24} />} variant="notice" />
      </section>

      <section className="section-block values-section" aria-labelledby="values-title">
        <SectionHeading eyebrow={text.vision} title={text.valuesTitle} />
        <div className="values-grid">
          {values.map(item => (
            <article key={item.title} className="value-card">
              <CheckCircle2 size={19} />
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-cta">
        <h2>{text.ctaTitle}</h2>
        <p>{text.ctaText}</p>
        <div className="cta-actions">
          <Link href={appHref}>{primaryLabel}</Link>
          <Link href="/today">{text.todayCenter}<ArrowRight size={16} /></Link>
        </div>
      </section>

      <footer className="about-footer">
        <div className="footer-brand">
          <Image src="/sfm-logo.png" alt="THE SFM" width={42} height={42} className="about-logo" />
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
        <FooterColumn title={text.footerProduct} links={[['/', 'THE SFM'], ['/reports-center', text.reportsCenter], ['/business-hub', text.businessHub]]} />
        <FooterColumn title={text.footerCompany} links={[['/about', text.about], ['/security', text.security]]} />
        <FooterColumn title={text.footerAccount} links={[['/login', text.login], ['/dashboard', text.openDashboard]]} />
        <FooterColumn title={text.footerSupport} links={[['/contact', text.contact], [INSTAGRAM_URL, 'Instagram']]} />
      </footer>

      <style jsx>{aboutStyles}</style>
    </main>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-heading">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  );
}

function InfoCard({ title, body, icon, featured = false, variant }: { title: string; body: string; icon: ReactNode; featured?: boolean; variant?: 'notice' }) {
  return (
    <article className={['info-card', featured ? 'featured' : '', variant === 'notice' ? 'notice' : ''].filter(Boolean).join(' ')}>
      <div className="card-icon" aria-hidden="true">{icon}</div>
      <h2>{title}</h2>
      <p>{body}</p>
    </article>
  );
}

function IconCard({ title, body, icon: Icon }: { title: string; body: string; icon: ComponentType<{ size?: number }> }) {
  return (
    <article className="icon-card">
      <div aria-hidden="true"><Icon size={22} /></div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
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

const aboutStyles = `
  .about-page {
    min-height: 100vh;
    overflow-x: hidden;
    color: var(--foreground);
    background: var(--background);
    font-family: var(--font-ui);
  }
  .about-nav {
    position: sticky;
    top: 12px;
    z-index: 150;
    width: min(1180px, calc(100% - 32px));
    min-height: 64px;
    margin: 12px auto 0;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-panel);
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    box-shadow: var(--shadow-md);
    backdrop-filter: blur(18px);
  }
  .about-brand, .about-links, .about-actions, .hero-actions, .hero-badge, .trust-band span, .cta-actions, .footer-brand {
    display: flex;
    align-items: center;
  }
  .about-brand {
    gap: 10px;
    color: var(--foreground);
    text-decoration: none;
    font-weight: 600;
  }
  .about-logo {
    border-radius: var(--radius-control);
    object-fit: cover;
    box-shadow: var(--shadow-sm);
  }
  .about-links {
    gap: 8px;
    justify-content: center;
    flex: 1;
  }
  .about-links a, .nav-login {
    min-height: 38px;
    padding: 8px 12px;
    border-radius: var(--radius-pill);
    color: var(--foreground-secondary);
    text-decoration: none;
    font-weight: 600;
    font-size: 13px;
  }
  .about-links a:hover, .nav-login:hover {
    background: var(--surface-hover);
  }
  .about-actions {
    gap: 8px;
    justify-content: flex-end;
  }
  .nav-primary, .primary-cta, .about-cta .cta-actions a:first-child {
    border-radius: var(--radius-pill);
    background: var(--primary);
    color: var(--primary-foreground);
    box-shadow: var(--shadow-sm);
    text-decoration: none;
    font-weight: 600;
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
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--foreground);
  }
  .about-hero, .statement-grid, .section-block, .trust-band, .about-cta, .about-footer {
    width: min(1180px, calc(100% - 32px));
    margin: 0 auto;
  }
  .about-hero {
    min-height: 560px;
    padding: 34px 0 46px;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(340px, 0.95fr);
    align-items: center;
    gap: 22px;
  }
  .hero-copy {
    display: grid;
    gap: 16px;
  }
  .hero-badge {
    width: fit-content;
    gap: 8px;
    border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
    border-radius: var(--radius-pill);
    background: var(--accent-soft);
    color: var(--accent);
    padding: 8px 13px;
    font-size: 12px;
    font-weight: 600;
  }
  .hero-copy h1 {
    margin: 0;
    color: var(--foreground);
    font-size: clamp(36px, 6vw, 64px);
    line-height: 1.03;
    font-weight: 600;
    letter-spacing: 0;
  }
  .hero-copy p {
    max-width: 760px;
    margin: 0;
    color: var(--foreground-secondary);
    font-size: 18px;
    line-height: 1.75;
    font-weight: 400;
  }
  .hero-actions {
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
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--foreground);
    text-decoration: none;
    font-weight: 600;
  }
  .hero-panel {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-panel);
    padding: 24px;
    min-height: 360px;
    display: grid;
    align-content: end;
    background: var(--hero-gradient);
    color: var(--hero-foreground);
    border: 1px solid color-mix(in srgb, var(--hero-foreground) 18%, transparent);
    box-shadow: var(--shadow-lg);
  }
  .hero-panel h2 {
    margin: 0 0 10px;
    font-size: 28px;
    color: var(--hero-foreground);
  }
  .hero-panel p {
    margin: 0;
    color: var(--hero-foreground-muted);
    line-height: 1.75;
    font-weight: 500;
  }
  .hero-orbit {
    position: absolute;
    inset: 28px;
  }
  .hero-orbit span {
    position: absolute;
    width: 64px;
    height: 64px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-panel);
    background: color-mix(in srgb, var(--hero-foreground) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--hero-foreground) 22%, transparent);
    color: var(--hero-foreground-muted);
  }
  .hero-orbit span:nth-child(1) { top: 10px; inset-inline-start: 12px; }
  .hero-orbit span:nth-child(2) { top: 68px; inset-inline-end: 20px; }
  .hero-orbit span:nth-child(3) { top: 160px; inset-inline-start: 42%; }
  .hero-orbit span:nth-child(4) { bottom: 110px; inset-inline-start: 20px; }
  .statement-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    gap: 16px;
  }
  .statement-grid.single {
    grid-template-columns: minmax(0, 1fr);
  }
  .info-card, .icon-card, .value-card, .trust-card {
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-panel);
    background: var(--surface);
    box-shadow: var(--shadow-card);
    padding: 20px;
  }
  .info-card.featured {
    background: var(--primary-soft);
    border-color: color-mix(in srgb, var(--primary) 28%, var(--border));
    color: var(--foreground);
  }
  .info-card.notice {
    position: relative;
    overflow: hidden;
    border-color: color-mix(in srgb, var(--warning) 32%, var(--border));
    background: var(--warning-soft);
    color: var(--foreground);
    box-shadow: var(--shadow-card);
  }
  .info-card.notice::before {
    content: "";
    position: absolute;
    inset-inline-start: 0;
    top: 18px;
    bottom: 18px;
    width: 4px;
    border-radius: var(--radius-pill);
    background: var(--warning);
  }
  .card-icon, .icon-card div {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-card);
    background: var(--primary-soft);
    color: var(--primary);
  }
  .info-card h2, .icon-card h3, .value-card h3, .trust-card h3 {
    margin: 16px 0 8px;
    color: var(--foreground);
    font-size: 20px;
    font-weight: 600;
  }
  .info-card.featured h2,
  .info-card.notice h2 {
    color: var(--foreground);
  }
  .info-card p, .icon-card p, .value-card p, .trust-card p {
    margin: 0;
    color: var(--foreground-secondary);
    line-height: 1.72;
    font-weight: 400;
  }
  .info-card.featured p,
  .info-card.notice p {
    color: var(--foreground-secondary);
  }
  .info-card.notice .card-icon {
    color: var(--warning);
    background: var(--warning-soft);
    border: 1px solid color-mix(in srgb, var(--warning) 24%, var(--border));
  }
  .section-block {
    padding-top: 56px;
  }
  .section-heading {
    max-width: 760px;
    margin-bottom: 18px;
  }
  .section-heading span {
    color: var(--primary);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .section-heading h2 {
    margin: 8px 0 0;
    color: var(--foreground);
    font-size: clamp(28px, 4vw, 44px);
    line-height: 1.15;
    font-weight: 600;
  }
  .audience-grid, .areas-grid, .values-grid {
    display: grid;
    gap: 14px;
  }
  .audience-grid {
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  }
  .areas-grid {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
  .values-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
  .icon-card {
    display: grid;
    gap: 2px;
  }
  .trust-band {
    margin-top: 56px;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(300px, 0.95fr);
    gap: 18px;
    align-items: stretch;
    border-radius: var(--radius-panel);
    padding: 24px;
    color: var(--foreground);
    background: var(--surface-muted);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-card);
  }
  .trust-band span {
    width: fit-content;
    gap: 8px;
    color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
    border-radius: var(--radius-pill);
    padding: 7px 11px;
    font-weight: 600;
  }
  .trust-band h2 {
    margin: 18px 0 10px;
    color: var(--foreground);
    font-size: clamp(28px, 4vw, 46px);
  }
  .trust-band p {
    margin: 0;
    color: var(--foreground-secondary);
    line-height: 1.75;
    font-weight: 500;
  }
  .trust-card {
    background: var(--surface);
    border-color: var(--border);
    box-shadow: none;
  }
  .trust-card h3 {
    color: var(--foreground);
  }
  .trust-card svg {
    color: var(--accent);
  }
  .values-section {
    padding-top: 56px;
  }
  .value-card svg {
    color: var(--accent);
  }
  .about-cta {
    margin-top: 56px;
    border-radius: var(--radius-panel);
    text-align: center;
    padding: 34px 24px;
    color: var(--hero-foreground);
    background: var(--hero-gradient);
    box-shadow: var(--shadow-lg);
  }
  .about-cta h2 {
    margin: 0;
    color: var(--hero-foreground);
    font-size: clamp(28px, 4vw, 44px);
  }
  .about-cta p {
    max-width: 720px;
    margin: 12px auto 22px;
    color: var(--hero-foreground-muted);
    line-height: 1.8;
    font-weight: 500;
  }
  .cta-actions {
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .about-cta .cta-actions a {
    min-height: 50px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 22px;
    border-radius: var(--radius-pill);
    color: var(--hero-foreground);
    text-decoration: none;
    font-weight: 600;
  }
  .about-cta .cta-actions a:last-child {
    border: 1px solid color-mix(in srgb, var(--hero-foreground) 24%, transparent);
    background: color-mix(in srgb, var(--hero-foreground) 8%, transparent);
  }
  .about-footer {
    margin-top: 42px;
    padding: 24px 0 30px;
    display: grid;
    grid-template-columns: 1.35fr repeat(4, minmax(0, 1fr));
    gap: 18px;
  }
  .footer-brand {
    gap: 10px;
    align-self: start;
    color: var(--foreground);
    font-weight: 600;
    flex-wrap: wrap;
  }
  .footer-brand p {
    flex-basis: 100%;
    margin: 4px 0 0;
    color: var(--foreground-secondary);
    font-size: 13px;
    line-height: 1.6;
  }
  .footer-brand p a {
    color: var(--primary);
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
    border: 1px solid color-mix(in srgb, var(--primary) 24%, var(--border));
    border-radius: var(--radius-pill);
    background: var(--primary-soft);
    color: var(--primary);
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
    transition: background 180ms var(--ease), border-color 180ms var(--ease), color 180ms var(--ease), transform 180ms var(--ease);
  }
  .footer-social-link:hover {
    background: var(--accent-soft);
    border-color: color-mix(in srgb, var(--accent) 38%, var(--border));
    color: var(--accent-hover);
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
  }
  .footer-column a:hover {
    color: var(--primary);
  }
  a:focus-visible, button:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 3px;
  }
  @media (max-width: 980px) {
    .about-nav {
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .about-links {
      order: 3;
      flex-basis: 100%;
      display: none;
      grid-template-columns: 1fr;
      justify-content: stretch;
      padding-top: 8px;
    }
    .about-links.open {
      display: grid;
      margin-top: 10px;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface-elevated);
      box-shadow: var(--shadow-popover);
    }
    .about-links a {
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 10px 12px;
      border: 1px solid var(--border);
      background: var(--surface-muted);
      text-align: start;
    }
    [dir="rtl"] .about-links a {
      justify-content: flex-end;
    }
    .nav-login, .nav-primary {
      display: none;
    }
    .mobile-menu-button {
      display: grid;
      place-items: center;
    }
    .about-hero {
      min-height: auto;
      grid-template-columns: 1fr;
      padding: 28px 0 38px;
    }
    .statement-grid, .trust-band, .about-footer {
      grid-template-columns: 1fr;
    }
    .about-footer {
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
    .hero-panel {
      min-height: 320px;
    }
  }
  @media (max-width: 620px) {
    .about-nav, .about-hero, .statement-grid, .section-block, .trust-band, .about-cta, .about-footer {
      width: min(100% - 24px, 1180px);
    }
    .about-nav {
      margin-top: 12px;
      border-radius: var(--radius-card);
    }
    .about-brand span {
      display: none;
    }
    .about-actions {
      gap: 6px;
    }
    .hero-copy h1 {
      font-size: 38px;
    }
    .hero-copy p {
      font-size: 16px;
    }
    .hero-actions, .cta-actions {
      display: grid;
      grid-template-columns: 1fr;
    }
    .primary-cta, .secondary-cta, .about-cta .cta-actions a {
      width: 100%;
    }
    .hero-panel {
      min-height: 330px;
      padding: 22px;
      border-radius: var(--radius-panel);
    }
    .hero-orbit span {
      width: 54px;
      height: 54px;
      border-radius: var(--radius-card);
    }
    .section-block, .values-section {
      padding-top: 42px;
    }
    .trust-band {
      margin-top: 42px;
      padding: 22px;
      border-radius: var(--radius-panel);
    }
    .about-cta {
      margin-top: 42px;
      padding: 28px 18px;
    }
    .about-footer {
      margin-top: 32px;
      padding: 22px 16px 24px;
    }
  }

  .about-actions .sfm-theme-toggle {
    width: 40px;
    min-width: 40px;
    height: 40px;
    border-radius: var(--radius-control);
  }

`;
