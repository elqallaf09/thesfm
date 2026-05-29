'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  ChevronLeft,
  LayoutDashboard,
  MapPinned,
  ReceiptText,
  Search,
  Target,
  Wallet,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { NAV_GROUPS, SUPPORT_LINKS, type TranslationKey } from '@/components/navigationConfig';
import { useLanguage } from '@/hooks/useLanguage';

type Lang = 'ar' | 'en' | 'fr';
type IconType = ComponentType<{ size?: number }>;

const TEXT = {
  ar: {
    title: 'خريطة THE SFM',
    subtitle: 'مركز تنقل منظم يساعدك على الوصول إلى كل صفحة وأداة مالية بسرعة ووضوح.',
    eyebrow: 'تنظيم المنصة',
    open: 'فتح',
    featuredTitle: 'وصول سريع',
    featuredSubtitle: 'أهم الصفحات التي تحتاجها يومياً لإدارة المال والقرارات والتقارير.',
    searchPlaceholder: 'ابحث عن صفحة أو أداة...',
    noResults: 'لا توجد نتائج مطابقة',
    linkCount: '{count} صفحة',
    noPages: 'لا توجد صفحات حالياً',
    mainSections: 'الأقسام الرئيسية',
    mainGroupDesc: 'لوحة القيادة، المهام، التقارير، والتنقل اليومي داخل المنصة.',
    personalFinanceGroupDesc: 'الدخل، المصاريف، الادخار، والأهداف المالية الشخصية.',
    financialAiGroupDesc: 'المساعد الذكي، التحليل المالي، والتوصيات المبنية على بياناتك.',
    investmentGroupDesc: 'المحفظة الاستثمارية وتحليلات السوق والمتابعة.',
    businessGroupDesc: 'إدارة المشاريع، الأعمال، العروض الاستثمارية، والعمليات.',
    charityGroupDesc: 'الزكاة، الأعمال الخيرية، المشاريع، والمستفيدون.',
    servicesGroupDesc: 'أدلة الخدمات المالية والمحاسبية والاستشارية المتاحة.',
    accountGroupDesc: 'إعدادات الحساب والملف الشخصي والأمان.',
    supportGroupDesc: 'صفحات مساعدة للتعريف بالمنصة والدعم وخريطة الموقع.',
    siteMapDesc: 'هذه الصفحة تساعدك على فهم بنية التطبيق والتنقل بين أقسامه.',
    dashboardDesc: 'نظرة تنفيذية مختصرة على بياناتك الحقيقية.',
    commandDesc: 'بوابة منظمة إلى العوالم الرئيسية في التطبيق.',
    decisionsDesc: 'تحليل قرار مالي قبل الشراء أو الاستثمار أو الالتزام.',
    todayDesc: 'ما يحتاج انتباهك اليوم فقط.',
    theoriesDesc: 'مكتبة مبسطة لفهم قواعد المال والاستثمار.',
    tasksDesc: 'مهام عملية من بياناتك الفعلية وما يحتاج إكمالاً أو مراجعة.',
    notificationsDesc: 'تنبيهات ذكية من بياناتك وتنبيهاتك الفعلية.',
    reportsDesc: 'مركز التقارير والملفات القابلة للتصدير.',
    documentsCenterDesc: 'مركز موحد لكل مستندات المشاريع والخير والإيصالات والتقارير.',
    incomeDesc: 'إدارة مصادر الدخل.',
    expensesDesc: 'إدارة المصروفات والفواتير.',
    savingsDesc: 'متابعة المدخرات.',
    goalsDesc: 'متابعة الأهداف المالية.',
    zakatDesc: 'حساب الزكاة والحول والسجل.',
    investDesc: 'إدارة الاستثمارات والمحفظة.',
    marketDesc: 'تحليلات السوق مع قوائم المتابعة والتنبيهات.',
    projectsDesc: 'قائمة المشاريع ونقاط الدخول لمساحات العمل.',
    businessDesc: 'الجاهزية، التمويل، التأسيس، والمستندات الاستراتيجية.',
    investmentOffersDesc: 'مركز مواد المستثمرين: Pitch Deck والجاهزية والمستندات.',
    operationsDesc: 'إدارة الموظفين والفواتير والموردين والعمليات.',
    charityDesc: 'تسجيل أعمال الخير السريعة.',
    charityProjectsDesc: 'المشاريع الخيرية والمستفيدون والمساهمون.',
    beneficiariesDesc: 'تتبع المستفيدين ضمن المشاريع الخيرية.',
    charityReportsDesc: 'تقارير الخير والمتابعة المالية للمساهمات.',
    servicesDesc: 'دليل خدمات مساعد عند توفرها.',
    profileDesc: 'بيانات الحساب والملف الشخصي.',
    securityDesc: 'معلومات الأمان والخصوصية وإخلاء المسؤولية.',
    aboutDesc: 'صفحة عامة تشرح مهمة THE SFM ومبادئ الثقة والبيانات الحقيقية.',
    faqDesc: 'إجابات سريعة عن الأسئلة الشائعة.',
    contactDesc: 'قنوات التواصل والدعم.',
    aiDesc: 'تحليلات الذكاء المالي والتوصيات المبنية على بياناتك.',
    smartAssistantDesc: 'مساعد ذكي يعمل على بياناتك المتاحة عند توفرها.',
  },
  en: {
    title: 'THE SFM Map',
    subtitle: 'A structured navigation hub for finding every financial page and tool quickly.',
    eyebrow: 'Platform organization',
    open: 'Open',
    featuredTitle: 'Quick access',
    featuredSubtitle: 'The daily pages for money, decisions, reports, and financial intelligence.',
    searchPlaceholder: 'Search for a page or tool...',
    noResults: 'No matching results',
    linkCount: '{count} pages',
    noPages: 'No pages right now',
    mainSections: 'Main sections',
    mainGroupDesc: 'Dashboard, tasks, reports, and day-to-day platform navigation.',
    personalFinanceGroupDesc: 'Income, expenses, savings, and personal financial goals.',
    financialAiGroupDesc: 'Smart assistant, financial analysis, and recommendations based on your data.',
    investmentGroupDesc: 'Investment portfolio, market analysis, watchlists, and alerts.',
    businessGroupDesc: 'Projects, business management, investor materials, and operations.',
    charityGroupDesc: 'Zakat, charity giving, charity projects, and beneficiaries.',
    servicesGroupDesc: 'Available financial, accounting, feasibility, and advisory directories.',
    accountGroupDesc: 'Profile, account settings, privacy, and security.',
    supportGroupDesc: 'Helpful pages for learning about the platform and getting support.',
    siteMapDesc: 'This page helps you understand the app structure and move between sections.',
    dashboardDesc: 'A concise executive overview of your real data.',
    commandDesc: 'A clean gateway into the main worlds of the app.',
    decisionsDesc: 'Analyze a financial decision before buying, investing, or committing.',
    todayDesc: 'Only what needs attention today.',
    theoriesDesc: 'A simple library for understanding money and investment principles.',
    tasksDesc: 'Actionable tasks from your real data and items needing completion.',
    notificationsDesc: 'Smart alerts from your real data and saved alerts.',
    reportsDesc: 'Report center and exportable files.',
    documentsCenterDesc: 'Unified center for project, charity, receipt, and report documents.',
    incomeDesc: 'Manage income sources.',
    expensesDesc: 'Manage expenses and receipts.',
    savingsDesc: 'Track savings.',
    goalsDesc: 'Track financial goals.',
    zakatDesc: 'Zakat, hawl, and saved calculation history.',
    investDesc: 'Manage investments and portfolio records.',
    marketDesc: 'Market analysis with watchlist and alert tabs.',
    projectsDesc: 'Project list and workspace entry points.',
    businessDesc: 'Readiness, funding, jurisdiction, and strategic documents.',
    investmentOffersDesc: 'Investor-ready materials: pitch deck, funding readiness, and strategic documents.',
    operationsDesc: 'Manage employees, invoices, suppliers, and operational records.',
    charityDesc: 'Quick charity logging.',
    charityProjectsDesc: 'Charity projects, beneficiaries, and contributors.',
    beneficiariesDesc: 'Track beneficiaries inside charity projects.',
    charityReportsDesc: 'Charity reporting and contribution follow-up.',
    servicesDesc: 'Supporting service directories when available.',
    profileDesc: 'Account and profile information.',
    securityDesc: 'Security, privacy, and disclaimer information.',
    aboutDesc: 'Public page explaining THE SFM mission, trust principles, and real-data approach.',
    faqDesc: 'Fast answers to common questions.',
    contactDesc: 'Contact and support channels.',
    aiDesc: 'Financial intelligence analysis and recommendations based on your data.',
    smartAssistantDesc: 'A smart assistant that works from your available data when it exists.',
  },
  fr: {
    title: 'Carte THE SFM',
    subtitle: 'Un hub de navigation structuré pour trouver rapidement chaque page et outil financier.',
    eyebrow: 'Organisation de la plateforme',
    open: 'Ouvrir',
    featuredTitle: 'Accès rapide',
    featuredSubtitle: 'Les pages quotidiennes pour l’argent, les décisions, les rapports et l’intelligence financière.',
    searchPlaceholder: 'Rechercher une page ou un outil...',
    noResults: 'Aucun résultat correspondant',
    linkCount: '{count} pages',
    noPages: 'Aucune page pour le moment',
    mainSections: 'Sections principales',
    mainGroupDesc: 'Tableau de bord, tâches, rapports et navigation quotidienne.',
    personalFinanceGroupDesc: 'Revenus, dépenses, épargne et objectifs financiers personnels.',
    financialAiGroupDesc: 'Assistant intelligent, analyse financière et recommandations basées sur vos données.',
    investmentGroupDesc: 'Portefeuille, analyse de marché, listes de suivi et alertes.',
    businessGroupDesc: 'Projets, gestion d’entreprise, documents investisseurs et opérations.',
    charityGroupDesc: 'Zakat, dons, projets caritatifs et bénéficiaires.',
    servicesGroupDesc: 'Annuaires financiers, comptables, faisabilité et conseil.',
    accountGroupDesc: 'Profil, paramètres du compte, confidentialité et sécurité.',
    supportGroupDesc: 'Pages utiles pour comprendre la plateforme et contacter le support.',
    siteMapDesc: 'Cette page aide à comprendre la structure de l’application et à naviguer.',
    dashboardDesc: 'Vue exécutive concise de vos données réelles.',
    commandDesc: 'Passerelle claire vers les principaux univers de l’application.',
    decisionsDesc: 'Analyser une décision financière avant un achat, investissement ou engagement.',
    todayDesc: 'Seulement ce qui demande votre attention aujourd’hui.',
    theoriesDesc: 'Bibliothèque simple pour comprendre les principes financiers.',
    tasksDesc: 'Tâches actionnables issues de vos données réelles.',
    notificationsDesc: 'Alertes intelligentes issues de vos données réelles.',
    reportsDesc: 'Centre de rapports et fichiers exportables.',
    documentsCenterDesc: 'Centre unifié pour les documents projets, reçus, dons et rapports.',
    incomeDesc: 'Gérer les sources de revenus.',
    expensesDesc: 'Gérer les dépenses et reçus.',
    savingsDesc: 'Suivre l’épargne.',
    goalsDesc: 'Suivre les objectifs financiers.',
    zakatDesc: 'Zakat, hawl et historique des calculs sauvegardés.',
    investDesc: 'Gérer les investissements et le portefeuille.',
    marketDesc: 'Analyse du marché avec suivi et alertes.',
    projectsDesc: 'Liste des projets et accès aux espaces de travail.',
    businessDesc: 'Préparation, financement, juridiction et documents stratégiques.',
    investmentOffersDesc: 'Éléments prêts pour investisseurs: pitch deck, financement et documents.',
    operationsDesc: 'Gérer employés, factures, fournisseurs et opérations.',
    charityDesc: 'Enregistrement rapide des actions caritatives.',
    charityProjectsDesc: 'Projets caritatifs, bénéficiaires et contributeurs.',
    beneficiariesDesc: 'Suivre les bénéficiaires des projets caritatifs.',
    charityReportsDesc: 'Rapports caritatifs et suivi des contributions.',
    servicesDesc: 'Répertoires de services d’aide lorsqu’ils sont disponibles.',
    profileDesc: 'Informations du compte et du profil.',
    securityDesc: 'Sécurité, confidentialité et avertissements.',
    aboutDesc: 'Page publique expliquant la mission de THE SFM, la confiance et les données réelles.',
    faqDesc: 'Réponses rapides aux questions fréquentes.',
    contactDesc: 'Canaux de contact et support.',
    aiDesc: 'Analyse financière intelligente et recommandations basées sur vos données.',
    smartAssistantDesc: 'Un assistant intelligent qui travaille avec vos données disponibles lorsqu’elles existent.',
  },
} as const;

