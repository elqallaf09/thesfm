import type { IntelligenceAssetType, IntelligenceHorizon, IntelligenceRecommendation, IntelligenceRisk } from '@/domain/intelligence/contracts';

export type AiAnalystLocale = 'ar' | 'en' | 'fr';

export type AiAnalystNavigationKey =
  | 'overview'
  | 'analysis'
  | 'compare'
  | 'agent'
  | 'path'
  | 'history'
  | 'future'
  | 'marketLeadership'
  | 'markets'
  | 'assetDetails'
  | 'marketSessions'
  | 'marketMap'
  | 'watchlist'
  | 'portfolio'
  | 'alerts'
  | 'recommendations'
  | 'tradePerformance'
  | 'news'
  | 'calendar'
  | 'education'
  | 'settings';

export type AiAnalystNavigationGroup = 'analysis' | 'markets' | 'monitoring' | 'knowledge' | 'configuration';

export const AI_ANALYST_COPY = {
  ar: {
    title: 'إس إف إم المحلل الذكي',
    subtitle: 'ذكاء مالي موحد مبني على الأدلة المتاحة فعلياً',
    eyebrow: 'مركز الذكاء المالي',
    redirecting: 'جارٍ فتح إس إف إم المحلل الذكي…',
    tabs: { overview: 'نظرة عامة', analysis: 'التحليل', timeline: 'المسار', history: 'السجل', compare: 'المقارنة', agent: 'الوكيل', future: 'القادم' },
    navigation: {
      label: 'تنقل المحلل الذكي',
      open: 'فتح أقسام المحلل الذكي',
      close: 'إغلاق أقسام المحلل الذكي',
      groups: { analysis: 'التحليل', markets: 'الأسواق', monitoring: 'المتابعة', knowledge: 'المعرفة', configuration: 'الإعدادات' },
      items: {
        overview: 'نظرة عامة', analysis: 'التحليل الذكي', compare: 'المقارنة', agent: 'وكيل السوق الذكي', path: 'مسار التحليل', history: 'السجل والدقة', future: 'الفرص القادمة',
        marketLeadership: 'قيادة السوق', markets: 'استكشاف الأسواق', assetDetails: 'تفاصيل الأصل', marketSessions: 'جلسات وخريطة السوق', marketMap: 'خريطة السوق',
        watchlist: 'قائمة المتابعة', portfolio: 'المحفظة', alerts: 'التنبيهات', recommendations: 'التوصيات', tradePerformance: 'أداء التداول',
        news: 'الأخبار', calendar: 'التقويم الاقتصادي', education: 'التعليم', settings: 'إعدادات المحلل الذكي',
      },
    },
    picker: {
      title: 'ابدأ بتحليل أصل',
      body: 'أدخل رمزاً وأفقاً زمنياً. لا يتم إنشاء قراءة أو سعر بديل عند غياب بيانات موثقة.',
      symbol: 'رمز الأصل',
      symbolPlaceholder: 'مثال: AAPL أو BTC-USD أو EURUSD=X',
      assetType: 'نوع الأصل',
      horizon: 'الأفق',
      submit: 'فتح التحليل',
      invalidSymbol: 'أدخل رمزاً صالحاً بطول لا يتجاوز 32 حرفاً.',
    },
    overview: {
      snapshot: 'لقطة السوق',
      snapshotBody: 'تبدأ كل قراءة من مزود بيانات موثق وتعرض حالته بوضوح.',
      providerHealth: 'حالة مزودي السوق',
      providersLoading: 'جارٍ التحقق من حالة مزودي البيانات…',
      providersUnavailable: 'تعذر تحميل حالة المزود. لم يتم افتراض أي حالة بديلة.',
      providersNone: 'لا توجد حالة مزود متاحة حالياً.',
      recent: 'التحليلات الحديثة',
      recentBody: 'أحدث القراءات المسموح بها من السجل غير القابل للتغيير.',
      recentLoading: 'جارٍ تحميل التحليلات الحديثة…',
      recentEmpty: 'لا توجد تحليلات حديثة مسموح بها لعرضها بعد.',
      recentUnavailable: 'تعذر تحميل التحليلات الحديثة. لم يتم عرض بيانات مخزنة كأنها حالية.',
      latestRecommendations: 'أحدث القراءات',
      trending: 'الأصول الرائجة',
      trendingBody: 'لا تتوفر حالياً تغطية موثقة لترتيب الأصول الرائجة من المزودين المتصلين.',
      changes: 'تغييرات الذكاء الحديثة',
      changesBody: 'تظهر التغييرات الموثقة لكل أصل داخل مسار التحليل الخاص به.',
      timeline: 'مسار التحليل',
      timelineBody: 'اختر أصلاً لعرض القراءات السابقة وانحراف الثقة والنتائج عند اكتمال أفق التقييم.',
      accuracy: 'دقة تاريخية',
      alerts: 'التنبيهات الذكية',
      alertsBody: 'هذه البنية محجوزة للتنبيهات المستقبلية. لا توجد تنبيهات ذكية تلقائية في هذه المرحلة.',
      openHistory: 'فتح السجل',
      openLegacyAlerts: 'فتح تنبيهات الأسعار الحالية',
    },
    analysis: {
      title: 'تحليل ذكاء مالي',
      latestLoading: 'جارٍ تحميل آخر تحليل مسموح به…',
      noLatest: 'لا توجد قراءة محفوظة لهذا الأصل والأفق بعد.',
      run: 'إنشاء تحليل موثق',
      refresh: 'تحديث التحليل',
      refreshHint: 'التحديث القسري متاح فقط للحسابات المصادَق عليها ويخضع للحدود.',
      unavailable: 'تعذر إكمال طلب التحليل. لم يتم إنشاء أي قيم بديلة.',
      chart: 'الرسم البياني الموثق',
      chartOpen: 'عرض سجل السعر الموثق',
      chartClosed: 'يفتح السجل فقط عند الطلب لتقليل التحميل غير الضروري.',
      chartUnavailable: 'تعذر تحميل سجل السعر الموثق. لا يتم استبداله بأسعار تقديرية.',
      timeline: 'المسار وانحراف الثقة',
      timelineOpen: 'عرض مسار هذا الأصل',
      timelineClosed: 'تتضمن التفاصيل النتائج عند تقييمها ومقارنة قراءتين مسموحتين.',
      history: 'الدقة والسجل',
      historyBody: 'تُعرض المقاييس التاريخية الوصفية فقط بعد بلوغ الحد الأدنى للعينة؛ ولا تؤثر في الأوزان الحية.',
      openHistory: 'فتح السجل الكامل',
      sections: 'نظرة عامة، التوصية، الثقة، المخاطر، الحداثة، المصدر، العوامل، التفسير',
    },
    history: {
      title: 'مسار الذكاء والسجل',
      body: 'يعرض المسار قراءات أصل واحد ضمن أفق واحد، مع انحراف حتمي ونتائج لا تُقيّم قبل اكتمال نافذتها.',
      select: 'اختر أصلاً لعرض المسار',
      accuracyTitle: 'ملخص الدقة التاريخية',
      accuracyBody: 'ملخص وصفي مشترك فقط. لا يُستخدم لتعديل ثقة التحليل أو أوزانه الحية.',
      accuracyLoading: 'جارٍ تحميل الملخص التاريخي…',
      accuracyUnavailable: 'تعذر تحميل ملخص الدقة. لم يتم افتراض نسب أو نتائج.',
      insufficientSample: 'العينة غير كافية لعرض نسبة دقة ذات معنى.',
      evaluated: 'تم تقييمه',
      pending: 'قيد الانتظار',
      insufficientData: 'بيانات غير كافية',
      directionalAccuracy: 'دقة الاتجاه',
      minimumSample: 'الحد الأدنى للعينة',
      byConfidence: 'حسب شريحة الثقة',
      byAsset: 'حسب نوع الأصل',
      byHorizon: 'حسب الأفق',
      byRecommendation: 'حسب القراءة',
      marketUnavailable: 'التجميع حسب السوق غير متاح في الملخص الموثق الحالي.',
      descriptiveOnly: 'وصفي فقط — لا تغيير تلقائي للأوزان الحية',
    },
    compare: {
      title: 'مقارنة التحليل',
      body: 'قارن قراءتين مسموحتين للأصل نفسه من خلال المسار. لا توجد مقارنة بين نماذج الذكاء الاصطناعي في هذه المرحلة.',
      ruleEngine: 'محرك القواعد',
      active: 'متاح',
      openAi: 'OpenAI',
      futureLocal: 'نموذج محلي مستقبلي',
      unavailable: 'غير مفعّل',
      unavailableBody: 'لا تُنتج هذه البنية أي تحليل أو درجة أو توصية بديلة.',
      openTimeline: 'اختيار أصل وفتح المسار للمقارنة',
    },
    agent: {
      title: 'وكيل السوق الذكي',
      body: 'ابدأ تحليلاً منظماً لأصل واحد. يستخدم الوكيل محرك الذكاء المالي الحتمي نفسه ولا يعرض توصية ثانية.',
      guardrail: 'لا يتم تنفيذ تداولات أو إنشاء أهداف أو أسعار أو نسب ثقة بواسطة الوكيل.',
    },
    future: {
      title: 'فرص مستقبلية',
      body: 'هذه المساحة تحجز واجهات مستقبلية فقط. لا توجد فرص أو صفقات أو تنبيهات مولدة حالياً.',
      arbitrage: 'المراجحة الثلاثية',
      scanner: 'الماسح',
      routeAnimation: 'تصور المسار',
      smartAlerts: 'التنبيهات الذكية',
      reserved: 'محجوز للمرحلة المستقبلية',
    },
    status: { available: 'متاح', degraded: 'جزئي أو متأخر', unavailable: 'غير متاح', unknown: 'غير معروف' },
    actions: { retry: 'إعادة المحاولة', open: 'فتح', learnMore: 'التفاصيل' },
  },
  en: {
    title: 'SFM AI Analyst',
    subtitle: 'Unified financial intelligence built from evidence that is actually available',
    eyebrow: 'Financial intelligence center',
    redirecting: 'Opening SFM AI Analyst…',
    tabs: { overview: 'Overview', analysis: 'Analysis', timeline: 'Timeline', history: 'History', compare: 'Compare', agent: 'Agent', future: 'Future' },
    navigation: {
      label: 'AI Analyst navigation',
      open: 'Open AI Analyst sections',
      close: 'Close AI Analyst sections',
      groups: { analysis: 'Analysis', markets: 'Markets', monitoring: 'Monitoring', knowledge: 'Knowledge', configuration: 'Configuration' },
      items: {
        overview: 'Overview', analysis: 'Intelligent analysis', compare: 'Compare', agent: 'AI market agent', path: 'Analysis path', history: 'History and accuracy', future: 'Future opportunities',
        marketLeadership: 'Market leadership', markets: 'Market explorer', assetDetails: 'Asset details', marketSessions: 'Market sessions and map', marketMap: 'Market map',
        watchlist: 'Watchlist', portfolio: 'Portfolio', alerts: 'Alerts', recommendations: 'Recommendations', tradePerformance: 'Trade performance',
        news: 'News', calendar: 'Economic calendar', education: 'Education', settings: 'AI Analyst settings',
      },
    },
    picker: {
      title: 'Start with an asset',
      body: 'Enter a symbol and horizon. No substitute reading or price is created when verified data is missing.',
      symbol: 'Asset symbol',
      symbolPlaceholder: 'Example: AAPL, BTC-USD, or EURUSD=X',
      assetType: 'Asset type',
      horizon: 'Horizon',
      submit: 'Open analysis',
      invalidSymbol: 'Enter a valid symbol of up to 32 characters.',
    },
    overview: {
      snapshot: 'Market snapshot',
      snapshotBody: 'Every reading starts with a verified data provider and displays its state plainly.',
      providerHealth: 'Market provider health',
      providersLoading: 'Checking data-provider health…',
      providersUnavailable: 'Provider health could not be loaded. No replacement state was assumed.',
      providersNone: 'No provider health is available right now.',
      recent: 'Recent analyses',
      recentBody: 'The most recent permitted readings from the immutable analysis history.',
      recentLoading: 'Loading recent analyses…',
      recentEmpty: 'There are no permitted recent analyses to show yet.',
      recentUnavailable: 'Recent analyses could not be loaded. Stored data is not being shown as current.',
      latestRecommendations: 'Latest readings',
      trending: 'Trending assets',
      trendingBody: 'Verified provider coverage for a trending-assets ranking is not available yet.',
      changes: 'Recent intelligence changes',
      changesBody: 'Documented changes appear in each asset’s analysis timeline.',
      timeline: 'Analysis timeline',
      timelineBody: 'Select an asset to view past readings, confidence drift, and outcomes once their evaluation horizon is complete.',
      accuracy: 'Historical accuracy',
      alerts: 'Smart alerts',
      alertsBody: 'This architecture is reserved for future alerts. No automated smart alerts exist in this phase.',
      openHistory: 'Open history',
      openLegacyAlerts: 'Open current price alerts',
    },
    analysis: {
      title: 'Financial intelligence analysis',
      latestLoading: 'Loading the latest permitted analysis…',
      noLatest: 'No saved reading exists for this asset and horizon yet.',
      run: 'Generate verified analysis',
      refresh: 'Refresh analysis',
      refreshHint: 'Forced refresh is available only to authenticated accounts and remains rate-limited.',
      unavailable: 'The analysis request could not be completed. No replacement values were created.',
      chart: 'Verified price chart',
      chartOpen: 'Show verified price history',
      chartClosed: 'History loads on request to avoid unnecessary work.',
      chartUnavailable: 'Verified price history could not be loaded. It is not replaced with estimated prices.',
      timeline: 'Timeline and confidence drift',
      timelineOpen: 'Show this asset’s timeline',
      timelineClosed: 'Details include outcomes when evaluated and a permitted two-reading comparison.',
      history: 'Accuracy and history',
      historyBody: 'Descriptive historical measures appear only after the minimum sample is reached; they do not change live weights.',
      openHistory: 'Open complete history',
      sections: 'Overview, recommendation, confidence, risk, freshness, provider, factors, and explainability',
    },
    history: {
      title: 'Intelligence timeline and history',
      body: 'The timeline shows one asset and horizon at a time, with deterministic drift and outcomes never evaluated before their window ends.',
      select: 'Choose an asset to view its timeline',
      accuracyTitle: 'Historical accuracy summary',
      accuracyBody: 'Shared descriptive summary only. It is not used to alter live analysis confidence or weights.',
      accuracyLoading: 'Loading the historical summary…',
      accuracyUnavailable: 'The accuracy summary could not be loaded. No percentages or outcomes were assumed.',
      insufficientSample: 'The sample is too small to display a meaningful accuracy percentage.',
      evaluated: 'Evaluated',
      pending: 'Pending',
      insufficientData: 'Insufficient data',
      directionalAccuracy: 'Directional accuracy',
      minimumSample: 'Minimum sample',
      byConfidence: 'By confidence bucket',
      byAsset: 'By asset type',
      byHorizon: 'By horizon',
      byRecommendation: 'By reading',
      marketUnavailable: 'Market-level grouping is not available in the current verified summary.',
      descriptiveOnly: 'Descriptive only — no automatic live-weight change',
    },
    compare: {
      title: 'Analysis comparison',
      body: 'Compare two permitted readings for the same asset through its timeline. AI-model comparison is not implemented in this phase.',
      ruleEngine: 'Rule engine',
      active: 'Available',
      openAi: 'OpenAI',
      futureLocal: 'Future local model',
      unavailable: 'Not enabled',
      unavailableBody: 'This architecture produces no alternative analysis, score, or recommendation.',
      openTimeline: 'Choose an asset and open its timeline to compare readings',
    },
    agent: {
      title: 'Smart market agent',
      body: 'Start a structured analysis for one asset. The agent uses the same deterministic financial-intelligence engine and never shows a second recommendation.',
      guardrail: 'The agent does not execute trades or create targets, prices, or confidence values.',
    },
    future: {
      title: 'Future opportunities',
      body: 'This space reserves future interfaces only. No opportunities, trades, or alerts are generated here today.',
      arbitrage: 'Triangular arbitrage',
      scanner: 'Scanner',
      routeAnimation: 'Route visualization',
      smartAlerts: 'Smart alerts',
      reserved: 'Reserved for a future phase',
    },
    status: { available: 'Available', degraded: 'Partial or delayed', unavailable: 'Unavailable', unknown: 'Unknown' },
    actions: { retry: 'Try again', open: 'Open', learnMore: 'Details' },
  },
  fr: {
    title: 'Analyste IA SFM',
    subtitle: 'Une intelligence financière unifiée fondée sur les preuves réellement disponibles',
    eyebrow: 'Centre d’intelligence financière',
    redirecting: 'Ouverture de l’Analyste IA SFM…',
    tabs: { overview: 'Vue d’ensemble', analysis: 'Analyse', timeline: 'Chronologie', history: 'Historique', compare: 'Comparer', agent: 'Agent', future: 'À venir' },
    navigation: {
      label: 'Navigation de l’Analyste IA',
      open: 'Ouvrir les sections de l’Analyste IA',
      close: 'Fermer les sections de l’Analyste IA',
      groups: { analysis: 'Analyse', markets: 'Marchés', monitoring: 'Suivi', knowledge: 'Connaissances', configuration: 'Configuration' },
      items: {
        overview: 'Vue d’ensemble', analysis: 'Analyse intelligente', compare: 'Comparer', agent: 'Agent de marché IA', path: 'Parcours d’analyse', history: 'Historique et précision', future: 'Opportunités futures',
        marketLeadership: 'Leadership du marché', markets: 'Explorateur de marchés', assetDetails: 'Détails de l’actif', marketSessions: 'Sessions et carte du marché', marketMap: 'Carte du marché',
        watchlist: 'Liste de suivi', portfolio: 'Portefeuille', alerts: 'Alertes', recommendations: 'Recommandations', tradePerformance: 'Performance des transactions',
        news: 'Actualités', calendar: 'Calendrier économique', education: 'Formation', settings: 'Paramètres de l’Analyste IA',
      },
    },
    picker: {
      title: 'Commencer avec un actif',
      body: 'Saisissez un symbole et un horizon. Aucune lecture ni aucun prix de remplacement n’est créé si les données vérifiées manquent.',
      symbol: 'Symbole de l’actif',
      symbolPlaceholder: 'Exemple : AAPL, BTC-USD ou EURUSD=X',
      assetType: 'Type d’actif',
      horizon: 'Horizon',
      submit: 'Ouvrir l’analyse',
      invalidSymbol: 'Saisissez un symbole valide de 32 caractères maximum.',
    },
    overview: {
      snapshot: 'Instantané du marché',
      snapshotBody: 'Chaque lecture commence avec un fournisseur vérifié et affiche clairement son état.',
      providerHealth: 'État des fournisseurs de marché',
      providersLoading: 'Vérification de l’état des fournisseurs…',
      providersUnavailable: 'L’état des fournisseurs est indisponible. Aucun état de remplacement n’a été supposé.',
      providersNone: 'Aucun état de fournisseur n’est disponible pour le moment.',
      recent: 'Analyses récentes',
      recentBody: 'Les dernières lectures autorisées issues de l’historique immuable.',
      recentLoading: 'Chargement des analyses récentes…',
      recentEmpty: 'Aucune analyse récente autorisée n’est disponible pour le moment.',
      recentUnavailable: 'Les analyses récentes n’ont pas pu être chargées. Les données enregistrées ne sont pas présentées comme actuelles.',
      latestRecommendations: 'Dernières lectures',
      trending: 'Actifs tendance',
      trendingBody: 'La couverture vérifiée pour classer les actifs tendance n’est pas encore disponible.',
      changes: 'Changements récents de l’intelligence',
      changesBody: 'Les changements documentés apparaissent dans la chronologie de chaque actif.',
      timeline: 'Chronologie d’analyse',
      timelineBody: 'Choisissez un actif pour consulter les lectures précédentes, la dérive de confiance et les résultats une fois leur horizon terminé.',
      accuracy: 'Précision historique',
      alerts: 'Alertes intelligentes',
      alertsBody: 'Cette architecture est réservée aux alertes futures. Aucune alerte intelligente automatique n’existe dans cette phase.',
      openHistory: 'Ouvrir l’historique',
      openLegacyAlerts: 'Ouvrir les alertes de prix actuelles',
    },
    analysis: {
      title: 'Analyse d’intelligence financière',
      latestLoading: 'Chargement de la dernière analyse autorisée…',
      noLatest: 'Aucune lecture enregistrée n’existe encore pour cet actif et cet horizon.',
      run: 'Générer une analyse vérifiée',
      refresh: 'Actualiser l’analyse',
      refreshHint: 'L’actualisation forcée est réservée aux comptes authentifiés et reste limitée.',
      unavailable: 'La demande d’analyse n’a pas pu être terminée. Aucune valeur de remplacement n’a été créée.',
      chart: 'Graphique de prix vérifié',
      chartOpen: 'Afficher l’historique de prix vérifié',
      chartClosed: 'L’historique est chargé à la demande pour éviter un travail inutile.',
      chartUnavailable: 'L’historique de prix vérifié est indisponible. Il n’est pas remplacé par des prix estimés.',
      timeline: 'Chronologie et dérive de confiance',
      timelineOpen: 'Afficher la chronologie de cet actif',
      timelineClosed: 'Les détails incluent les résultats lorsqu’ils sont évalués et une comparaison autorisée de deux lectures.',
      history: 'Précision et historique',
      historyBody: 'Les mesures historiques descriptives apparaissent seulement après le seuil minimal ; elles ne changent pas les pondérations en direct.',
      openHistory: 'Ouvrir l’historique complet',
      sections: 'Vue d’ensemble, lecture, confiance, risque, fraîcheur, fournisseur, facteurs et explication',
    },
    history: {
      title: 'Chronologie et historique de l’intelligence',
      body: 'La chronologie affiche un actif et un horizon à la fois, avec une dérive déterministe et des résultats jamais évalués avant la fin de leur fenêtre.',
      select: 'Choisissez un actif pour afficher sa chronologie',
      accuracyTitle: 'Résumé de précision historique',
      accuracyBody: 'Résumé descriptif partagé uniquement. Il ne modifie ni la confiance ni les pondérations en direct.',
      accuracyLoading: 'Chargement du résumé historique…',
      accuracyUnavailable: 'Le résumé de précision est indisponible. Aucun pourcentage ni résultat n’a été supposé.',
      insufficientSample: 'L’échantillon est trop petit pour afficher un pourcentage de précision significatif.',
      evaluated: 'Évalué',
      pending: 'En attente',
      insufficientData: 'Données insuffisantes',
      directionalAccuracy: 'Précision directionnelle',
      minimumSample: 'Échantillon minimal',
      byConfidence: 'Par tranche de confiance',
      byAsset: 'Par type d’actif',
      byHorizon: 'Par horizon',
      byRecommendation: 'Par lecture',
      marketUnavailable: 'Le regroupement par marché n’est pas disponible dans le résumé vérifié actuel.',
      descriptiveOnly: 'Descriptif uniquement — aucun changement automatique des pondérations',
    },
    compare: {
      title: 'Comparaison d’analyse',
      body: 'Comparez deux lectures autorisées pour le même actif via sa chronologie. La comparaison de modèles IA n’est pas implémentée dans cette phase.',
      ruleEngine: 'Moteur de règles',
      active: 'Disponible',
      openAi: 'OpenAI',
      futureLocal: 'Futur modèle local',
      unavailable: 'Non activé',
      unavailableBody: 'Cette architecture ne produit aucune analyse, score ou recommandation alternative.',
      openTimeline: 'Choisir un actif et ouvrir sa chronologie pour comparer les lectures',
    },
    agent: {
      title: 'Agent de marché intelligent',
      body: 'Lancez une analyse structurée pour un actif. L’agent utilise le même moteur déterministe et n’affiche jamais une seconde recommandation.',
      guardrail: 'L’agent n’exécute pas de transactions et ne crée pas d’objectifs, de prix ou de valeurs de confiance.',
    },
    future: {
      title: 'Opportunités futures',
      body: 'Cet espace réserve uniquement des interfaces futures. Aucune opportunité, transaction ou alerte n’y est générée actuellement.',
      arbitrage: 'Arbitrage triangulaire',
      scanner: 'Scanner',
      routeAnimation: 'Visualisation de parcours',
      smartAlerts: 'Alertes intelligentes',
      reserved: 'Réservé à une phase future',
    },
    status: { available: 'Disponible', degraded: 'Partiel ou retardé', unavailable: 'Indisponible', unknown: 'Inconnu' },
    actions: { retry: 'Réessayer', open: 'Ouvrir', learnMore: 'Détails' },
  },
} as const;

