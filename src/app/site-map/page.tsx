'use client';

import Link from 'next/link';
import { ExternalLink, MapPinned } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { CardsGrid } from '@/components/layout/LayoutPrimitives';
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
    incomeDesc: 'إدارة مصادر الدخل.',
    expensesDesc: 'إدارة المصروفات والفواتير.',
    savingsDesc: 'متابعة المدخرات.',
    goalsDesc: 'متابعة الأهداف المالية.',
    zakatDesc: 'حساب الزكاة والحول والسجل.',
    investDesc: 'إدارة الاستثمارات والمحفظة.',
    marketDesc: 'تحليلات السوق وقائمة المتابعة والتنبيهات.',
    projectsDesc: 'قائمة المشاريع ونقاط الدخول لمساحات العمل.',
    businessDesc: 'الجاهزية، التمويل، التأسيس، والمستندات الاستراتيجية.',
    documentsDesc: 'مستندات وعروض المشاريع داخل مركز الأعمال.',
    charityDesc: 'تسجيل أعمال الخير السريعة.',
    charityProjectsDesc: 'المشاريع الخيرية والمستفيدون والمساهمون.',
    servicesDesc: 'أدلة خدمات مساعدة عند توفرها.',
    profileDesc: 'بيانات الحساب والملف الشخصي.',
    settingsDesc: 'تفضيلات تجربة التطبيق ووضع العرض.',
    securityDesc: 'معلومات الأمان والخصوصية وإخلاء المسؤولية.',
  },
  en: {
    title: 'THE SFM Map',
    subtitle: 'A short guide to where each part of the platform lives and what it does.',
    eyebrow: 'Platform organization',
    open: 'Open',
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
    incomeDesc: 'Manage income sources.',
    expensesDesc: 'Manage expenses and receipts.',
    savingsDesc: 'Track savings.',
    goalsDesc: 'Track financial goals.',
    zakatDesc: 'Zakat, hawl, and saved calculation history.',
    investDesc: 'Manage investments and portfolio records.',
    marketDesc: 'Market analysis, watchlist, and alerts.',
    projectsDesc: 'Project list and workspace entry points.',
    businessDesc: 'Readiness, funding, jurisdiction, and strategic documents.',
    documentsDesc: 'Project documents and pitch decks inside Business Hub.',
    charityDesc: 'Quick charity logging.',
    charityProjectsDesc: 'Charity projects, beneficiaries, and contributors.',
    servicesDesc: 'Supporting service directories when available.',
    profileDesc: 'Account and profile information.',
    settingsDesc: 'App experience preferences and view mode.',
    securityDesc: 'Security, privacy, and disclaimer information.',
  },
  fr: {
    title: 'Carte THE SFM',
    subtitle: 'Un guide court pour comprendre où se trouve chaque partie de la plateforme.',
    eyebrow: 'Organisation de la plateforme',
    open: 'Ouvrir',
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
    incomeDesc: 'Gérer les sources de revenus.',
    expensesDesc: 'Gérer les dépenses et reçus.',
    savingsDesc: 'Suivre l’épargne.',
    goalsDesc: 'Suivre les objectifs financiers.',
    zakatDesc: 'Zakat, hawl et historique des calculs sauvegardés.',
    investDesc: 'Gérer les investissements et le portefeuille.',
    marketDesc: 'Analyse de marché, liste de suivi et alertes.',
    projectsDesc: 'Liste des projets et accès aux espaces de travail.',
    businessDesc: 'Préparation, financement, juridiction et documents stratégiques.',
    documentsDesc: 'Documents projet et pitch decks dans le Centre d’affaires.',
    charityDesc: 'Enregistrement rapide des actions caritatives.',
    charityProjectsDesc: 'Projets caritatifs, bénéficiaires et contributeurs.',
    servicesDesc: 'Répertoires de services d’aide lorsqu’ils sont disponibles.',
    profileDesc: 'Informations du compte et du profil.',
    settingsDesc: 'Préférences d’expérience et mode d’affichage.',
    securityDesc: 'Informations de sécurité, confidentialité et avertissements.',
  },
} as const;

