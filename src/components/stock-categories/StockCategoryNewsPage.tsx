'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Clock3,
  ExternalLink,
  FileText,
  Info,
  Layers,
  Newspaper,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { CategoryStockTicker } from '@/components/stock-categories/CategoryStockTicker';
import { useLanguage } from '@/hooks/useLanguage';
import { getStockCategoryConfig, type StockCategoryFilterKey, type StockCategoryId } from '@/lib/market/stockCategoryConfigs';
import type { StockCategoryNewsItem, StockCategoryNewsPayload } from '@/lib/market/fetchStockCategoryNews';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { TR } from '@/lib/translations';

type NewsApiResponse = StockCategoryNewsPayload | { success: false; error?: string; reason?: string };
type MentionedTicker = { ticker: string; companyName: string; count: number };
type MoverSectionKey = 'topGainers' | 'topLosers' | 'highestPrice' | 'lowestPrice' | 'highestVolume' | 'lowestVolume';
type LocalizedText = Record<'ar' | 'en' | 'fr', string>;
type LocalizedList = Record<'ar' | 'en' | 'fr', string[]>;
type PageGuide = {
  comparisonTitle: LocalizedText;
  leftTitle: LocalizedText;
  leftItems: LocalizedList;
  rightTitle: LocalizedText;
  rightItems: LocalizedList;
  sectors: Array<{
    title: LocalizedText;
    body: LocalizedText;
    symbols?: string[];
  }>;
};

const NEWS_PAGE_SIZE = 12;
const PRIMARY_MOVER_SECTIONS: MoverSectionKey[] = ['topGainers', 'topLosers'];
const ALL_MOVER_SECTIONS: MoverSectionKey[] = ['topGainers', 'topLosers', 'highestPrice', 'lowestPrice', 'highestVolume', 'lowestVolume'];