export const AI_ANALYST_ASSET_TYPES: readonly IntelligenceAssetType[] = [
  'STOCK', 'CRYPTO', 'FOREX', 'INDEX', 'COMMODITY', 'FUND',
];

export const AI_ANALYST_HORIZONS: readonly IntelligenceHorizon[] = [
  'INTRADAY', 'SHORT_TERM', 'SWING', 'POSITION', 'LONG_TERM',
];

export const ASSET_TYPE_LABELS: Record<AiAnalystLocale, Record<IntelligenceAssetType, string>> = {
  ar: { STOCK: 'أسهم', CRYPTO: 'عملات رقمية', FOREX: 'فوركس', INDEX: 'مؤشرات', COMMODITY: 'سلع', FUND: 'صناديق' },
  en: { STOCK: 'Stocks', CRYPTO: 'Crypto', FOREX: 'Forex', INDEX: 'Indices', COMMODITY: 'Commodities', FUND: 'Funds' },
  fr: { STOCK: 'Actions', CRYPTO: 'Crypto', FOREX: 'Forex', INDEX: 'Indices', COMMODITY: 'Matières premières', FUND: 'Fonds' },
};

export const HORIZON_LABELS: Record<AiAnalystLocale, Record<IntelligenceHorizon, string>> = {
  ar: { INTRADAY: 'داخل اليوم', SHORT_TERM: 'قصير الأجل', SWING: 'متوسط الأجل', POSITION: 'مركز', LONG_TERM: 'طويل الأجل' },
  en: { INTRADAY: 'Intraday', SHORT_TERM: 'Short term', SWING: 'Swing', POSITION: 'Position', LONG_TERM: 'Long term' },
  fr: { INTRADAY: 'Intrajournalier', SHORT_TERM: 'Court terme', SWING: 'Swing', POSITION: 'Position', LONG_TERM: 'Long terme' },
};