const PURPOSE_KEY: Record<string, keyof typeof TEXT.ar> = {
  home: 'dashboardDesc',
  'command-center': 'commandDesc',
  today: 'todayDesc',
  tasks: 'tasksDesc',
  notif: 'notificationsDesc',
  'reports-center': 'reportsDesc',
  income: 'incomeDesc',
  expenses: 'expensesDesc',
  savings: 'savingsDesc',
  goals: 'goalsDesc',
  zakat: 'zakatDesc',
  invest: 'investDesc',
  'market-analysis': 'marketDesc',
  watchlist: 'marketDesc',
  'market-alerts': 'marketDesc',
  projects: 'projectsDesc',
  'business-hub': 'businessDesc',
  documents: 'documentsDesc',
  'pitch-decks': 'documentsDesc',
  charity: 'charityDesc',
  'charity-projects': 'charityProjectsDesc',
  beneficiaries: 'charityProjectsDesc',
  'charity-reports': 'reportsDesc',
  'investment-firms': 'servicesDesc',
  'accounting-firms': 'servicesDesc',
  'feasibility-firms': 'servicesDesc',
  'advisory-firms': 'servicesDesc',
  profile: 'profileDesc',
  settings: 'settingsDesc',
  security: 'securityDesc',
};

export default function SiteMapPage() {
  const { lang, dir, t } = useLanguage();
  const text = TEXT[(lang as Lang) || 'ar'];

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

        <CardsGrid>
          {NAV_GROUPS.map(group => (
            <AppCard key={group.id} className="site-map-group">
              <h2>{t(group.labelKey)}</h2>
              <div className="site-map-routes">
                {group.items.filter(item => item.href).map(item => {
                  const purposeKey = PURPOSE_KEY[item.id] ?? 'siteMapDesc';
                  const Icon = item.icon;
                  return (
                    <Link key={item.id} href={item.href ?? '/dashboard'}>
                      <span className="route-icon" aria-hidden="true"><Icon size={18} /></span>
                      <div>
                        <strong>{t(item.labelKey)}</strong>
                        <p>{text[purposeKey]}</p>
                      </div>
                      <em>{text.open}<ExternalLink size={13} /></em>
                    </Link>
                  );
                })}
              </div>
            </AppCard>
          ))}
          <AppCard className="site-map-group">
            <h2>{text.extra}</h2>
            <div className="site-map-routes">
              <Link href="/site-map">
                <span className="route-icon" aria-hidden="true"><MapPinned size={18} /></span>
                <div>
                  <strong>{text.siteMap}</strong>
                  <p>{text.siteMapDesc}</p>
                </div>
                <em>{text.open}<ExternalLink size={13} /></em>
              </Link>
              <Link href="/setup">
                <span className="route-icon" aria-hidden="true"><MapPinned size={18} /></span>
                <div>
                  <strong>{text.setup}</strong>
                  <p>{text.setupDesc}</p>
                </div>
                <em>{text.open}<ExternalLink size={13} /></em>
              </Link>
            </div>
          </AppCard>
        </CardsGrid>
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
          gap: var(--sfm-section-gap);
        }
        .sfm-page-topbar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
        }
        .site-map-group {
          display: grid;
          gap: 14px;
        }
        .site-map-group h2 {
          margin: 0;
          color: var(--sfm-primary-dark);
          font-size: 20px;
        }
        .site-map-routes {
          display: grid;
          gap: 8px;
        }
        .site-map-routes a {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          min-width: 0;
          padding: 10px;
          border-radius: 14px;
          border: 1px solid rgba(29, 140, 255, .12);
          background: #F8FBFF;
          color: var(--sfm-foreground);
          text-decoration: none;
        }
        .route-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
        }
        .site-map-routes strong,
        .site-map-routes p {
          display: block;
          margin: 0;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .site-map-routes strong {
          color: var(--sfm-primary-dark);
          font-size: 14px;
        }
        .site-map-routes p {
          color: var(--sfm-muted);
          font-size: 12px;
          line-height: 1.5;
        }
        .site-map-routes em {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--sfm-primary);
          font-size: 12px;
          font-style: normal;
          font-weight: 950;
        }
        @media (max-width: 720px) {
          .sfm-page-topbar {
            display: none;
          }
          .site-map-routes a {
            grid-template-columns: auto minmax(0, 1fr);
          }
          .site-map-routes em {
            grid-column: 2;
          }
        }
      `}</style>
    </div>
  );
}
