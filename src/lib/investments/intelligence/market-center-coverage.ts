export type RealEstateMarketCoverageState =
  | 'CONNECTED_CONTEXT'
  | 'LIVE_VERIFICATION'
  | 'RIGHTS_REVIEW'
  | 'SOURCE_REVIEW';

export type RealEstateMarketCoverageEntry = {
  id: string;
  countryCode: string;
  jurisdiction: { ar: string; en: string; fr: string };
  sourceName: string;
  sourceUrl: string;
  state: RealEstateMarketCoverageState;
  valuationReady: false;
  note: { ar: string; en: string; fr: string };
};

/**
 * Product/source status only. This list must never be interpreted as a market
 * price feed or valuation-coverage claim. Every connected source is context
 * only until its evidence passes valuation methodology independently.
 */
export const REAL_ESTATE_MARKET_COVERAGE: readonly RealEstateMarketCoverageEntry[] = [
  {
    id: 'qa-moj', countryCode: 'QA',
    jurisdiction: { ar: 'قطر', en: 'Qatar', fr: 'Qatar' },
    sourceName: 'Qatar Ministry of Justice Open Data',
    sourceUrl: 'https://www.data.gov.qa/',
    state: 'CONNECTED_CONTEXT', valuationReady: false,
    note: {
      ar: 'سجلات رسمية متصلة للفحص؛ الحداثة والتصنيف والعملة ما زالت تمنع اعتمادها كتقييم حالي.',
      en: 'Official records are connected for inspection; freshness, classification, and currency review still block current valuation use.',
      fr: 'Données officielles connectées pour consultation ; la fraîcheur, la classification et la devise empêchent encore une valorisation actuelle.',
    },
  },
  {
    id: 'gb-hmlr', countryCode: 'GB',
    jurisdiction: { ar: 'إنجلترا وويلز · لندن', en: 'England & Wales · London', fr: 'Angleterre et pays de Galles · Londres' },
    sourceName: 'HM Land Registry Price Paid Data',
    sourceUrl: 'https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads',
    state: 'CONNECTED_CONTEXT', valuationReady: false,
    note: {
      ar: 'أسعار بيع رسمية متصلة ومختبرة حيًا؛ نقص مساحة موثوقة يمنع حساب سعر المتر والتقييم الآلي.',
      en: 'Official sale prices are connected and live-verified; dependable area is missing, so price-per-area valuation stays blocked.',
      fr: 'Prix de vente officiels connectés et vérifiés en direct ; l’absence de surface fiable bloque la valorisation au m².',
    },
  },
  {
    id: 'us-nyc-dof', countryCode: 'US',
    jurisdiction: { ar: 'الولايات المتحدة · نيويورك', en: 'United States · New York City', fr: 'États-Unis · New York' },
    sourceName: 'NYC Department of Finance Rolling Sales',
    sourceUrl: 'https://data.cityofnewyork.us/d/usep-8jbt',
    state: 'CONNECTED_CONTEXT', valuationReady: false,
    note: {
      ar: 'سجلات رسمية متصلة ومختبرة حيًا؛ نحتاج فلترة التحويلات غير السوقية ومطابقة Building Class قبل اعتماد المقارنات.',
      en: 'Official records are connected and live-verified; non-market transfers and building-class comparability still require filtering.',
      fr: 'Données officielles connectées et vérifiées ; les transferts non marchands et les classes de bâtiments doivent encore être filtrés.',
    },
  },
  {
    id: 'us-cook', countryCode: 'US',
    jurisdiction: { ar: 'الولايات المتحدة · شيكاغو / Cook County', en: 'United States · Chicago / Cook County', fr: 'États-Unis · Chicago / Cook County' },
    sourceName: 'Cook County Assessor Parcel Sales',
    sourceUrl: 'https://datacatalog.cookcountyil.gov/d/wvhk-k5uv',
    state: 'LIVE_VERIFICATION', valuationReady: false,
    note: {
      ar: 'الربط البرمجي جاهز مع فلاتر المقاطعة الرسمية؛ اختبار الاتصال الحي على الرأس الحالي قيد التحقق.',
      en: 'The adapter is connected with the County’s published filters; exact-head live verification is still running.',
      fr: 'L’adaptateur est connecté avec les filtres publiés par le comté ; la vérification en direct du commit courant est en cours.',
    },
  },
  {
    id: 'kw-moj', countryCode: 'KW',
    jurisdiction: { ar: 'الكويت', en: 'Kuwait', fr: 'Koweït' },
    sourceName: 'Kuwait Ministry of Justice',
    sourceUrl: 'https://www.moj.gov.kw/',
    state: 'RIGHTS_REVIEW', valuationReady: false,
    note: {
      ar: 'المصدر الرسمي معروف، لكن إعادة الاستخدام التجاري تنتظر مسار موافقة واضح؛ لا يوجد سحب آلي حاليًا.',
      en: 'The official source is identified, but commercial reuse needs a clear permission path; automated ingestion is not enabled.',
      fr: 'La source officielle est identifiée, mais la réutilisation commerciale exige une autorisation claire ; aucune ingestion automatique.',
    },
  },
  {
    id: 'us-king', countryCode: 'US',
    jurisdiction: { ar: 'الولايات المتحدة · Seattle / King County', en: 'United States · Seattle / King County', fr: 'États-Unis · Seattle / King County' },
    sourceName: 'King County Assessor eSales',
    sourceUrl: 'https://info.kingcounty.gov/assessor/esales/eSales.aspx',
    state: 'SOURCE_REVIEW', valuationReady: false,
    note: {
      ar: 'eSales رسمي ومتاح للبحث؛ الوصول الآلي وشروط إعادة الاستخدام تحتاج مراجعة قبل بناء adapter إنتاجي.',
      en: 'Official eSales search is available; automated access and reuse terms require review before a production adapter.',
      fr: 'La recherche eSales officielle est disponible ; l’accès automatisé et les conditions de réutilisation doivent être validés.',
    },
  },
  {
    id: 'us-la', countryCode: 'US',
    jurisdiction: { ar: 'الولايات المتحدة · Los Angeles County', en: 'United States · Los Angeles County', fr: 'États-Unis · comté de Los Angeles' },
    sourceName: 'Los Angeles County Assessor Recent Sales',
    sourceUrl: 'https://assessor.lacounty.gov/',
    state: 'SOURCE_REVIEW', valuationReady: false,
    note: {
      ar: 'تم تحديد خدمة Recent Sales الرسمية؛ الحقول والترخيص وحدود الاستخدام الآلي تحت المراجعة قبل الربط.',
      en: 'The official Recent Sales service is identified; fields, licensing, and automation limits are under review before connection.',
      fr: 'Le service officiel Recent Sales est identifié ; champs, licence et limites d’automatisation restent à valider.',
    },
  },
  {
    id: 'us-miami', countryCode: 'US',
    jurisdiction: { ar: 'الولايات المتحدة · Miami-Dade', en: 'United States · Miami-Dade', fr: 'États-Unis · Miami-Dade' },
    sourceName: 'Miami-Dade Property Appraiser',
    sourceUrl: 'https://www.miamidade.gov/pa/',
    state: 'SOURCE_REVIEW', valuationReady: false,
    note: {
      ar: 'بيانات المبيعات الرسمية متاحة عبر ملفات/خدمات المقيم العقاري؛ بعض مسارات البيانات قد تكون مدفوعة لذلك لا يوجد شراء أو ربط تلقائي بدون موافقة.',
      en: 'Official sales data is available through Property Appraiser files/services; some data paths may be paid, so nothing is purchased or enabled automatically.',
      fr: 'Les ventes officielles sont disponibles via les fichiers/services de l’évaluateur ; certains accès peuvent être payants, donc aucun achat automatique.',
    },
  },
] as const;