const PAGE_GUIDES: Partial<Record<StockCategoryId, PageGuide>> = {
  defensive: {
    comparisonTitle: {
      ar: 'الفرق بينها وبين الأسهم الدورية',
      en: 'How they differ from cyclical stocks',
      fr: 'Différence avec les actions cycliques',
    },
    leftTitle: { ar: 'الأسهم الدفاعية', en: 'Defensive stocks', fr: 'Actions défensives' },
    leftItems: {
      ar: ['طلب مستقر نسبيًا', 'تقلب أقل غالبًا', 'توزيعات أرباح في بعض الشركات', 'مناسبة للمستثمر المحافظ'],
      en: ['Relatively stable demand', 'Often lower volatility', 'Dividends in some companies', 'Suited to conservative investors'],
      fr: ['Demande relativement stable', 'Volatilité souvent plus faible', 'Dividendes dans certaines sociétés', 'Adaptées aux investisseurs prudents'],
    },
    rightTitle: { ar: 'الأسهم الدورية', en: 'Cyclical stocks', fr: 'Actions cycliques' },
    rightItems: {
      ar: ['تتأثر بقوة بالدورة الاقتصادية', 'قد ترتفع بقوة وقت الانتعاش', 'قد تنخفض بقوة وقت الركود', 'مناسبة لمن يتحمل مخاطر أعلى'],
      en: ['Strongly affected by economic cycles', 'May rise strongly during recoveries', 'May fall sharply during recessions', 'Suited to higher risk tolerance'],
      fr: ['Très sensibles au cycle économique', 'Peuvent fortement monter en reprise', 'Peuvent fortement baisser en récession', 'Adaptées à une tolérance au risque plus élevée'],
    },
    sectors: [
      { title: { ar: 'السلع الاستهلاكية الأساسية', en: 'Consumer staples', fr: 'Biens essentiels' }, body: { ar: 'شركات الغذاء والمنتجات المنزلية التي يظل الطلب عليها حاضرًا في أغلب الظروف.', en: 'Food and household product companies with demand that often remains present across cycles.', fr: 'Sociétés alimentaires et de produits ménagers dont la demande reste présente.' }, symbols: ['PG', 'KO', 'PEP', 'WMT', 'COST'] },
      { title: { ar: 'الرعاية الصحية', en: 'Healthcare', fr: 'Santé' }, body: { ar: 'شركات الأدوية والخدمات الصحية المرتبطة باحتياجات أساسية طويلة الأجل.', en: 'Pharma and health-service companies tied to long-term essential needs.', fr: 'Pharmacie et services de santé liés à des besoins essentiels.' }, symbols: ['JNJ', 'MRK', 'PFE', 'ABBV', 'UNH'] },
      { title: { ar: 'المرافق العامة', en: 'Utilities', fr: 'Services publics' }, body: { ar: 'شركات الكهرباء والمياه والبنية الخدمية التي تميل إيراداتها إلى الاستقرار النسبي.', en: 'Power, water, and utility infrastructure companies with relatively stable revenue.', fr: 'Électricité, eau et infrastructures de services aux revenus relativement stables.' }, symbols: ['NEE', 'DUK', 'SO', 'AEP'] },
      { title: { ar: 'الاتصالات', en: 'Telecommunications', fr: 'Télécommunications' }, body: { ar: 'مزودو اتصالات وخدمات أساسية تعتمد على اشتراكات وتدفقات نقدية متكررة.', en: 'Communication providers with recurring subscription-based cash flows.', fr: 'Fournisseurs de télécommunications aux flux récurrents.' }, symbols: ['VZ', 'T'] },
    ],
  },
  growth: {
    comparisonTitle: { ar: 'أسهم النمو مقارنة بأسهم القيمة', en: 'Growth stocks versus value stocks', fr: 'Actions de croissance et actions de valeur' },
    leftTitle: { ar: 'أسهم النمو', en: 'Growth stocks', fr: 'Actions de croissance' },
    leftItems: {
      ar: ['تركز على التوسع السريع', 'نمو أعلى في الإيرادات', 'غالبًا تعيد استثمار الأرباح', 'قد تكون أكثر تقلبًا', 'تقييمات مرتفعة أحيانًا'],
      en: ['Focus on rapid expansion', 'Higher revenue growth', 'Often reinvest profits', 'Can be more volatile', 'Sometimes high valuations'],
      fr: ['Expansion rapide', 'Croissance des revenus plus élevée', 'Réinvestissement fréquent', 'Volatilité plus forte', 'Valorisations parfois élevées'],
    },
    rightTitle: { ar: 'أسهم القيمة', en: 'Value stocks', fr: 'Actions de valeur' },
    rightItems: {
      ar: ['تركز على الشركات المقومة بأقل من قيمتها', 'قد تكون أكثر استقرارًا', 'قد تقدم توزيعات أرباح', 'نمو أبطأ نسبيًا', 'مناسبة أكثر للمستثمر المحافظ'],
      en: ['Focus on companies priced below perceived value', 'May be more stable', 'May pay dividends', 'Relatively slower growth', 'Often fits conservative investors'],
      fr: ['Sociétés décotées', 'Stabilité parfois plus élevée', 'Peuvent verser des dividendes', 'Croissance plus lente', 'Plus adaptées aux investisseurs prudents'],
    },
    sectors: [
      { title: { ar: 'البرمجيات', en: 'Software', fr: 'Logiciels' }, body: { ar: 'منصات برمجية تعتمد على الاشتراكات ونمو الإيرادات المتكررة.', en: 'Software platforms driven by subscriptions and recurring revenue growth.', fr: 'Plateformes logicielles portées par les abonnements.' }, symbols: ['CRM', 'NOW', 'SNOW', 'DDOG'] },
      { title: { ar: 'التجارة الإلكترونية', en: 'E-commerce', fr: 'E-commerce' }, body: { ar: 'منصات بيع وأسواق رقمية تستفيد من توسع الإنفاق عبر الإنترنت.', en: 'Digital marketplaces benefiting from online spending expansion.', fr: 'Places de marché numériques tirées par les dépenses en ligne.' }, symbols: ['AMZN', 'SHOP', 'MELI'] },
      { title: { ar: 'الحوسبة السحابية', en: 'Cloud computing', fr: 'Cloud computing' }, body: { ar: 'شركات بنية تحتية وبيانات وسحابة قابلة للتوسع.', en: 'Infrastructure, data, and cloud companies with scalable models.', fr: 'Sociétés d’infrastructure, données et cloud évolutives.' }, symbols: ['NET', 'SNOW', 'DDOG'] },
      { title: { ar: 'التكنولوجيا المالية', en: 'Fintech', fr: 'Fintech' }, body: { ar: 'شركات المدفوعات والخدمات المالية الرقمية المرتبطة بحجم المعاملات.', en: 'Payments and digital finance companies tied to transaction growth.', fr: 'Paiements et finance numérique liés au volume de transactions.' }, symbols: ['SQ', 'PYPL'] },
      { title: { ar: 'الرعاية الصحية المبتكرة', en: 'Innovative healthcare', fr: 'Santé innovante' }, body: { ar: 'شركات تقنية طبية تعتمد على الابتكار والاعتماد السريري.', en: 'Medical technology companies driven by innovation and clinical adoption.', fr: 'Technologies médicales portées par l’innovation.' }, symbols: ['ISRG', 'DXCM'] },
    ],
  },
  dividend: {
    comparisonTitle: { ar: 'مؤشرات تقييم أسهم التوزيعات', en: 'Dividend stock evaluation signals', fr: 'Indicateurs d’évaluation des actions à dividendes' },
    leftTitle: { ar: 'مؤشرات إيجابية', en: 'Positive indicators', fr: 'Indicateurs positifs' },
    leftItems: {
      ar: ['تاريخ مستقر في توزيع الأرباح', 'نسبة توزيع معقولة من الأرباح', 'تدفقات نقدية قوية', 'ديون تحت السيطرة', 'نمو تدريجي في التوزيعات'],
      en: ['Stable dividend history', 'Reasonable payout ratio', 'Strong cash flows', 'Debt under control', 'Gradual dividend growth'],
      fr: ['Historique stable de dividendes', 'Taux de distribution raisonnable', 'Flux de trésorerie solides', 'Dette maîtrisée', 'Croissance progressive des dividendes'],
    },
    rightTitle: { ar: 'مخاطر يجب الانتباه لها', en: 'Risks to watch', fr: 'Risques à surveiller' },
    rightItems: {
      ar: ['نسبة توزيع مرتفعة جدًا', 'انخفاض الأرباح أو التدفقات النقدية', 'ديون مرتفعة', 'تراجع نمو الشركة', 'احتمال خفض أو إيقاف التوزيعات'],
      en: ['Very high payout ratio', 'Falling earnings or cash flows', 'High debt', 'Slowing company growth', 'Potential dividend cut or suspension'],
      fr: ['Taux de distribution très élevé', 'Baisse des bénéfices ou flux', 'Dette élevée', 'Ralentissement de la croissance', 'Risque de baisse ou suspension du dividende'],
    },
    sectors: [
      { title: { ar: 'السلع الاستهلاكية', en: 'Consumer staples', fr: 'Biens de consommation' }, body: { ar: 'شركات مستقرة نسبيًا وقد تقدم توزيعات منتظمة.', en: 'Relatively stable companies that may provide regular dividends.', fr: 'Sociétés relativement stables pouvant verser des dividendes réguliers.' }, symbols: ['KO', 'PEP', 'PG'] },
      { title: { ar: 'الطاقة', en: 'Energy', fr: 'Énergie' }, body: { ar: 'قد تقدم توزيعات قوية لكنها تتأثر بأسعار النفط والغاز.', en: 'May offer strong dividends but is affected by oil and gas prices.', fr: 'Dividendes parfois élevés mais sensibles au pétrole et au gaz.' }, symbols: ['XOM', 'CVX'] },
      { title: { ar: 'البنوك', en: 'Banks', fr: 'Banques' }, body: { ar: 'تعتمد توزيعاتها على الأرباح وجودة القروض والسيولة.', en: 'Dividends depend on earnings, loan quality, and liquidity.', fr: 'Dividendes liés aux bénéfices, à la qualité du crédit et à la liquidité.' }, symbols: ['JPM', 'BAC'] },
      { title: { ar: 'الاتصالات', en: 'Telecom', fr: 'Télécoms' }, body: { ar: 'غالبًا تتميز بتدفقات نقدية مستقرة نسبيًا.', en: 'Often features relatively stable cash flows.', fr: 'Flux de trésorerie souvent relativement stables.' }, symbols: ['VZ', 'T'] },
      { title: { ar: 'المرافق العامة', en: 'Utilities', fr: 'Services publics' }, body: { ar: 'قد تكون دفاعية نسبيًا وتوزيعاتها منتظمة.', en: 'Can be relatively defensive with regular dividends.', fr: 'Peuvent être défensives avec des dividendes réguliers.' }, symbols: ['NEE', 'DUK', 'SO'] },
      { title: { ar: 'العقارات REITs', en: 'REITs', fr: 'REITs' }, body: { ar: 'تعتمد على دخل الإيجارات وأسعار الفائدة.', en: 'Depend on rental income and interest rates.', fr: 'Dépendent des loyers et des taux d’intérêt.' }, symbols: ['O'] },
    ],
  },
  cyclical: {
    comparisonTitle: { ar: 'الأسهم الدورية مقارنة بالأسهم الدفاعية', en: 'Cyclical stocks versus defensive stocks', fr: 'Actions cycliques et actions défensives' },
    leftTitle: { ar: 'الأسهم الدورية', en: 'Cyclical stocks', fr: 'Actions cycliques' },
    leftItems: {
      ar: ['تستفيد من النمو الاقتصادي', 'قد ترتفع بقوة وقت الانتعاش', 'أكثر حساسية للركود', 'تقلباتها أعلى غالبًا', 'مناسبة لمن يتحمل مخاطر أعلى'],
      en: ['Benefit from economic growth', 'May rise strongly during recoveries', 'More sensitive to recessions', 'Often higher volatility', 'Suited to higher risk tolerance'],
      fr: ['Profitent de la croissance économique', 'Peuvent fortement monter en reprise', 'Plus sensibles aux récessions', 'Volatilité souvent plus élevée', 'Adaptées à une tolérance au risque plus élevée'],
    },
    rightTitle: { ar: 'الأسهم الدفاعية', en: 'Defensive stocks', fr: 'Actions défensives' },
    rightItems: {
      ar: ['طلب أكثر استقرارًا', 'تقلب أقل غالبًا', 'أقل تأثرًا بالدورة الاقتصادية', 'مناسبة للمستثمر المحافظ', 'تشمل قطاعات أساسية مثل الغذاء والدواء والمرافق'],
      en: ['More stable demand', 'Often lower volatility', 'Less affected by the economic cycle', 'Suited to conservative investors', 'Includes essential sectors such as food, medicine, and utilities'],
      fr: ['Demande plus stable', 'Volatilité souvent plus faible', 'Moins sensibles au cycle économique', 'Adaptées aux investisseurs prudents', 'Comprennent des secteurs essentiels comme alimentation, santé et services publics'],
    },
    sectors: [
      { title: { ar: 'السيارات', en: 'Autos', fr: 'Automobile' }, body: { ar: 'تتأثر بقوة بثقة المستهلك وأسعار الفائدة والطلب على التمويل.', en: 'Strongly affected by consumer confidence, interest rates, and financing demand.', fr: 'Très sensible à la confiance des consommateurs, aux taux et au financement.' }, symbols: ['F', 'GM', 'TSLA'] },
      { title: { ar: 'السفر والطيران', en: 'Travel and airlines', fr: 'Voyage et aérien' }, body: { ar: 'يتحسن غالبًا مع قوة الاقتصاد وارتفاع الإنفاق على السفر.', en: 'Often improves with a stronger economy and higher travel spending.', fr: 'S’améliore souvent avec une économie solide et les dépenses de voyage.' }, symbols: ['DAL', 'UAL', 'AAL'] },
      { title: { ar: 'الفنادق والترفيه', en: 'Hotels and entertainment', fr: 'Hôtels et loisirs' }, body: { ar: 'يتأثر بالدخل المتاح وثقة المستهلك.', en: 'Affected by disposable income and consumer confidence.', fr: 'Influencé par le revenu disponible et la confiance des consommateurs.' }, symbols: ['MAR', 'HLT'] },
      { title: { ar: 'الصناعة', en: 'Industrials', fr: 'Industrie' }, body: { ar: 'تعتمد على الطلب التجاري والإنفاق الرأسمالي.', en: 'Depends on business demand and capital spending.', fr: 'Dépend de la demande commerciale et des investissements.' }, symbols: ['CAT', 'DE', 'BA'] },
      { title: { ar: 'السلع الكمالية', en: 'Luxury goods', fr: 'Biens de luxe' }, body: { ar: 'ترتفع غالبًا عند تحسن دخل المستهلكين.', en: 'Often rises when consumer income improves.', fr: 'Progressent souvent quand le revenu des consommateurs augmente.' }, symbols: ['NKE', 'RACE'] },
      { title: { ar: 'البناء والعقار', en: 'Construction and real estate', fr: 'Construction et immobilier' }, body: { ar: 'يتأثر بأسعار الفائدة والتمويل والدورة الاقتصادية.', en: 'Affected by interest rates, financing, and the economic cycle.', fr: 'Sensible aux taux, au financement et au cycle économique.' }, symbols: ['HD', 'LOW'] },
    ],
  },
  energy: {
    comparisonTitle: { ar: 'محركات ومخاطر أسهم الطاقة', en: 'Energy stock drivers and risks', fr: 'Moteurs et risques des actions énergie' },
    leftTitle: { ar: 'عوامل داعمة', en: 'Supportive drivers', fr: 'Facteurs favorables' },
    leftItems: {
      ar: ['ارتفاع أسعار النفط أو الغاز', 'طلب عالمي قوي على الطاقة', 'انضباط في الإنفاق الرأسمالي', 'تدفقات نقدية قوية', 'توزيعات أو إعادة شراء أسهم في بعض الشركات'],
      en: ['Higher oil or gas prices', 'Strong global energy demand', 'Capital spending discipline', 'Strong cash flows', 'Dividends or buybacks at some companies'],
      fr: ['Prix du pétrole ou gaz en hausse', 'Demande mondiale solide', 'Discipline d’investissement', 'Flux de trésorerie solides', 'Dividendes ou rachats dans certaines sociétés'],
    },
    rightTitle: { ar: 'مخاطر القطاع', en: 'Sector risks', fr: 'Risques du secteur' },
    rightItems: {
      ar: ['تقلب أسعار السلع', 'قرارات الإنتاج والجغرافيا السياسية', 'تكاليف تشغيل مرتفعة', 'ضغوط تنظيمية وبيئية', 'حساسية للدورة الاقتصادية'],
      en: ['Commodity price volatility', 'Production decisions and geopolitics', 'High operating costs', 'Regulatory and environmental pressure', 'Economic cycle sensitivity'],
      fr: ['Volatilité des matières premières', 'Production et géopolitique', 'Coûts opérationnels élevés', 'Pressions réglementaires et environnementales', 'Sensibilité au cycle'],
    },
    sectors: [
      { title: { ar: 'النفط والغاز', en: 'Oil and gas', fr: 'Pétrole et gaz' }, body: { ar: 'شركات إنتاج واستكشاف تتأثر مباشرة بأسعار الطاقة.', en: 'Exploration and production companies directly affected by energy prices.', fr: 'Exploration et production sensibles aux prix.' }, symbols: ['XOM', 'CVX', 'COP'] },
      { title: { ar: 'الخدمات النفطية', en: 'Oilfield services', fr: 'Services pétroliers' }, body: { ar: 'توفر المعدات والخدمات لشركات الإنتاج والحفر.', en: 'Provide equipment and services to producers and drillers.', fr: 'Équipements et services aux producteurs.' }, symbols: ['SLB', 'HAL'] },
      { title: { ar: 'خطوط الأنابيب', en: 'Pipelines', fr: 'Pipelines' }, body: { ar: 'تدفقات تعتمد على النقل والعقود أكثر من السعر الفوري أحيانًا.', en: 'Cash flows often tied to transport and contracts rather than spot prices.', fr: 'Flux liés au transport et aux contrats.' }, symbols: ['ENB', 'LNG'] },
      { title: { ar: 'الطاقة المتجددة', en: 'Renewables', fr: 'Renouvelables' }, body: { ar: 'تتأثر بالتمويل والحوافز والسياسات طويلة الأجل.', en: 'Affected by financing, incentives, and long-term policy.', fr: 'Sensibles au financement, aux incitations et aux politiques.' }, symbols: ['FSLR', 'ENPH', 'NEE'] },
    ],
  },
  banking: {
    comparisonTitle: { ar: 'عوامل قراءة أسهم البنوك', en: 'How to read bank stocks', fr: 'Comment lire les actions bancaires' },
    leftTitle: { ar: 'عوامل داعمة', en: 'Supportive factors', fr: 'Facteurs favorables' },
    leftItems: {
      ar: ['نمو الودائع والسيولة', 'جودة قروض مستقرة', 'هامش فائدة صحي', 'رأس مال قوي', 'تنوع مصادر الإيرادات'],
      en: ['Deposit and liquidity growth', 'Stable loan quality', 'Healthy net interest margin', 'Strong capital', 'Diversified revenue sources'],
      fr: ['Croissance des dépôts et liquidité', 'Qualité du crédit stable', 'Marge d’intérêt saine', 'Capital solide', 'Revenus diversifiés'],
    },
    rightTitle: { ar: 'مخاطر مصرفية', en: 'Banking risks', fr: 'Risques bancaires' },
    rightItems: {
      ar: ['تعثر القروض', 'ضغط السيولة', 'تقلب أسعار الفائدة', 'مخاطر تنظيمية', 'تراجع النشاط الاقتصادي'],
      en: ['Loan defaults', 'Liquidity pressure', 'Interest-rate volatility', 'Regulatory risks', 'Economic slowdown'],
      fr: ['Défauts de crédit', 'Pression sur la liquidité', 'Volatilité des taux', 'Risques réglementaires', 'Ralentissement économique'],
    },
    sectors: [
      { title: { ar: 'البنوك الكبرى', en: 'Large banks', fr: 'Grandes banques' }, body: { ar: 'بنوك عالمية متنوعة في القروض والأسواق والخدمات المالية.', en: 'Global banks diversified across lending, markets, and financial services.', fr: 'Banques mondiales diversifiées.' }, symbols: ['JPM', 'BAC', 'C'] },
      { title: { ar: 'البنوك الإقليمية', en: 'Regional banks', fr: 'Banques régionales' }, body: { ar: 'ترتبط بقوة بالودائع المحلية وجودة القروض في أسواقها.', en: 'Tied closely to local deposits and loan quality.', fr: 'Liées aux dépôts locaux et au crédit.' }, symbols: ['USB', 'PNC'] },
      { title: { ar: 'المدفوعات', en: 'Payments', fr: 'Paiements' }, body: { ar: 'شركات تعتمد على حجم المعاملات والإنفاق الإلكتروني.', en: 'Companies driven by transaction volume and digital spending.', fr: 'Sociétés portées par les transactions.' }, symbols: ['V', 'MA', 'AXP'] },
      { title: { ar: 'إدارة الأصول', en: 'Asset management', fr: 'Gestion d’actifs' }, body: { ar: 'تعتمد على الأصول المدارة وحركة الأسواق وتدفقات العملاء.', en: 'Depends on assets under management, markets, and client flows.', fr: 'Dépend des actifs gérés et des flux clients.' }, symbols: ['BLK', 'SCHW'] },
    ],
  },
  sharia: {
    comparisonTitle: { ar: 'قراءة أولية وليست فتوى', en: 'Initial screening, not a ruling', fr: 'Lecture initiale, pas une fatwa' },
    leftTitle: { ar: 'ضوابط عامة', en: 'General checks', fr: 'Contrôles généraux' },
    leftItems: {
      ar: ['النشاط الأساسي للشركة', 'مستوى الديون', 'الإيرادات غير المتوافقة', 'السيولة والنسب المالية', 'مصدر تصنيف موثوق عند توفره'],
      en: ['Core business activity', 'Debt level', 'Non-compliant income', 'Liquidity and financial ratios', 'Trusted screening source when available'],
      fr: ['Activité principale', 'Niveau d’endettement', 'Revenus non conformes', 'Liquidité et ratios financiers', 'Source fiable si disponible'],
    },
    rightTitle: { ar: 'حدود مهمة', en: 'Important limits', fr: 'Limites importantes' },
    rightItems: {
      ar: ['لا يوجد حكم نهائي دون مصدر موثوق', 'قد تختلف المعايير بين الجهات', 'تتغير البيانات المالية مع الوقت', 'يلزم الرجوع إلى جهة شرعية مختصة', 'هذه الصفحة تعليمية فقط'],
      en: ['No final claim without a trusted source', 'Standards may differ by provider', 'Financial data changes over time', 'Consult a qualified Sharia authority', 'This page is educational only'],
      fr: ['Pas d’affirmation finale sans source fiable', 'Normes différentes selon les fournisseurs', 'Données financières évolutives', 'Consulter une autorité qualifiée', 'Page éducative uniquement'],
    },
    sectors: [
      { title: { ar: 'قد يكون متوافقًا', en: 'May be compliant', fr: 'Peut être conforme' }, body: { ar: 'تصنيف مبدئي عند توفر مؤشرات أولية فقط، ولا يعد حكمًا شرعيًا نهائيًا.', en: 'Preliminary status only when initial signals exist, not a final Sharia ruling.', fr: 'Statut préliminaire, pas une décision finale.' } },
      { title: { ar: 'يحتاج مراجعة', en: 'Needs review', fr: 'À examiner' }, body: { ar: 'يستخدم عند الحاجة إلى تحقق إضافي من النشاط أو النسب المالية.', en: 'Used when activity or ratios need additional verification.', fr: 'Utilisé quand une vérification est nécessaire.' } },
      { title: { ar: 'غير مصنف', en: 'Unclassified', fr: 'Non classé' }, body: { ar: 'لا تتوفر بيانات موثوقة كافية لتقديم تصنيف مبدئي.', en: 'Not enough reliable data for a preliminary label.', fr: 'Données fiables insuffisantes.' } },
      { title: { ar: 'مصدر التصنيف', en: 'Classification source', fr: 'Source de classification' }, body: { ar: 'يعرض اسم المزود وتاريخ التحديث فقط عند توفر مزود فلترة شرعية موثوق.', en: 'Provider name and update date appear only when a trusted screening source exists.', fr: 'Le fournisseur apparaît uniquement si une source fiable existe.' } },
    ],
  },
};

