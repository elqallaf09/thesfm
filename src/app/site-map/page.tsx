'use client';

import Link from 'next/link';
import { ArrowUpRight, ChevronLeft, LayoutDashboard, MapPinned, ReceiptText, Target, Wallet } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { AppCard } from '@/components/layout/AppCard';
import { NAV_GROUPS } from '@/components/navigationConfig';
import { useLanguage } from '@/hooks/useLanguage';

type Lang = 'ar' | 'en' | 'fr';

const TEXT = {
  ar: {
    title: 'خريطة THE SFM',
    subtitle: 'دليل مختصر يوضح أين تجد كل جزء من المنصة وما الغرض منه.',
    eyebrow: 'تنظيم المنصة',
    open: 'فتح',
    featuredTitle: 'الصفحات الأكثر استخداماً',
    featuredSubtitle: 'وصول سريع إلى أهم مساحات العمل اليومية في THE SFM.',
    linkCount: '{count} صفحة',
    noPages: 'لا توجد صفحات حالياً',
    purpose: 'الغرض',
    related: 'صفحات مرتبطة',
    extra: 'صفحات مساعدة',
    siteMap: 'خريطة THE SFM',
    siteMapDesc: 'هذه الصفحة تساعدك على فهم بنية التطبيق والتنقل بين أقسامه.',
    setup: 'إعداد الحساب',
    setupDesc: 'إعداد أولي يعتمد فقط على البيانات التي تدخلها بنفسك.',
    dashboardDesc: 'نظرة تنفيذية مختصرة على بياناتك الحقيقية.',
    commandDesc: 'بوابة منظمة إلى العوالم الرئيسية في التطبيق.',
    todayDesc: 'ما يحتاج انتباهك اليوم فقط.',
    tasksDesc: 'مهام عملية من بياناتك الفعلية وما يحتاج إكمالاً أو مراجعة.',
    notificationsDesc: 'تنبيهات ذكية من بياناتك وتنبيهاتك الفعلية.',
    reportsDesc: 'جاهزية التقارير والملفات القابلة للتصدير.',
    documentsCenterDesc: 'مركز موحد لكل مستندات المستخدم من المشاريع والخير والإيصالات والتقارير.',
    incomeDesc: 'إدارة مصادر الدخل.',
    expensesDesc: 'إدارة المصروفات والفواتير.',
    savingsDesc: 'متابعة المدخرات.',
    goalsDesc: 'متابعة الأهداف المالية.',
    zakatDesc: 'حساب الزكاة والحول والسجل.',
    investDesc: 'إدارة الاستثمارات والمحفظة.',
    marketDesc: 'تحليلات السوق مع تبويبات قائمة المتابعة والتنبيهات.',
    projectsDesc: 'قائمة المشاريع ونقاط الدخول لمساحات العمل.',
    businessDesc: 'الجاهزية، التمويل، التأسيس، والمستندات الاستراتيجية.',
    documentsDesc: 'مستندات وعروض المشاريع داخل مركز الأعمال.',
    investmentOffersDesc: 'مركز مواد المستثمرين: Pitch Deck، جاهزية التمويل، المستندات الاستراتيجية، واستخدام التمويل.',
    charityDesc: 'تسجيل أعمال الخير السريعة.',
    charityProjectsDesc: 'المشاريع الخيرية والمستفيدون والمساهمون.',
    servicesDesc: 'أدلة خدمات مساعدة عند توفرها.',
    profileDesc: 'بيانات الحساب والملف الشخصي.',
    securityDesc: 'معلومات الأمان والخصوصية وإخلاء المسؤولية.',
  },
  en: {
    title: 'THE SFM Map',
    subtitle: 'A short guide to where each part of the platform lives and what it does.',
    eyebrow: 'Platform organization',
    open: 'Open',
    featuredTitle: 'Most used pages',
    featuredSubtitle: 'Quick access to the core daily workspaces in THE SFM.',
    linkCount: '{count} pages',
    noPages: 'No pages right now',
    purpose: 'Purpose',
    related: 'Related pages',
    extra: 'Supporting pages',
    siteMap: 'THE SFM Map',
    siteMapDesc: 'This page helps you understand the app structure and move between sections.',
    setup: 'Account Setup',
    setupDesc: 'Initial setup based only on data you enter yourself.',
    dashboardDesc: 'A concise executive overview of your real data.',
    commandDesc: 'A clean gateway into the main worlds of the app.',
    todayDesc: 'Only what needs attention today.',
    tasksDesc: 'Actionable tasks from your real data and items needing completion or review.',
    notificationsDesc: 'Smart alerts from your real data and saved alerts.',
    reportsDesc: 'Report readiness and exportable files.',
    documentsCenterDesc: 'Unified center for user-owned project, charity, receipt, and report documents.',
    incomeDesc: 'Manage income sources.',
    expensesDesc: 'Manage expenses and receipts.',
    savingsDesc: 'Track savings.',
    goalsDesc: 'Track financial goals.',
    zakatDesc: 'Zakat, hawl, and saved calculation history.',
    investDesc: 'Manage investments and portfolio records.',
    marketDesc: 'Market analysis with watchlist and alert tabs.',
    projectsDesc: 'Project list and workspace entry points.',
    businessDesc: 'Readiness, funding, jurisdiction, and strategic documents.',
    documentsDesc: 'Project documents and pitch decks inside Business Hub.',
    investmentOffersDesc: 'Investor-ready materials: Pitch Deck, funding readiness, strategic documents, and use of funds.',
    charityDesc: 'Quick charity logging.',
    charityProjectsDesc: 'Charity projects, beneficiaries, and contributors.',
    servicesDesc: 'Supporting service directories when available.',
    profileDesc: 'Account and profile information.',
    securityDesc: 'Security, privacy, and disclaimer information.',
  },
  fr: {
    title: 'Carte THE SFM',
    subtitle: 'Un guide court pour comprendre où se trouve chaque partie de la plateforme.',
    eyebrow: 'Organisation de la plateforme',
    open: 'Ouvrir',
    featuredTitle: 'Pages les plus utilisées',
    featuredSubtitle: 'Accès rapide aux principaux espaces quotidiens de THE SFM.',
    linkCount: '{count} pages',
    noPages: 'Aucune page pour le moment',
    purpose: 'Objectif',
    related: 'Pages liées',
    extra: 'Pages d’aide',
    siteMap: 'Carte THE SFM',
    siteMapDesc: 'Cette page aide à comprendre la structure de l’application et à naviguer.',
    setup: 'Configuration du compte',
    setupDesc: 'Configuration initiale basée uniquement sur les données que vous saisissez.',
    dashboardDesc: 'Vue exécutive concise de vos données réelles.',
    commandDesc: 'Passerelle claire vers les principaux univers de l’application.',
    todayDesc: 'Seulement ce qui demande votre attention aujourd’hui.',
    tasksDesc: 'Tâches actionnables issues de vos données réelles et des éléments à compléter.',
    notificationsDesc: 'Alertes intelligentes issues de vos données réelles.',
    reportsDesc: 'Préparation des rapports et fichiers exportables.',
    documentsCenterDesc: 'Centre unifié pour les documents projet, caritatifs, reçus et rapports de l’utilisateur.',
    incomeDesc: 'Gérer les sources de revenus.',
    expensesDesc: 'Gérer les dépenses et reçus.',
    savingsDesc: 'Suivre l’épargne.',
    goalsDesc: 'Suivre les objectifs financiers.',
    zakatDesc: 'Zakat, hawl et historique des calculs sauvegardés.',
    investDesc: 'Gérer les investissements et le portefeuille.',
    marketDesc: 'Analyse du marché avec onglets de suivi et d’alertes.',
    projectsDesc: 'Liste des projets et accès aux espaces de travail.',
    businessDesc: 'Préparation, financement, juridiction et documents stratégiques.',
    documentsDesc: 'Documents projet et pitch decks dans le Centre d’affaires.',
    investmentOffersDesc: 'Éléments prêts pour investisseurs : Pitch Deck, préparation au financement, documents stratégiques et utilisation des fonds.',
    charityDesc: 'Enregistrement rapide des actions caritatives.',
    charityProjectsDesc: 'Projets caritatifs, bénéficiaires et contributeurs.',
    servicesDesc: 'Répertoires de services d’aide lorsqu’ils sont disponibles.',
    profileDesc: 'Informations du compte et du profil.',
    securityDesc: 'Informations de sécurité, confidentialité et avertissements.',
  },
} as const;