const PURPOSE_KEY: Record<string, keyof typeof TEXT.ar> = {
  home: 'dashboardDesc',
  'command-center': 'commandDesc',
  decisions: 'decisionsDesc',
  today: 'todayDesc',
  'financial-theories': 'theoriesDesc',
  tasks: 'tasksDesc',
  notif: 'notificationsDesc',
  'reports-center': 'reportsDesc',
  'documents-center': 'documentsCenterDesc',
  income: 'incomeDesc',
  expenses: 'expensesDesc',
  savings: 'savingsDesc',
  goals: 'goalsDesc',
  'smart-assistant': 'smartAssistantDesc',
  zakat: 'zakatDesc',
  invest: 'investDesc',
  'market-analysis': 'marketDesc',
  projects: 'projectsDesc',
  'business-hub': 'businessDesc',
  'investment-offers': 'investmentOffersDesc',
  'business-operations': 'operationsDesc',
  charity: 'charityDesc',
  'charity-projects': 'charityProjectsDesc',
  beneficiaries: 'beneficiariesDesc',
  'charity-reports': 'charityReportsDesc',
  'investment-firms': 'servicesDesc',
  'accounting-firms': 'servicesDesc',
  'feasibility-firms': 'servicesDesc',
  'advisory-firms': 'servicesDesc',
  profile: 'profileDesc',
  security: 'securityDesc',
  'support-about': 'aboutDesc',
  'support-faq': 'faqDesc',
  'support-site-map': 'siteMapDesc',
  'support-contact': 'contactDesc',
};