function localeFor(lang: string) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

function changeTone(value: number | null) {
  if (value === null || value === 0) return 'text-slate-500 dark:text-slate-300';
  return value > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300';
}

function changeBadgeClass(value: number | null) {
  if (value === null || value === 0) return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
  return value > 0
    ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100'
    : 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-500/40 dark:bg-rose-900/40 dark:text-rose-100';
}

function shariaStatusLabelKey(status: StockCategoryNewsItem['shariaStatus']): keyof typeof TR {
  if (status === 'possible') return 'stock_category_sharia_status_possible';
  if (status === 'needs_review') return 'stock_category_sharia_status_review';
  if (status === 'non_compliant') return 'stock_category_sharia_status_non_compliant';
  return 'stock_category_sharia_status_unclassified';
}

function shariaStatusBadgeClass(status: StockCategoryNewsItem['shariaStatus']) {
  if (status === 'possible') {
    return 'border-teal-300 bg-teal-100 text-teal-800 dark:border-teal-500/40 dark:bg-teal-900/40 dark:text-teal-100';
  }
  if (status === 'needs_review') {
    return 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-900/40 dark:text-amber-100';
  }
  if (status === 'non_compliant') {
    return 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-500/40 dark:bg-rose-900/40 dark:text-rose-100';
  }
  return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600/60 dark:bg-slate-800/70 dark:text-slate-100';
}