const PURPOSE_KEY: Record<string, keyof typeof TEXT.ar> = {
  home: 'dashboardDesc',
  'command-center': 'commandDesc',
  today: 'todayDesc',
  tasks: 'tasksDesc',
  'documents-center': 'documentsCenterDesc',
  notif: 'notificationsDesc',
  'reports-center': 'reportsDesc',
  income: 'incomeDesc',
  expenses: 'expensesDesc',
  savings: 'savingsDesc',
  goals: 'goalsDesc',
  zakat: 'zakatDesc',
  invest: 'investDesc',
  'market-analysis': 'marketDesc',
  projects: 'projectsDesc',
  'business-hub': 'businessDesc',
  documents: 'documentsDesc',
  'investment-offers': 'investmentOffersDesc',
  charity: 'charityDesc',
  'charity-projects': 'charityProjectsDesc',
  beneficiaries: 'charityProjectsDesc',
  'charity-reports': 'reportsDesc',
  'investment-firms': 'servicesDesc',
  'accounting-firms': 'servicesDesc',
  'feasibility-firms': 'servicesDesc',
  'advisory-firms': 'servicesDesc',
  profile: 'profileDesc',
  security: 'securityDesc',
};

const FEATURED_ITEMS = [
  { id: 'home', href: '/dashboard', icon: LayoutDashboard, labelKey: 'nav_home', purposeKey: 'dashboardDesc' as const },
  { id: 'income', href: '/income', icon: Wallet, labelKey: 'nav_income', purposeKey: 'incomeDesc' as const },
  { id: 'expenses', href: '/expenses', icon: ReceiptText, labelKey: 'nav_expenses', purposeKey: 'expensesDesc' as const },
  { id: 'goals', href: '/goals', icon: Target, labelKey: 'nav_goals', purposeKey: 'goalsDesc' as const },
] as const;