export const RECOMMENDATION_LABELS: Record<AiAnalystLocale, Record<IntelligenceRecommendation, string>> = {
  ar: { BUY: 'شراء', SELL: 'بيع', WAIT: 'انتظار', INSUFFICIENT_DATA: 'بيانات غير كافية' },
  en: { BUY: 'Buy', SELL: 'Sell', WAIT: 'Wait', INSUFFICIENT_DATA: 'Insufficient data' },
  fr: { BUY: 'Acheter', SELL: 'Vendre', WAIT: 'Attendre', INSUFFICIENT_DATA: 'Données insuffisantes' },
};

export const RISK_LABELS: Record<AiAnalystLocale, Record<IntelligenceRisk, string>> = {
  ar: { LOW: 'منخفضة', MEDIUM: 'متوسطة', HIGH: 'مرتفعة', VERY_HIGH: 'مرتفعة جداً', UNAVAILABLE: 'غير متاح' },
  en: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', VERY_HIGH: 'Very high', UNAVAILABLE: 'Unavailable' },
  fr: { LOW: 'Faible', MEDIUM: 'Moyen', HIGH: 'Élevé', VERY_HIGH: 'Très élevé', UNAVAILABLE: 'Indisponible' },
};

export function aiAnalystLocale(language: string | null | undefined): AiAnalystLocale {
  return language === 'en' || language === 'fr' ? language : 'ar';
}

export function aiAnalystNumber(locale: AiAnalystLocale, value: number, maximumFractionDigits = 0) {
  const localeTag = locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR-u-nu-latn' : 'en-GB-u-nu-latn';
  return new Intl.NumberFormat(localeTag, { maximumFractionDigits }).format(value);
}

export function aiAnalystTimestamp(locale: AiAnalystLocale, value: string | null | undefined, unavailable = '—') {
  if (!value || !Number.isFinite(Date.parse(value))) return unavailable;
  const localeTag = locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR-u-nu-latn' : 'en-GB-u-nu-latn';
  return new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium', timeStyle: 'short', hour12: false }).format(new Date(value));
}