const GROUP_DESC_KEY: Record<string, keyof typeof TEXT.ar> = {
  main: 'mainGroupDesc',
  'personal-finance': 'personalFinanceGroupDesc',
  'financial-intelligence': 'financialAiGroupDesc',
  'investment-market': 'investmentGroupDesc',
  'business-projects': 'businessGroupDesc',
  charity: 'charityGroupDesc',
  services: 'servicesGroupDesc',
  account: 'accountGroupDesc',
  support: 'supportGroupDesc',
};

const FEATURED_ITEMS = [
  { id: 'home', href: '/dashboard', icon: LayoutDashboard, labelKey: 'nav_home' as TranslationKey, purposeKey: 'dashboardDesc' as const },
  { id: 'income', href: '/income', icon: Wallet, labelKey: 'nav_income' as TranslationKey, purposeKey: 'incomeDesc' as const },
  { id: 'expenses', href: '/expenses', icon: ReceiptText, labelKey: 'nav_expenses' as TranslationKey, purposeKey: 'expensesDesc' as const },
  { id: 'goals', href: '/goals', icon: Target, labelKey: 'nav_goals' as TranslationKey, purposeKey: 'goalsDesc' as const },
  { id: 'reports-center', href: '/reports-center', icon: BarChart3, labelKey: 'nav_reports_center' as TranslationKey, purposeKey: 'reportsDesc' as const },
  { id: 'ai', href: '/ai', icon: BrainCircuit, labelKey: 'nav_ai' as TranslationKey, purposeKey: 'aiDesc' as const },
] as const;