function countText(template: string, count: number) {
  return template.replace('{count}', String(count));
}

export default function SiteMapPage() {
  const { lang, dir, t } = useLanguage();
  const text = TEXT[(lang as Lang) || 'ar'];
  const aboutTitle = lang === 'ar' ? 'من نحن' : lang === 'fr' ? 'À propos de THE SFM' : 'About THE SFM';
  const aboutDesc = lang === 'ar'
    ? 'صفحة عامة تشرح مهمة THE SFM ومبادئ الثقة والبيانات الحقيقية.'
    : lang === 'fr'
      ? 'Page publique expliquant la mission de THE SFM, la confiance et les données réelles.'
      : 'Public page explaining THE SFM mission, trust principles, and real-data approach.';

  return (
    <div className="site-map-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.title} contentClassName="site-map-content">
        <div className="sfm-page-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>
        <PageHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          icon={<MapPinned size={28} />}
        />

        <section className="site-map-featured" aria-labelledby="site-map-featured-title">
          <div className="site-map-section-head">
            <div>
              <p>{text.eyebrow}</p>
              <h2 id="site-map-featured-title">{text.featuredTitle}</h2>
              <span>{text.featuredSubtitle}</span>
            </div>
          </div>
          <div className="site-map-featured-grid">
            {FEATURED_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  className="site-map-feature-card"
                  href={item.href}
                  aria-label={`${text.open}: ${t(item.labelKey)}`}
                >
                  <span className="featured-icon" aria-hidden="true"><Icon size={24} /></span>
                  <div>
                    <strong>{t(item.labelKey)}</strong>
                    <p>{text[item.purposeKey]}</p>
                  </div>
                  <em>{text.open}<ArrowUpRight size={15} /></em>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="site-map-grid" aria-label={text.title}>
          {NAV_GROUPS.map(group => (
            <AppCard key={group.id} className="site-map-group">
              <div className="site-map-group-head">
                <span className="site-map-group-icon" aria-hidden="true">
                  {(() => {
                    const GroupIcon = group.items.find(item => item.href)?.icon ?? MapPinned;
                    return <GroupIcon size={20} />;
                  })()}
                </span>
                <div>
                  <h2>{t(group.labelKey)}</h2>
                  <small>{countText(text.linkCount, group.items.filter(item => item.href).length)}</small>
                </div>
              </div>
              <div className="site-map-routes">
                {group.items.filter(item => item.href).length ? group.items.filter(item => item.href).map(item => {
                  const purposeKey = PURPOSE_KEY[item.id] ?? 'siteMapDesc';
                  const Icon = item.icon;
                  return (
                    <Link
                      className="site-map-route-card"
                      key={item.id}
                      href={item.href ?? '/dashboard'}
                      aria-label={`${text.open}: ${t(item.labelKey)}`}
                    >
                      <span className="route-icon" aria-hidden="true"><Icon size={18} /></span>
                      <div>
                        <strong>{t(item.labelKey)}</strong>
                        <p>{text[purposeKey]}</p>
                      </div>
                      <em>{text.open}<ChevronLeft size={14} /></em>
                    </Link>
                  );
                }) : (
                  <div className="site-map-empty">
                    <MapPinned size={20} aria-hidden="true" />
                    <span>{text.noPages}</span>
                  </div>
                )}
              </div>
            </AppCard>
          ))}
          <AppCard className="site-map-group">
            <div className="site-map-group-head">
              <span className="site-map-group-icon" aria-hidden="true"><MapPinned size={20} /></span>
              <div>
                <h2>{text.extra}</h2>
                <small>{countText(text.linkCount, 3)}</small>
              </div>
            </div>
            <div className="site-map-routes">
              <Link className="site-map-route-card" href="/about" aria-label={`${text.open}: ${aboutTitle}`}>
                <span className="route-icon" aria-hidden="true"><MapPinned size={18} /></span>
                <div>
                  <strong>{aboutTitle}</strong>
                  <p>{aboutDesc}</p>
                </div>
                <em>{text.open}<ChevronLeft size={14} /></em>
              </Link>
              <Link className="site-map-route-card" href="/site-map" aria-label={`${text.open}: ${text.siteMap}`}>
                <span className="route-icon" aria-hidden="true"><MapPinned size={18} /></span>
                <div>
                  <strong>{text.siteMap}</strong>
                  <p>{text.siteMapDesc}</p>
                </div>
                <em>{text.open}<ChevronLeft size={14} /></em>
              </Link>
              <Link className="site-map-route-card" href="/setup" aria-label={`${text.open}: ${text.setup}`}>
                <span className="route-icon" aria-hidden="true"><MapPinned size={18} /></span>
                <div>
                  <strong>{text.setup}</strong>
                  <p>{text.setupDesc}</p>
                </div>
                <em>{text.open}<ChevronLeft size={14} /></em>
              </Link>
            </div>
          </AppCard>
        </section>
      </DashboardPageShell>

      <style jsx global>{`
        .site-map-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 18% 12%, rgba(29, 140, 255, .10), transparent 34%),
            linear-gradient(160deg, var(--sfm-background), #F8FBFF 62%, #E7F1FF 100%);
        }
        .site-map-content {
          display: grid;
          gap: 22px;
        }
        .sfm-page-topbar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
        }
        .site-map-featured,
        .site-map-group {
          display: grid;
          gap: 16px;
          border: 1px solid rgba(226, 238, 248, 0.92);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 252, 255, 0.78)),
            radial-gradient(circle at 0 0, rgba(24, 212, 212, 0.10), transparent 42%);
          box-shadow: 0 18px 44px rgba(15, 37, 64, 0.08);
          backdrop-filter: blur(12px);
        }
        .site-map-featured {
          border-radius: 28px;
          padding: 22px;
        }
        .site-map-section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
        }
        .site-map-section-head p,
        .site-map-section-head h2,
        .site-map-section-head span {
          margin: 0;
        }
        .site-map-section-head p {
          color: var(--sfm-primary);
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0;
        }
        .site-map-section-head h2 {
          margin-top: 5px;
          color: #0B1F38;
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 950;
        }
        .site-map-section-head span {
          display: block;
          margin-top: 7px;
          color: #5E738B;
          line-height: 1.7;
          font-weight: 750;
        }
        .site-map-featured-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }
        .site-map-feature-card {
          min-width: 0;
          min-height: 170px;
          display: grid;
          align-content: space-between;
          gap: 14px;
          padding: 18px;
          border: 1px solid rgba(226, 238, 248, 0.96);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.88);
          color: inherit;
          text-decoration: none;
          box-shadow: 0 14px 30px rgba(15, 37, 64, 0.07);
          transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
        }
        .site-map-feature-card:hover,
        .site-map-feature-card:focus-visible {
          transform: translateY(-4px);
          border-color: rgba(24, 212, 212, 0.55);
          background: #FFFFFF;
          box-shadow: 0 22px 46px rgba(15, 37, 64, 0.12);
          outline: none;
        }
        .featured-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          color: #EAF6FF;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          box-shadow: 0 16px 32px rgba(29, 140, 255, 0.18);
        }
        .site-map-feature-card strong {
          display: block;
          color: #0B1F38;
          font-size: 1.04rem;
          font-weight: 950;
        }
        .site-map-feature-card p {
          margin: 8px 0 0;
          color: #5E738B;
          line-height: 1.65;
          font-size: 0.9rem;
          font-weight: 700;
        }
        .site-map-feature-card em {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 6px;
          color: var(--sfm-primary);
          font-style: normal;
          font-weight: 950;
        }
        .site-map-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
          gap: 16px;
          align-items: start;
        }
        .site-map-group {
          align-content: start;
          border-radius: 26px;
          padding: 18px;
        }
        .site-map-group-head {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 12px;
          padding-bottom: 4px;
        }
        .site-map-group-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          color: var(--sfm-primary);
          background: rgba(29, 140, 255, 0.10);
          border: 1px solid rgba(29, 140, 255, 0.10);
        }
        .site-map-group h2 {
          margin: 0;
          color: #0B1F38;
          font-size: 1.1rem;
          font-weight: 950;
        }
        .site-map-group small {
          display: inline-flex;
          margin-top: 6px;
          padding: 4px 9px;
          border-radius: 999px;
          background: rgba(24, 212, 212, 0.10);
          color: var(--sfm-primary);
          font-size: 11px;
          font-weight: 950;
        }
        .site-map-routes {
          display: grid;
          gap: 10px;
        }
        .site-map-route-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          min-width: 0;
          padding: 13px;
          border-radius: 18px;
          border: 1px solid rgba(226, 238, 248, 0.94);
          background: rgba(255, 255, 255, 0.82);
          color: #0B1F38;
          text-decoration: none;
          box-shadow: 0 8px 22px rgba(15, 37, 64, 0.045);
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .site-map-route-card:hover,
        .site-map-route-card:focus-visible {
          transform: translateY(-3px);
          border-color: rgba(24, 212, 212, 0.58);
          background: #FFFFFF;
          box-shadow: 0 16px 34px rgba(15, 37, 64, 0.10);
          outline: none;
        }
        .site-map-route-card:hover .route-icon,
        .site-map-route-card:focus-visible .route-icon {
          color: #EAF6FF;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          box-shadow: 0 12px 24px rgba(29, 140, 255, 0.18);
        }
        .site-map-route-card:hover em,
        .site-map-route-card:focus-visible em {
          color: var(--sfm-accent);
        }
        .route-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
          transition: all 0.2s ease;
        }
        .site-map-routes strong,
        .site-map-routes p {
          display: block;
          margin: 0;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .site-map-routes strong {
          color: #0B1F38;
          font-size: 0.93rem;
          font-weight: 950;
        }
        .site-map-routes p {
          color: #5E738B;
          font-size: 0.8rem;
          line-height: 1.55;
          font-weight: 700;
          margin-top: 3px;
        }
        .site-map-routes em {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--sfm-primary);
          font-size: 12px;
          font-style: normal;
          font-weight: 950;
          transition: color 0.2s ease;
        }
        [dir="ltr"] .site-map-routes em svg {
          transform: rotate(180deg);
        }
        .site-map-empty {
          min-height: 110px;
          display: grid;
          place-items: center;
          gap: 8px;
          border: 1px dashed rgba(29, 140, 255, 0.22);
          border-radius: 18px;
          background: rgba(248, 251, 255, 0.72);
          color: #5E738B;
          font-weight: 900;
        }
        @media (max-width: 720px) {
          .sfm-page-topbar {
            display: none;
          }
          .site-map-featured {
            padding: 16px;
            border-radius: 22px;
          }
          .site-map-featured-grid,
          .site-map-grid {
            grid-template-columns: 1fr;
          }
          .site-map-route-card {
            grid-template-columns: auto minmax(0, 1fr);
          }
          .site-map-routes em {
            grid-column: 2;
          }
        }
        @media (min-width: 721px) and (max-width: 1080px) {
          .site-map-featured-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
