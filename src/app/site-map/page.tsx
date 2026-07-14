'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  LayoutDashboard,
  MapPinned,
  ReceiptText,
  Search,
  Target,
  Wallet,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
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
    toolsSupportTitle: 'الأدوات والدعم',
    accountSettingsTitle: 'الحساب والإعدادات',
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
    ebooksDesc: 'مكتبة كتب إلكترونية تعليمية تضم أدلة عملية قابلة للقراءة والتحميل.',
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
    toolsSupportTitle: 'Tools & Support',
    accountSettingsTitle: 'Account & Settings',
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
    ebooksDesc: 'An educational e-books library with practical guides to read and download.',
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
    toolsSupportTitle: 'Outils et support',
    accountSettingsTitle: 'Compte et paramètres',
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
    ebooksDesc: 'Bibliothèque de livres électroniques éducatifs à lire et télécharger.',
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
  ebooks: 'ebooksDesc',
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
  'trading-companies': 'servicesDesc',
  'accounting-firms': 'servicesDesc',
  'feasibility-firms': 'servicesDesc',
  'advisory-firms': 'servicesDesc',
  profile: 'profileDesc',
  security: 'securityDesc',
  'support-about': 'aboutDesc',
  'support-help-center': 'aboutDesc',
  'support-faq': 'faqDesc',
  'support-site-map': 'siteMapDesc',
  'support-contact': 'contactDesc',
  'support-privacy': 'securityDesc',
  'support-terms': 'siteMapDesc',
};

const FEATURED_ITEMS = [
  { id: 'home', href: '/dashboard', icon: LayoutDashboard, labelKey: 'nav_home' as TranslationKey, purposeKey: 'dashboardDesc' as const },
  { id: 'income', href: '/income', icon: Wallet, labelKey: 'nav_income' as TranslationKey, purposeKey: 'incomeDesc' as const },
  { id: 'expenses', href: '/expenses', icon: ReceiptText, labelKey: 'nav_expenses' as TranslationKey, purposeKey: 'expensesDesc' as const },
  { id: 'goals', href: '/goals', icon: Target, labelKey: 'nav_goals' as TranslationKey, purposeKey: 'goalsDesc' as const },
  { id: 'market-analysis', href: '/market-analysis', icon: BarChart3, labelKey: 'nav_market_analysis' as TranslationKey, purposeKey: 'marketDesc' as const },
  { id: 'reports-center', href: '/reports-center', icon: BarChart3, labelKey: 'nav_reports_center' as TranslationKey, purposeKey: 'reportsDesc' as const },
] as const;

const COMING_SOON_ROUTE_IDS = new Set<string>();

const CATEGORY_DEFS = [
  { id: 'main', groupIds: ['main', 'financial-intelligence'] },
  { id: 'personal-finance', groupIds: ['personal-finance'] },
  { id: 'investment-market', groupIds: ['investment-market'] },
  { id: 'business-projects', groupIds: ['business-projects'] },
  { id: 'charity', groupIds: ['charity'] },
  { id: 'tools-support', groupIds: ['services', 'support'] },
  { id: 'account', groupIds: ['account'] },
] as const;

const CATEGORY_LABEL_KEY: Record<string, TranslationKey> = {
  main: 'nav_group_main',
  'personal-finance': 'nav_group_personal_finance',
  'investment-market': 'nav_group_invest_market',
  'business-projects': 'nav_group_business_projects',
  charity: 'nav_group_charity',
  'tools-support': 'nav_group_support',
  account: 'nav_group_account',
};