function itemSearchText(item: StockCategoryNewsItem) {
  return [
    item.companyName,
    item.ticker,
    item.source,
    item.sector,
    ...(item.sectors ?? []),
    item.title,
    item.summary,
    item.titleOriginal,
    item.summaryOriginal,
  ].join(' ').toLowerCase();
}

function categoryMatches(item: StockCategoryNewsItem, category: StockCategoryFilterKey) {
  if (category === 'all') return true;
  return new Set([item.sector, ...(item.sectors ?? [])]).has(category);
}

function itemMatchesSearch(item: StockCategoryNewsItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return itemSearchText(item).includes(needle);
}

function normalizeText(value: string) {
  if (!/[ÃÂØÙâ]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from(Array.from(value, char => char.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return decoded.includes('\uFFFD') ? value : decoded;
  } catch {
    return value;
  }
}

export function StockCategoryNewsPage({ categoryId }: { categoryId: StockCategoryId }) {
  const config = getStockCategoryConfig(categoryId);
  const { dir, lang, t } = useLanguage();
  const locale = localeFor(lang);
  const tr = useCallback((key: keyof typeof TR) => t(key), [t]);
  const localizedLang = (lang === 'en' || lang === 'fr' ? lang : 'ar') as 'ar' | 'en' | 'fr';
  const guide = PAGE_GUIDES[categoryId];
  const [items, setItems] = useState<StockCategoryNewsItem[]>([]);
  const [prices, setPrices] = useState<TechStockPrice[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<StockCategoryFilterKey>('all');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const [movers, setMovers] = useState<StockCategoryMoversResponse | null>(null);
  const [moversLoading, setMoversLoading] = useState(true);
  const [showMoversDetails, setShowMoversDetails] = useState(false);

  const loadNews = useCallback(async (showLoader = true) => {
    if (!config) return;
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setError('');
    try {
      const response = await fetch(`/api/stock-categories/news?category=${encodeURIComponent(config.id)}&lang=${encodeURIComponent(lang)}&limit=60`);
      const json = await response.json().catch(() => ({})) as NewsApiResponse;
      if (!response.ok || !json.success) {
        throw new Error('reason' in json ? json.reason || json.error || tr('stock_category_error') : tr('stock_category_error'));
      }
      setItems(json.items);
      setPrices(json.prices ?? []);
      setLastUpdated(json.lastUpdated);
    } catch (loadError) {
      setItems([]);
      setPrices([]);
      setLastUpdated('');
      setError(loadError instanceof Error ? loadError.message : tr('stock_category_error'));
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [config, lang, tr]);

  const loadMovers = useCallback(async () => {
    if (!config) return;
    setMoversLoading(true);
    try {
      const response = await fetch(`/api/stock-categories/movers?category=${encodeURIComponent(config.id)}&limit=5`);
      const json = await response.json().catch(() => null) as StockCategoryMoversResponse | null;
      setMovers(json);
    } catch {
      setMovers({
        ok: false,
        category: config.id,
        code: 'STOCK_CATEGORY_MOVERS_UNAVAILABLE',
        updated_at: null,
        source: 'Yahoo Finance',
        data: null,
      });
    } finally {
      setMoversLoading(false);
    }
  }, [config]);

  useEffect(() => {
    void loadNews();
    void loadMovers();
  }, [loadNews, loadMovers]);

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
    setCategory('all');
    setQuery('');
  }, [categoryId]);

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
  }, [category, query, lang]);

  const baseFilteredItems = useMemo(() => items.filter(item => itemMatchesSearch(item, query)), [items, query]);
  const categoryCounts = useMemo(() => {
    if (!config) return {};
    return Object.fromEntries(
      config.filters.map(filter => [filter.key, baseFilteredItems.filter(item => categoryMatches(item, filter.key)).length]),
    ) as Record<string, number>;
  }, [baseFilteredItems, config]);

  const filteredItems = useMemo(() => (
    baseFilteredItems
      .filter(item => categoryMatches(item, category))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  ), [baseFilteredItems, category]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMoreItems = visibleCount < filteredItems.length;
  const latestItems = filteredItems.slice(0, 5);
  const sectorGuideCards = useMemo<PageGuide['sectors']>(() => {
    if (guide?.sectors?.length) return guide.sectors.slice(0, 8);
    return config?.filters
      .filter(filter => filter.key !== 'all')
      .slice(0, 8)
      .map(filter => ({
        title: {
          ar: tr(filter.labelKey),
          en: tr(filter.labelKey),
          fr: tr(filter.labelKey),
        },
        body: {
          ar: filter.keywords.length ? filter.keywords.slice(0, 4).join(' · ') : tr(filter.labelKey),
          en: filter.keywords.length ? filter.keywords.slice(0, 4).join(' · ') : tr(filter.labelKey),
          fr: filter.keywords.length ? filter.keywords.slice(0, 4).join(' · ') : tr(filter.labelKey),
        },
      })) ?? [];
  }, [config, guide, tr]);

  const mentionedTickers = useMemo(() => {
    const counts = new Map<string, MentionedTicker>();
    filteredItems.forEach(item => {
      const ticker = String(item.ticker ?? '').trim().toUpperCase();
      if (!ticker || ticker === categoryId.toUpperCase()) return;
      const current = counts.get(ticker);
      counts.set(ticker, {
        ticker,
        companyName: current?.companyName ?? item.companyName,
        count: (current?.count ?? 0) + 1,
      });
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [categoryId, filteredItems]);

  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach(item => counts.set(item.source, (counts.get(item.source) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [items]);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const formatPrice = (value: number | null, currency = 'USD') => {
    if (value === null) return tr('market_unavailable_short');
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: value > 100 ? 2 : 3,
    }).format(value);
  };

  const formatNumber = (value: number | null) => {
    if (value === null) return tr('market_unavailable_short');
    return new Intl.NumberFormat(locale, { notation: value > 999_999 ? 'compact' : 'standard' }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return tr('market_unavailable_short');
    return `${value > 0 ? '+' : ''}${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`;
  };

  const sectionTitle = (key: MoverSectionKey) => ({
    topGainers: tr('stock_category_movers_top_gainers'),
    topLosers: tr('stock_category_movers_top_losers'),
    highestPrice: tr('stock_category_movers_highest_price'),
    lowestPrice: tr('stock_category_movers_lowest_price'),
    highestVolume: tr('stock_category_movers_highest_volume'),
    lowestVolume: tr('stock_category_movers_lowest_volume'),
  }[key]);

  const renderMoverRows = (rows: StockCategoryMoverItem[]) => {
    if (rows.length === 0) {
      return (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          {tr('stock_category_movers_no_section_data')}
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {rows.map(row => (
          <div key={`${row.rank}-${row.symbol}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white/85 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-xs font-black text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-100">
              {row.rank}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span dir="ltr" className="font-black text-slate-950 dark:text-white">{row.symbol}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${changeBadgeClass(row.changePercent)}`} dir="ltr">
                  {formatPercent(row.changePercent)}
                </span>
              </div>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.name}</p>
            </div>
            <div className="shrink-0 text-end">
              <p dir="ltr" className="text-sm font-bold text-slate-900 dark:text-white">{formatPrice(row.price, row.currency)}</p>
              <p dir="ltr" className="text-[11px] text-slate-500 dark:text-slate-400">{formatNumber(row.volume)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const priceMap = useMemo(() => new Map(prices.map(price => [price.symbol, price])), [prices]);
  const updatedLabel = lastUpdated ? `${tr('tech_news_last_updated')}: ${formatDateTime(lastUpdated)}` : tr('tech_news_updated_daily');

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white" dir={dir}>
        <Sidebar />
        <main className="stock-category-main">
          <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-500/30 dark:bg-slate-900">
            <AlertTriangle className="mx-auto mb-3 text-rose-500" />
            <p className="font-bold">{tr('stock_category_error')}</p>
          </div>
        </main>
        <style jsx global>{`
          .stock-category-main{box-sizing:border-box;width:100%;max-width:100%;overflow-x:hidden;padding:6rem 1rem 2.5rem}
          @media(min-width:1025px){.stock-category-main{width:100%;margin:0;padding:1.5rem 2rem 3rem;padding-right:calc(var(--sidebar-w,230px) + 2rem)}[dir="ltr"] .stock-category-main{padding-left:calc(var(--sidebar-w,230px) + 2rem);padding-right:2rem}}
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f7ff_0%,#f8fbff_36%,#eef6ff_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top,#0b2b4a_0%,#06182d_38%,#020817_100%)] dark:text-white" dir={dir}>
      <Sidebar />
      <main className="stock-category-main">
        <div className="mx-auto grid w-full max-w-[1500px] gap-6">
          <section className="rounded-[2rem] border border-cyan-200/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,118,110,.12)] backdrop-blur dark:border-cyan-400/20 dark:bg-slate-950/72 dark:shadow-[0_24px_90px_rgba(0,0,0,.35)] sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/25">
                  {config.shariaCaution ? <ShieldCheck size={26} /> : <Newspaper size={26} />}
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-100">
                    <Sparkles size={14} />
                    {tr(config.badgeKey)}
                  </span>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    {tr(config.titleKey)}
                  </h1>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                    {tr(config.subtitleKey)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { void loadNews(false); void loadMovers(); }}
                disabled={refreshing}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-300 bg-white px-5 text-sm font-bold text-cyan-800 shadow-sm transition hover:bg-cyan-50 active:scale-[0.98] disabled:opacity-60 dark:border-cyan-500/30 dark:bg-slate-900/70 dark:text-cyan-100 dark:hover:bg-cyan-950/50"
              >
                <RefreshCcw size={17} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? tr('tech_news_refreshing') : tr('market_refresh_news')}
              </button>
            </div>
          </section>

          <CategoryStockTicker
            categoryType={config.id}
            symbols={config.watchlist}
            priceData={prices}
            direction={dir}
            locale={locale}
          />

          <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <div className="grid min-w-0 gap-6">
              <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
                  <div className="rounded-3xl border border-cyan-200 bg-cyan-50/70 p-5 dark:border-cyan-500/25 dark:bg-cyan-950/25">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-cyan-700 shadow-sm dark:bg-slate-900 dark:text-cyan-200">
                        <BookOpen size={19} />
                      </span>
                      <h2 className="text-lg font-black text-slate-950 dark:text-white">{tr(config.explanationTitleKey)}</h2>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{tr(config.explanationBodyKey)}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                        <Info size={19} />
                      </span>
                      <h3 className="font-black text-slate-950 dark:text-white">{tr(config.sectorGuideTitleKey)}</h3>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {(config.metricCards ?? config.filters.filter(filter => filter.key !== 'all').slice(0, 4).map(filter => ({ labelKey: filter.labelKey, bodyKey: filter.labelKey }))).map(card => (
                        <div key={`${card.labelKey}-${card.bodyKey}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{tr(card.labelKey)}</p>
                          <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{tr(card.bodyKey)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {guide && (
                  <div className="mt-5 rounded-3xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/55">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                        <Layers size={19} />
                      </span>
                      <h2 className="text-lg font-black text-slate-950 dark:text-white">
                        {normalizeText(guide.comparisonTitle[localizedLang])}
                      </h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {[
                        { title: normalizeText(guide.leftTitle[localizedLang]), items: guide.leftItems[localizedLang].map(normalizeText), tone: 'positive' },
                        { title: normalizeText(guide.rightTitle[localizedLang]), items: guide.rightItems[localizedLang].map(normalizeText), tone: 'caution' },
                      ].map(card => (
                        <article
                          key={card.title}
                          className={`rounded-3xl border p-5 ${
                            card.tone === 'positive'
                              ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-950/20'
                              : 'border-amber-200 bg-amber-50/70 dark:border-amber-500/25 dark:bg-amber-950/20'
                          }`}
                        >
                          <h3 className="text-base font-black text-slate-950 dark:text-white">{card.title}</h3>
                          <ul className="mt-4 grid gap-2">
                            {card.items.map(item => (
                              <li key={item} className="flex items-start gap-2 text-sm font-bold leading-7 text-slate-700 dark:text-slate-200">
                                <span
                                  className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                                    card.tone === 'positive'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-100'
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-100'
                                  }`}
                                  aria-hidden="true"
                                >
                                  {card.tone === 'positive' ? '✓' : '•'}
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-950 dark:text-white">{tr(config.titleKey)}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{updatedLabel}</p>
                  </div>
                  <span className="inline-flex h-10 w-fit items-center rounded-full border border-cyan-200 bg-cyan-50 px-4 text-sm font-black text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-100">
                    {new Intl.NumberFormat(locale).format(filteredItems.length)} {tr('stock_category_results_match')}
                  </span>
                  <label className="relative block w-full lg:max-w-md">
                    <span className="sr-only">{tr(config.searchPlaceholderKey)}</span>
                    <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 rtl:right-4 ltr:left-4" size={18} />
                    <input
                      value={query}
                      onChange={event => setQuery(event.target.value)}
                      placeholder={tr(config.searchPlaceholderKey)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-11 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-cyan-900/30"
                    />
                  </label>
                </div>

                <div className="mt-5">
                  <p className="mb-3 text-sm font-bold text-slate-600 dark:text-slate-300">{tr(config.filterLabelKey)}</p>
                  <div className="w-full overflow-x-auto no-scrollbar">
                    <div className="flex min-w-max gap-2">
                      {config.filters.map(filter => {
                        const active = category === filter.key;
                        return (
                          <button
                            key={filter.key}
                            type="button"
                            onClick={() => setCategory(filter.key)}
                            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition active:scale-[0.98] ${
                              active
                                ? 'border-cyan-500 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-950/30'
                            }`}
                          >
                            {tr(filter.labelKey)}
                            <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                              {categoryCounts[filter.key] ?? 0}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-5 rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
                    {tr('stock_category_error')}
                  </div>
                )}

                {loading ? (
                  <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-52 animate-pulse rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
                    ))}
                  </div>
                ) : visibleItems.length === 0 ? (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
                    <Newspaper className="mx-auto mb-3 text-cyan-600 dark:text-cyan-300" size={30} />
                    <h3 className="text-lg font-black text-slate-950 dark:text-white">{tr('stock_category_empty')}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr('stock_category_empty_hint')}</p>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {visibleItems.map(item => {
                      const price = priceMap.get(item.ticker);
                      return (
                        <article key={item.id} className="group flex min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span dir="ltr" className="rounded-full border border-cyan-300 bg-cyan-100 px-3 py-1.5 text-xs font-black text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-900/40 dark:text-cyan-100">
                              {item.ticker}
                            </span>
                            <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100">
                              {item.source}
                            </span>
                            {item.shariaStatus && (
                              <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${shariaStatusBadgeClass(item.shariaStatus)}`}>
                                {tr(shariaStatusLabelKey(item.shariaStatus))}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-4 text-lg font-black leading-relaxed text-slate-950 dark:text-white">
                            {item.title}
                          </h3>
                          <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                            {item.summary || item.title}
                          </p>
                          <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{item.companyName}</p>
                              <p dir="ltr" className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                                {formatPrice(price?.price ?? item.price, 'USD')}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{tr('stock_category_change_percent')}</p>
                              <p dir="ltr" className={`mt-1 text-sm font-black ${changeTone(price?.changePercent ?? item.changePercent)}`}>
                                {formatPercent(price?.changePercent ?? item.changePercent)}
                              </p>
                            </div>
                          </div>
                          {item.shariaStatus && (
                            <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                              <p>
                                <span className="font-black text-slate-900 dark:text-white">{tr('stock_category_sharia_compliance_status')}: </span>
                                <span className={`font-bold ${item.shariaStatus === 'non_compliant' ? 'text-rose-700 dark:text-rose-200' : item.shariaStatus === 'needs_review' ? 'text-amber-700 dark:text-amber-200' : item.shariaStatus === 'possible' ? 'text-teal-700 dark:text-teal-200' : 'text-slate-700 dark:text-slate-200'}`}>
                                  {tr(shariaStatusLabelKey(item.shariaStatus))}
                                </span>
                              </p>
                              <p className="mt-1">
                                <span className="font-black text-slate-900 dark:text-white">{tr('stock_category_sharia_note_label')}: </span>
                                {tr('stock_category_sharia_preliminary_note')}
                              </p>
                            </div>
                          )}
                          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <Clock3 size={14} />
                              {formatDateTime(item.publishedAt)}
                            </span>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 text-sm font-bold text-white shadow-sm transition hover:shadow-lg active:scale-[0.98]"
                            >
                              {tr('defensive_news_read_article')}
                              <ExternalLink size={15} />
                            </a>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {!loading && visibleItems.length > 0 && (
                  <div className="mt-6 flex justify-center">
                    {hasMoreItems ? (
                      <button
                        type="button"
                        onClick={() => setVisibleCount(count => count + NEWS_PAGE_SIZE)}
                        className="inline-flex h-12 items-center justify-center rounded-2xl border border-cyan-300 bg-white px-6 text-sm font-black text-cyan-800 transition hover:bg-cyan-50 active:scale-[0.98] dark:border-cyan-500/30 dark:bg-slate-900 dark:text-cyan-100"
                      >
                        {tr('tech_news_load_more')}
                      </button>
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                        {tr('tech_news_all_loaded')}
                      </span>
                    )}
                  </div>
                )}
              </section>
            </div>

            <aside className="grid min-w-0 gap-6 xl:sticky xl:top-24 xl:self-start">
              <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">
                  <Newspaper size={19} className="text-cyan-600 dark:text-cyan-300" />
                  {tr('stock_category_latest_news_title')}
                </h2>
                <div className="mt-4 space-y-2">
                  {latestItems.length > 0 ? latestItems.map(item => (
                    <a
                      key={`latest-${item.id}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-cyan-300 hover:bg-cyan-50 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-950/30"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span dir="ltr" className="rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-black text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-100">
                          {item.ticker}
                        </span>
                        <span className="truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.source}</span>
                      </div>
                      <p className="line-clamp-2 text-sm font-bold leading-6 text-slate-800 dark:text-slate-100">{item.title}</p>
                    </a>
                  )) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                      {tr('stock_category_empty')}
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-950 dark:text-white">{tr(config.moversTitleKey)}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr('stock_category_movers_subtitle')}</p>
                  </div>
                  <BarChart3 className="text-cyan-600 dark:text-cyan-300" />
                </div>
                {moversLoading ? (
                  <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    {tr('stock_category_movers_loading')}
                  </p>
                ) : movers?.ok && movers.data ? (
                  <div className="mt-5 space-y-5">
                    {PRIMARY_MOVER_SECTIONS.map(section => (
                      <div key={section}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">{sectionTitle(section)}</h3>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                            {tr('stock_category_movers_three_stocks')}
                          </span>
                        </div>
                        {renderMoverRows(movers.data[section].slice(0, 3))}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowMoversDetails(true)}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300 bg-cyan-50 text-sm font-black text-cyan-800 transition hover:bg-cyan-100 active:scale-[0.98] dark:border-cyan-500/30 dark:bg-cyan-950/30 dark:text-cyan-100"
                    >
                      <Layers size={16} />
                      {tr('stock_category_movers_details')}
                    </button>
                  </div>
                ) : (
                  <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
                    {tr('stock_category_movers_empty')}
                  </p>
                )}
              </section>

              <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">
                  <TrendingUp size={19} className="text-cyan-600 dark:text-cyan-300" />
                  {tr(config.mentionedTitleKey)}
                </h2>
                <div className="mt-4 space-y-2">
                  {mentionedTickers.length > 0 ? mentionedTickers.map((item, index) => (
                    <div key={item.ticker} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-xs font-black text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-100">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p dir="ltr" className="font-black text-slate-950 dark:text-white">{item.ticker}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.companyName}</p>
                      </div>
                      <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100">
                        {tr('tech_news_mentions_count').replace('{count}', String(item.count))}
                      </span>
                    </div>
                  )) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                      {tr('stock_category_empty')}
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">
                  <FileText size={19} className="text-cyan-600 dark:text-cyan-300" />
                  {tr(config.sourcesTitleKey)}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {sourceCounts.length > 0 ? sourceCounts.map(([source, count]) => (
                    <span key={source} className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100">
                      {source} · {count}
                    </span>
                  )) : (
                    <span className="text-sm text-slate-500 dark:text-slate-400">{tr('stock_category_empty')}</span>
                  )}
                </div>
              </section>
            </aside>
          </section>

          {config.shariaCaution && (
            <section className="rounded-[2rem] border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100 sm:p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 shrink-0" />
                <div>
                  <h2 className="text-lg font-black">{tr(config.disclaimerTitleKey)}</h2>
                  <p className="mt-2 text-sm leading-7">{tr(config.disclaimerBodyKey)}</p>
                  <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300/80 bg-white/60 px-4 py-3 text-sm font-bold text-amber-950 dark:border-amber-500/30 dark:bg-slate-950/30 dark:text-amber-100">
                    <span>{tr('stock_category_sharia_classification_source')}:</span>
                    <span>{tr('stock_category_sharia_source_unavailable')}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {sectorGuideCards.length > 0 && (
            <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="text-sm font-black text-cyan-700 dark:text-cyan-200">{tr('stock_category_educational_guide')}</span>
                  <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{tr(config.sectorGuideTitleKey)}</h2>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                  {tr('stock_category_sector_guide_note')}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sectorGuideCards.map(card => (
                  <article key={normalizeText(card.title[localizedLang])} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/45 dark:text-cyan-100">
                        <BookOpen size={18} />
                      </span>
                      <h3 className="font-black text-slate-950 dark:text-white">{normalizeText(card.title[localizedLang])}</h3>
                    </div>
                    <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{normalizeText(card.body[localizedLang])}</p>
                    {card.symbols?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {card.symbols.map(symbol => (
                          <span key={symbol} dir="ltr" className="rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-black text-cyan-800 dark:border-cyan-500/30 dark:bg-slate-950 dark:text-cyan-100">
                            {symbol}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-[2rem] border border-cyan-200/70 bg-white/90 p-5 text-center shadow-sm dark:border-cyan-500/20 dark:bg-slate-950/70 sm:p-6">
            <h2 className="text-lg font-black text-slate-950 dark:text-white">{config.shariaCaution ? tr('defensive_news_disclaimer_title') : tr(config.disclaimerTitleKey)}</h2>
            <p className="mx-auto mt-2 max-w-4xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              {config.shariaCaution ? tr('stock_category_standard_disclaimer') : tr(config.disclaimerBodyKey)}
            </p>
          </section>
        </div>
      </main>

      {showMoversDetails && movers?.ok && movers.data && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">{tr('stock_category_movers_full_title')}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr('stock_category_movers_full_subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMoversDetails(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                aria-label={tr('common_close')}
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[calc(92vh-100px)] overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {ALL_MOVER_SECTIONS.map(section => (
                  <section key={section} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-black text-slate-950 dark:text-white">{sectionTitle(section)}</h3>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                        {tr('stock_category_movers_five_stocks')}
                      </span>
                    </div>
                    {renderMoverRows(movers.data[section])}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        .stock-category-main{box-sizing:border-box;width:100%;max-width:100%;overflow-x:hidden;padding:6rem 1rem 2.5rem}
        @media(min-width:640px){.stock-category-main{padding-inline:1.5rem}}
        @media(min-width:1025px){.stock-category-main{width:100%;margin:0;padding:1.5rem 2rem 3rem;padding-right:calc(var(--sidebar-w,230px) + 2rem)}[dir="ltr"] .stock-category-main{padding-left:calc(var(--sidebar-w,230px) + 2rem);padding-right:2rem}}
      `}</style>
    </div>
  );
}

export default StockCategoryNewsPage;