function countText(template: string, count: number) {
  return template.replace('{count}', String(count));
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

export default function SiteMapPage() {
  const { lang, dir, t } = useLanguage();
  const text = TEXT[(lang as Lang) || 'ar'];
  const [query, setQuery] = useState('');
  const normalizedQuery = normalize(query);

  const groups = useMemo(() => {
    const sourceGroups = [
      ...NAV_GROUPS,
      {
        id: 'support',
        labelKey: 'nav_group_support' as TranslationKey,
        items: SUPPORT_LINKS,
      },
    ];

    return sourceGroups.map(group => {
      const title = t(group.labelKey);
      const description = text[GROUP_DESC_KEY[group.id] ?? 'siteMapDesc'];
      const routes = group.items
        .filter(item => item.href)
        .map(item => {
          const routeDescription = text[PURPOSE_KEY[item.id] ?? 'siteMapDesc'];
          const label = t(item.labelKey);
          return {
            id: item.id,
            href: item.href ?? '/',
            icon: item.icon as IconType,
            label,
            description: routeDescription,
            keywords: normalize(`${title} ${label} ${routeDescription}`),
          };
        })
        .filter(item => !normalizedQuery || item.keywords.includes(normalizedQuery));

      return {
        id: group.id,
        title,
        description,
        icon: (group.items.find(item => item.href)?.icon ?? MapPinned) as IconType,
        routes,
      };
    }).filter(group => !normalizedQuery || group.routes.length > 0);
  }, [normalizedQuery, t, text]);

  const featuredItems = useMemo(() => (
    FEATURED_ITEMS.map(item => {
      const label = t(item.labelKey);
      const description = text[item.purposeKey];
      return {
        ...item,
        label,
        description,
        keywords: normalize(`${label} ${description}`),
      };
    }).filter(item => !normalizedQuery || item.keywords.includes(normalizedQuery))
  ), [normalizedQuery, t, text]);

  const hasResults = featuredItems.length > 0 || groups.some(group => group.routes.length > 0);

  return (
    <div className="site-map-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.title} contentClassName="site-map-content">
        <div className="sfm-page-topbar site-map-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <PageHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          icon={<MapPinned size={28} />}
        />

        <section className="site-map-search-panel" aria-label={text.searchPlaceholder}>
          <label className="site-map-search-field">
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={text.searchPlaceholder}
              aria-label={text.searchPlaceholder}
            />
          </label>
        </section>

        {featuredItems.length > 0 ? (
          <section className="site-map-featured" aria-labelledby="site-map-featured-title">
            <div className="site-map-section-head">
              <div>
                <p>{text.eyebrow}</p>
                <h2 id="site-map-featured-title">{text.featuredTitle}</h2>
                <span>{text.featuredSubtitle}</span>
              </div>
            </div>
            <div className="site-map-featured-grid">
              {featuredItems.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    className="site-map-feature-card"
                    href={item.href}
                    aria-label={`${text.open}: ${item.label}`}
                  >
                    <span className="featured-icon" aria-hidden="true"><Icon size={24} /></span>
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.description}</p>
                    </div>
                    <em>{text.open}<ArrowUpRight size={15} /></em>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {hasResults ? (
          <section className="site-map-main-section" aria-labelledby="site-map-main-title">
            <div className="site-map-section-head">
              <div>
                <p>{text.eyebrow}</p>
                <h2 id="site-map-main-title">{text.mainSections}</h2>
                <span>{text.subtitle}</span>
              </div>
            </div>

            <div className="site-map-grid">
              {groups.map(group => {
                const GroupIcon = group.icon;
                return (
                  <article key={group.id} className="site-map-group">
                    <div className="site-map-group-head">
                      <span className="site-map-group-icon" aria-hidden="true">
                        <GroupIcon size={20} />
                      </span>
                      <div>
                        <h3>{group.title}</h3>
                        <p>{group.description}</p>
                        <small>{countText(text.linkCount, group.routes.length)}</small>
                      </div>
                    </div>

                    <div className="site-map-routes">
                      {group.routes.length ? group.routes.map(item => {
                        const Icon = item.icon;
                        return (
                          <Link
                            className="site-map-route-card"
                            key={item.id}
                            href={item.href}
                            aria-label={`${text.open}: ${item.label}`}
                          >
                            <span className="route-icon" aria-hidden="true"><Icon size={18} /></span>
                            <div>
                              <strong>{item.label}</strong>
                              <p>{item.description}</p>
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
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="site-map-no-results" aria-live="polite">
            <Search size={28} aria-hidden="true" />
            <h2>{text.noResults}</h2>
            <p>{text.searchPlaceholder}</p>
          </section>
        )}
      </DashboardPageShell>

      <style jsx global>{`
        .site-map-shell {
          --background: #F5FAFF;
          --card: rgba(255, 255, 255, 0.94);
          --card-foreground: #0B1F38;
          --muted: #EAF3FC;
          --muted-foreground: #5E738B;
          --border: rgba(226, 238, 248, 0.96);
          --primary: #1D8CFF;
          --site-map-page-background:
            radial-gradient(circle at 18% 12%, rgba(29, 140, 255, .10), transparent 34%),
            linear-gradient(160deg, var(--background), #F8FBFF 62%, #E7F1FF 100%);
          --site-map-section-background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 252, 255, 0.86)),
            radial-gradient(circle at 0 0, rgba(24, 212, 212, 0.10), transparent 42%);
          --site-map-card-hover-background: #FFFFFF;
          --site-map-card-hover-border: rgba(24, 212, 212, 0.62);
          --site-map-icon-background: rgba(29, 140, 255, 0.10);
          --site-map-shadow: 0 18px 44px rgba(15, 37, 64, 0.08);
          --site-map-card-shadow: 0 14px 30px rgba(15, 37, 64, 0.07);
          --site-map-card-hover-shadow: 0 22px 46px rgba(15, 37, 64, 0.12);
          min-height: 100vh;
          background: var(--site-map-page-background);
          color: var(--card-foreground);
          overflow-x: hidden;
        }

        .dark .site-map-shell {
          --background: #061A2E;
          --card: #102F52;
          --card-foreground: #F8FAFC;
          --muted: #0B2A4A;
          --muted-foreground: #CBD5E1;
          --border: rgba(255, 255, 255, 0.10);
          --primary: #22D3EE;
          --site-map-page-background:
            radial-gradient(circle at 18% 12%, rgba(34, 211, 238, 0.10), transparent 34%),
            linear-gradient(160deg, #061A2E 0%, #071B2F 58%, #061A2E 100%);
          --site-map-section-background:
            linear-gradient(180deg, rgba(11, 42, 74, 0.98), rgba(8, 32, 57, 0.96)),
            radial-gradient(circle at 0 0, rgba(34, 211, 238, 0.12), transparent 42%);
          --site-map-card-hover-background: #143B63;
          --site-map-card-hover-border: #22D3EE;
          --site-map-icon-background: rgba(34, 211, 238, 0.14);
          --site-map-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
          --site-map-card-shadow: 0 14px 32px rgba(0, 0, 0, 0.24);
          --site-map-card-hover-shadow: 0 22px 48px rgba(0, 0, 0, 0.30);
        }

        .site-map-shell .sfm-dashboard-page-shell {
          box-sizing: border-box !important;
          width: auto !important;
          max-width: none !important;
          margin: 0 !important;
          margin-inline-start: var(--sidebar-w) !important;
          margin-inline-end: 0 !important;
          padding: 24px !important;
          overflow-x: clip !important;
        }

        .site-map-content {
          display: grid;
          gap: 24px;
          width: 100%;
          max-width: 1280px !important;
          margin-inline: auto !important;
          min-width: 0;
        }

        .site-map-topbar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
        }

        .site-map-search-panel,
        .site-map-featured,
        .site-map-main-section,
        .site-map-no-results {
          border: 1px solid var(--border);
          background: var(--site-map-section-background);
          box-shadow: var(--site-map-shadow);
          backdrop-filter: blur(12px);
        }

        .site-map-search-panel {
          border-radius: 22px;
          padding: 14px;
        }

        .site-map-search-field {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 56px;
          padding: 0 16px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--card);
          color: var(--primary);
          box-shadow: 0 10px 26px rgba(15, 37, 64, 0.06);
        }

        .site-map-search-field input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--card-foreground);
          font: inherit;
          font-weight: 850;
        }

        .site-map-search-field input::placeholder {
          color: var(--muted-foreground);
          opacity: 1;
        }

        .site-map-search-field:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.14);
        }

        .site-map-featured,
        .site-map-main-section {
          display: grid;
          gap: 18px;
          border-radius: 24px;
          padding: 20px;
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
          color: var(--primary);
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0;
        }

        .site-map-section-head h2 {
          margin-top: 5px;
          color: var(--card-foreground);
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 950;
        }

        .site-map-section-head span {
          display: block;
          max-width: 760px;
          margin-top: 7px;
          color: var(--muted-foreground);
          line-height: 1.7;
          font-weight: 750;
        }

        .site-map-featured-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          align-items: stretch;
        }

        .site-map-feature-card,
        .site-map-group,
        .site-map-route-card {
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--card-foreground);
          text-decoration: none;
          box-shadow: var(--site-map-card-shadow);
          transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
        }

        .site-map-feature-card {
          min-width: 0;
          min-height: 148px;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          gap: 10px;
          padding: 15px;
          border-radius: 22px;
        }

        .site-map-feature-card:hover,
        .site-map-feature-card:focus-visible,
        .site-map-route-card:hover,
        .site-map-route-card:focus-visible {
          transform: translateY(-4px);
          border-color: var(--site-map-card-hover-border);
          background: var(--site-map-card-hover-background);
          box-shadow: var(--site-map-card-hover-shadow);
          outline: none;
        }

        .featured-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          color: #EAF6FF;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          box-shadow: 0 16px 32px rgba(29, 140, 255, 0.18);
        }

        .site-map-feature-card strong {
          display: block;
          color: var(--card-foreground);
          font-size: 1.02rem;
          font-weight: 950;
        }

        .site-map-feature-card p {
          margin: 8px 0 0;
          color: var(--muted-foreground);
          line-height: 1.5;
          font-size: 0.84rem;
          font-weight: 700;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .site-map-feature-card em,
        .site-map-route-card em {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 6px;
          color: var(--primary);
          font-style: normal;
          font-weight: 950;
        }

        .site-map-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 22px;
          align-items: start;
        }

        .site-map-group {
          display: grid;
          align-content: start;
          gap: 16px;
          min-width: 0;
          min-height: 0;
          border-radius: 22px;
          padding: 16px;
        }

        .site-map-group-head {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: start;
          gap: 12px;
        }

        .site-map-group-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          color: var(--primary);
          background: var(--site-map-icon-background);
          border: 1px solid var(--border);
        }

        .site-map-group h3 {
          margin: 0;
          color: var(--card-foreground);
          font-size: 1.1rem;
          font-weight: 950;
        }

        .site-map-group-head p {
          margin: 6px 0 0;
          color: var(--muted-foreground);
          font-size: 0.84rem;
          line-height: 1.55;
          font-weight: 750;
        }

        .site-map-group small {
          display: inline-flex;
          margin-top: 10px;
          padding: 4px 9px;
          border-radius: 999px;
          background: rgba(34, 211, 238, 0.12);
          color: var(--primary);
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
          gap: 10px;
          align-items: center;
          min-width: 0;
          min-height: 72px;
          padding: 11px;
          border-radius: 16px;
          box-shadow: 0 8px 22px rgba(15, 37, 64, 0.045);
        }

        .site-map-route-card:hover .route-icon,
        .site-map-route-card:focus-visible .route-icon {
          color: #EAF6FF;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          box-shadow: 0 12px 24px rgba(29, 140, 255, 0.18);
        }

        .route-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: var(--site-map-icon-background);
          color: var(--primary);
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
          color: var(--card-foreground);
          font-size: 0.94rem;
          font-weight: 950;
        }

        .site-map-routes p {
          color: var(--muted-foreground);
          font-size: 0.8rem;
          line-height: 1.45;
          font-weight: 700;
          margin-top: 3px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .site-map-routes em {
          font-size: 12px;
        }

        [dir="ltr"] .site-map-routes em svg {
          transform: rotate(180deg);
        }

        .site-map-empty,
        .site-map-no-results {
          min-height: 170px;
          display: grid;
          place-items: center;
          gap: 10px;
          text-align: center;
          border-radius: 22px;
          padding: 24px;
          color: var(--muted-foreground);
          font-weight: 900;
        }

        .site-map-empty {
          min-height: 88px;
          border: 1px dashed rgba(29, 140, 255, 0.24);
          background: var(--card);
        }

        .site-map-no-results h2,
        .site-map-no-results p {
          margin: 0;
        }

        .site-map-no-results h2 {
          color: var(--card-foreground);
          font-size: 1.35rem;
          font-weight: 950;
        }

        .site-map-no-results p {
          color: var(--muted-foreground);
        }

        @media (max-width: 1024px) {
          .site-map-shell .sfm-dashboard-page-shell {
            width: 100% !important;
            margin-inline-start: 0 !important;
            margin-inline-end: 0 !important;
            padding: calc(78px + env(safe-area-inset-top)) 16px 52px !important;
          }

          .site-map-content {
            max-width: 100% !important;
          }
        }

        @media (min-width: 721px) and (max-width: 1080px) {
          .site-map-featured-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .site-map-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .site-map-topbar {
            display: none;
          }

          .site-map-featured,
          .site-map-main-section,
          .site-map-search-panel {
            border-radius: 20px;
            padding: 16px;
          }

          .site-map-featured-grid,
          .site-map-grid {
            grid-template-columns: 1fr;
          }

          .site-map-feature-card {
            min-height: 132px;
          }

          .site-map-route-card {
            grid-template-columns: auto minmax(0, 1fr);
            min-height: 76px;
          }

          .site-map-route-card em {
            grid-column: 2;
          }
        }
      `}</style>
    </div>
  );
}