const CATEGORY_DESC_KEY: Record<string, keyof typeof TEXT.ar> = {
  main: 'mainGroupDesc',
  'personal-finance': 'personalFinanceGroupDesc',
  'investment-market': 'investmentGroupDesc',
  'business-projects': 'businessGroupDesc',
  charity: 'charityGroupDesc',
  'tools-support': 'supportGroupDesc',
  account: 'accountGroupDesc',
};

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
  const [activeCategory, setActiveCategory] = useState<string>('main');
  const [openMobileCategory, setOpenMobileCategory] = useState<string>('main');
  const normalizedQuery = normalize(query);

  const sourceGroups = useMemo(() => [
    ...NAV_GROUPS,
    {
      id: 'support',
      labelKey: 'nav_group_support' as TranslationKey,
      items: SUPPORT_LINKS,
    },
  ], []);

  const allLinks = useMemo(() => {
    const sourceGroups = [
      ...NAV_GROUPS,
      {
        id: 'support',
        labelKey: 'nav_group_support' as TranslationKey,
        items: SUPPORT_LINKS,
      },
    ];

    return sourceGroups.flatMap(group => {
      const title = t(group.labelKey);
      return group.items
        .filter(item => item.href)
        .map(item => {
          const routeDescription = item.caption ?? text[PURPOSE_KEY[item.id] ?? 'siteMapDesc'];
          const label = t(item.labelKey);
          const isComingSoon = COMING_SOON_ROUTE_IDS.has(item.id);
          return {
            id: item.id,
            href: item.href ?? '/',
            icon: item.icon as IconType,
            label,
            description: routeDescription,
            external: item.external,
            isComingSoon,
            groupId: group.id,
            groupTitle: title,
            keywords: normalize(`${title} ${label} ${routeDescription} ${isComingSoon ? t('services.tradingCompanies.badge') : ''}`),
          };
        });
    });
  }, [t, text]);

  const searchResults = useMemo(() => (
    normalizedQuery ? allLinks.filter(item => item.keywords.includes(normalizedQuery)) : []
  ), [allLinks, normalizedQuery]);

  const categories = useMemo(() => CATEGORY_DEFS.map(category => {
    const routes = allLinks.filter(item => category.groupIds.includes(item.groupId as never));
    const firstGroup = sourceGroups.find(group => category.groupIds.includes(group.id as never));
    return {
      id: category.id,
      title: category.id === 'tools-support'
        ? text.toolsSupportTitle
        : category.id === 'account'
          ? text.accountSettingsTitle
          : t(CATEGORY_LABEL_KEY[category.id]),
      description: text[CATEGORY_DESC_KEY[category.id] ?? 'siteMapDesc'],
      icon: (firstGroup?.items.find(item => item.href && !item.external)?.icon ?? firstGroup?.items.find(item => item.href)?.icon ?? MapPinned) as IconType,
      routes,
    };
  }).filter(category => category.routes.length > 0), [allLinks, sourceGroups, t, text]);

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

  const selectedCategory = categories.find(category => category.id === activeCategory) ?? categories[0];
  const hasResults = normalizedQuery ? searchResults.length > 0 : categories.length > 0;

  return (
    <div className="site-map-shell" dir={dir}>
      <DashboardPageShell ariaLabel={text.title}>
        <WorkspacePageContainer variant="wide" className="site-map-content">
        <PageHero
          className="site-map-hero"
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
                <span>{normalizedQuery ? countText(text.linkCount, searchResults.length) : selectedCategory?.description}</span>
              </div>
            </div>

            {normalizedQuery ? (
              <div className="site-map-routes-grid search-results">
                {searchResults.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link
                      className="site-map-route-card"
                      key={`${item.groupId}-${item.id}`}
                      href={item.href}
                      aria-label={`${text.open}: ${item.label}`}
                      {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      <span className="route-icon" aria-hidden="true"><Icon size={19} /></span>
                      <div>
                        <small>{item.groupTitle}</small>
                        <strong>{item.label}{item.isComingSoon ? <span className="site-map-soon-badge">{t('services.tradingCompanies.badge')}</span> : null}</strong>
                        <p>{item.description}</p>
                      </div>
                      <em>{text.open}<ArrowUpRight size={14} /></em>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="site-map-tabs" role="tablist" aria-label={text.mainSections}>
                  {categories.map(category => {
                    const Icon = category.icon;
                    const selected = category.id === selectedCategory?.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        className={selected ? 'active' : ''}
                        onClick={() => setActiveCategory(category.id)}
                      >
                        <Icon size={17} />
                        {category.title}
                        <span>{category.routes.length}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="site-map-desktop-panel">
                  {selectedCategory ? (
                    <div className="site-map-routes-grid">
                      {selectedCategory.routes.map(item => {
                        const Icon = item.icon;
                        return (
                          <Link
                            className="site-map-route-card"
                            key={item.id}
                            href={item.href}
                            aria-label={`${text.open}: ${item.label}`}
                            {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          >
                            <span className="route-icon" aria-hidden="true"><Icon size={19} /></span>
                            <div>
                              <strong>{item.label}{item.isComingSoon ? <span className="site-map-soon-badge">{t('services.tradingCompanies.badge')}</span> : null}</strong>
                              <p>{item.description}</p>
                            </div>
                            <em>{text.open}<ArrowUpRight size={14} /></em>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="site-map-mobile-accordion">
                  {categories.map(category => {
                    const Icon = category.icon;
                    const open = openMobileCategory === category.id;
                    return (
                      <article className="site-map-accordion-item" key={category.id}>
                        <button type="button" onClick={() => setOpenMobileCategory(open ? '' : category.id)} aria-expanded={open}>
                          <span className="site-map-group-icon" aria-hidden="true"><Icon size={18} /></span>
                          <strong>{category.title}</strong>
                          <small>{countText(text.linkCount, category.routes.length)}</small>
                          <ChevronDown size={17} />
                        </button>
                        {open ? (
                          <div className="site-map-routes-grid">
                            {category.routes.map(item => {
                              const RouteIcon = item.icon;
                              return (
                                <Link
                                  className="site-map-route-card"
                                  key={item.id}
                                  href={item.href}
                                  aria-label={`${text.open}: ${item.label}`}
                                  {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                >
                                  <span className="route-icon" aria-hidden="true"><RouteIcon size={19} /></span>
                                  <div>
                                    <strong>{item.label}{item.isComingSoon ? <span className="site-map-soon-badge">{t('services.tradingCompanies.badge')}</span> : null}</strong>
                                    <p>{item.description}</p>
                                  </div>
                                  <em>{text.open}<ArrowUpRight size={14} /></em>
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        ) : (
          <section className="site-map-no-results" aria-live="polite">
            <Search size={28} aria-hidden="true" />
            <h2>{text.noResults}</h2>
            <p>{text.searchPlaceholder}</p>
          </section>
        )}
        </WorkspacePageContainer>
      </DashboardPageShell>

      <style jsx global>{`
        .site-map-shell {
          min-height: 100vh;
          background: var(--background);
          color: var(--foreground);
          font-family: var(--font-ui);
          overflow-x: hidden;
        }

        .site-map-content {
          display: grid;
          gap: 24px;
          min-width: 0;
        }

        .site-map-search-panel,
        .site-map-featured,
        .site-map-main-section,
        .site-map-no-results {
          border: 1px solid var(--border);
          background: var(--surface);
          box-shadow: var(--shadow-card);
        }

        .site-map-search-panel {
          border-radius: var(--radius-panel);
          padding: 14px;
        }

        .site-map-search-field {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 56px;
          padding: 0 16px;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--surface);
          color: var(--primary);
          box-shadow: var(--shadow-xs);
        }

        .site-map-search-field input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--foreground);
          font: inherit;
          font-weight: 500;
        }

        .site-map-search-field input::placeholder {
          color: var(--foreground-muted);
          opacity: 1;
        }

        .site-map-search-field:focus-within {
          border-color: var(--primary);
          box-shadow: var(--focus-shadow);
        }

        .site-map-featured,
        .site-map-main-section {
          display: grid;
          gap: 18px;
          border-radius: var(--radius-panel);
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
          font-weight: 600;
          letter-spacing: 0;
        }

        .site-map-section-head h2 {
          margin-top: 5px;
          color: var(--foreground);
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 600;
        }

        .site-map-section-head span {
          display: block;
          max-width: 760px;
          margin-top: 7px;
          color: var(--foreground-secondary);
          line-height: 1.7;
          font-weight: 400;
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
          background: var(--surface);
          color: var(--foreground);
          text-decoration: none;
          box-shadow: var(--shadow-card);
          transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
        }

        .site-map-feature-card {
          min-width: 0;
          min-height: 148px;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          gap: 10px;
          padding: 15px;
          border-radius: var(--radius-panel);
        }

        .site-map-feature-card:hover,
        .site-map-feature-card:focus-visible,
        .site-map-route-card:hover,
        .site-map-route-card:focus-visible {
          transform: translateY(-4px);
          border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
          background: var(--surface-hover);
          box-shadow: var(--shadow-md);
          outline: none;
        }

        .featured-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: var(--radius-card);
          color: var(--primary-foreground);
          background: var(--primary);
          box-shadow: var(--shadow-md);
        }

        .site-map-feature-card strong {
          display: block;
          color: var(--foreground);
          font-size: 1.02rem;
          font-weight: 600;
        }

        .site-map-feature-card p {
          margin: 8px 0 0;
          color: var(--foreground-secondary);
          line-height: 1.5;
          font-size: 0.84rem;
          font-weight: 400;
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
          font-weight: 600;
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
          border-radius: var(--radius-panel);
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
          border-radius: var(--radius-card);
          color: var(--primary);
          background: var(--primary-soft);
          border: 1px solid var(--border);
        }

        .site-map-group h3 {
          margin: 0;
          color: var(--foreground);
          font-size: 1.1rem;
          font-weight: 600;
        }

        .site-map-group-head p {
          margin: 6px 0 0;
          color: var(--foreground-secondary);
          font-size: 0.84rem;
          line-height: 1.55;
          font-weight: 400;
        }

        .site-map-group small {
          display: inline-flex;
          margin-top: 10px;
          padding: 4px 9px;
          border-radius: var(--radius-pill);
          background: var(--primary-soft);
          color: var(--primary);
          font-size: 12px;
          font-weight: 500;
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
          border-radius: var(--radius-card);
          box-shadow: var(--shadow-xs);
        }

        .site-map-route-card:hover .route-icon,
        .site-map-route-card:focus-visible .route-icon {
          color: var(--primary-foreground);
          background: var(--primary);
          box-shadow: var(--shadow-md);
        }

        .route-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: var(--radius-control);
          background: var(--primary-soft);
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
          color: var(--foreground);
          font-size: 0.94rem;
          font-weight: 600;
        }

        .site-map-soon-badge {
          display: inline-flex;
          margin-inline-start: 8px;
          border-radius: var(--radius-pill);
          border: 1px solid color-mix(in srgb,var(--accent) 30%,var(--border));
          background: var(--accent-soft);
          color: var(--accent-hover);
          padding: 3px 8px;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.2;
          vertical-align: middle;
        }

        .site-map-routes p {
          color: var(--foreground-secondary);
          font-size: 0.8rem;
          line-height: 1.45;
          font-weight: 400;
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
          border-radius: var(--radius-panel);
          padding: 24px;
          color: var(--foreground-muted);
          font-weight: 500;
        }

        .site-map-empty {
          min-height: 88px;
          border: 1px dashed color-mix(in srgb,var(--primary) 30%,var(--border));
          background: var(--surface);
        }

        .site-map-no-results h2,
        .site-map-no-results p {
          margin: 0;
        }

        .site-map-no-results h2 {
          color: var(--foreground);
          font-size: 1.35rem;
          font-weight: 600;
        }

        .site-map-no-results p {
          color: var(--foreground-secondary);
        }

        .site-map-hero {
          min-height: 0 !important;
          padding: 22px !important;
          border-radius: var(--radius-panel) !important;
        }

        .site-map-hero .sfm-page-hero-icon {
          width: 54px !important;
          height: 54px !important;
          border-radius: var(--radius-card) !important;
        }

        .site-map-hero h1 {
          font-size: clamp(30px, 4vw, 44px) !important;
        }

        .site-map-hero p {
          max-width: 780px !important;
          line-height: 1.65 !important;
        }

        .site-map-tabs {
          display: flex;
          gap: 8px;
          max-width: 100%;
          overflow-x: auto;
          padding: 4px 2px 8px;
          scrollbar-width: thin;
        }

        .site-map-tabs button {
          flex: 0 0 auto;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--border);
          border-radius: var(--radius-pill);
          background: var(--surface);
          color: var(--foreground-muted);
          padding: 0 13px;
          font: 500 12px var(--font-ui);
          cursor: pointer;
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
          white-space: nowrap;
        }

        .site-map-tabs button span {
          direction: ltr;
          unicode-bidi: isolate;
          display: inline-grid;
          min-width: 22px;
          height: 22px;
          place-items: center;
          border-radius: var(--radius-pill);
          background: var(--primary-soft);
          color: var(--primary);
          font-size: 12px;
        }

        .site-map-tabs button.active,
        .site-map-tabs button:hover,
        .site-map-tabs button:focus-visible {
          outline: none;
          border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
          color: var(--foreground);
          box-shadow: var(--focus-shadow);
        }

        .site-map-tabs button.active {
          background: var(--primary);
          border-color: transparent;
          color: var(--primary-foreground);
        }

        .site-map-tabs button.active span {
          background: color-mix(in srgb,var(--primary-foreground) 18%,transparent);
          color: var(--primary-foreground);
        }

        .site-map-routes-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .site-map-routes-grid.search-results {
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }

        .site-map-routes-grid .site-map-route-card {
          min-height: 116px;
          grid-template-columns: auto minmax(0, 1fr);
          grid-template-rows: minmax(0, 1fr) auto;
          align-content: stretch;
        }

        .site-map-routes-grid .site-map-route-card > em {
          grid-column: 2;
          align-self: end;
        }

        .site-map-routes-grid .site-map-route-card small {
          display: block;
          margin: 0 0 4px;
          color: var(--primary);
          font-size: 12px;
          font-weight: 500;
        }

        .site-map-mobile-accordion {
          display: none;
        }

        .site-map-accordion-item {
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: var(--radius-card);
          overflow: hidden;
        }

        .site-map-accordion-item > button {
          width: 100%;
          min-height: 64px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 10px;
          border: 0;
          background: transparent;
          color: var(--foreground);
          padding: 12px;
          font: 500 14px var(--font-ui);
          text-align: start;
          cursor: pointer;
        }

        .site-map-accordion-item > button small {
          color: var(--foreground-muted);
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }

        .site-map-accordion-item > button[aria-expanded="true"] {
          border-bottom: 1px solid var(--border);
          color: var(--primary);
        }

        .site-map-accordion-item .site-map-routes-grid {
          padding: 12px;
        }

        @media (min-width: 721px) and (max-width: 1080px) {
          .site-map-featured-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .site-map-grid,
          .site-map-routes-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .site-map-featured,
          .site-map-main-section,
          .site-map-search-panel {
            border-radius: var(--radius-card);
            padding: 16px;
          }

          .site-map-featured-grid,
          .site-map-grid,
          .site-map-routes-grid {
            grid-template-columns: 1fr;
          }

          .site-map-tabs,
          .site-map-desktop-panel {
            display: none;
          }

          .site-map-mobile-accordion {
            display: grid;
            gap: 10px;
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
