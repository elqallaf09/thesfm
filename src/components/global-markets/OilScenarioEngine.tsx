'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CircleAlert,
  Droplets,
  Gauge,
  RefreshCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { OilTargetStressTest } from '@/components/global-markets/OilTargetStressTest';
import { useLanguage } from '@/hooks/useLanguage';
import {
  DEFAULT_OIL_SCENARIO_INPUT,
  calculateOilScenario,
  type OilScenarioDriverKey,
  type OilScenarioId,
  type OilScenarioInput,
} from '@/lib/market/oilScenarioEngine';
import styles from './OilScenarioEngine.module.css';

type Benchmark = 'brent' | 'wti';

type EnergyQuote = {
  category: string;
  displayName: string;
  nameAr: string;
  price: number | null;
  available: boolean;
  source: string | null;
  lastUpdated: string | null;
  delayed: boolean;
};

type EnergyResponse = {
  ok: boolean;
  source?: string;
  updated_at?: string | null;
  items?: EnergyQuote[];
};

type OilEvidenceItem = {
  id: string;
  kind: 'news' | 'calendar' | 'inventory' | 'chokepoint' | 'policy';
  title: string;
  detail: string | null;
  source: string;
  url: string | null;
  publishedAt: string;
  urgency: 'high' | 'medium' | 'low' | 'unknown';
  direction: 'tightening' | 'easing' | 'mixed' | 'unknown';
  verificationStatus: string | null;
  stale: boolean;
};

type OilEvidenceCategory = {
  id: 'hormuz' | 'bab_el_mandeb' | 'production' | 'inventories' | 'shipping' | 'demand_rates' | 'geopolitics';
  attention: 'high' | 'medium' | 'low' | 'unknown';
  direction: 'tightening' | 'easing' | 'mixed' | 'unknown';
  evidenceCount: number;
  latestAt: string | null;
  items: OilEvidenceItem[];
};

type OilIntelligenceResponse = {
  ok: boolean;
  generatedAt: string;
  inventory: {
    latest: number;
    previous: number;
    weeklyChange: number;
    weeklyChangePct: number;
    asOf: string;
    releaseDate: string | null;
    source: string;
    sourceUrl: string;
  } | null;
  chokepoints: {
    source: string;
    sourceUrl: string;
    releaseDate: string | null;
    aisReliabilityCaveat: boolean;
    caveat: string | null;
    hormuz: {
      period: string;
      millionBarrelsPerDay: number;
      previousPeriod: string | null;
      previousMillionBarrelsPerDay: number | null;
    };
    babElMandeb: {
      period: string;
      millionBarrelsPerDay: number;
      previousPeriod: string | null;
      previousMillionBarrelsPerDay: number | null;
    };
  } | null;
  opecPolicy: {
    source: string;
    sourceUrl: string;
    title: string;
    publishedDate: string;
    decision: 'maintain' | 'increase' | 'decrease' | 'adjust' | 'unknown';
    explicitAdjustmentThousandBarrelsPerDay: number | null;
    summary: string | null;
  } | null;
  evidence: {
    categories: OilEvidenceCategory[];
    items: OilEvidenceItem[];
  };
  coverage: {
    liveQuotes: number;
    evidenceSources: number;
    newsStories: number;
    calendarEvents: number;
    eiaInventory: boolean;
    eiaChokepoints: boolean;
    opecPolicy: boolean;
    newsPartialFailure: boolean;
    calendarPartial: boolean;
  };
};

const COPY = {
  ar: {
    back: 'العودة إلى مركز الأسواق العالمية',
    eyebrow: 'SFM Oil Scenario Engine',
    title: 'محرك سيناريوهات النفط',
    subtitle: 'اختبر كيف يمكن لاختناقات الممرات البحرية، تعطل الإنتاج، المخزون، الناقلات، التأمين، الطلب والفائدة أن تغيّر ضغط السعر. النتائج محاكاة حساسية وليست توقعاً للسعر.',
    benchmark: 'الخام المرجعي',
    brent: 'برنت',
    wti: 'WTI',
    referencePrice: 'السعر المرجعي',
    liveQuote: 'السعر السوقي المتاح',
    useLive: 'استخدم السعر السوقي',
    refresh: 'تحديث السعر',
    unavailable: 'غير متاح',
    delayed: 'متأخر / مرجعي',
    source: 'المصدر',
    updated: 'آخر تحديث',
    assumptions: 'فرضيات السيناريو',
    assumptionsHint: 'ابدأ من الصفر ثم غيّر فقط العوامل التي تريد اختبارها. لا يفترض المحرك إغلاق أي ممر أو تعطل أي إنتاج من تلقاء نفسه.',
    hormuz: 'تعطل مرور هرمز',
    bab: 'تعطل باب المندب',
    offline: 'إنتاج متعطل',
    spare: 'طاقة فائضة تدخل السوق',
    stocks: 'سحب من المخزون',
    tankers: 'تعطل / نقص الناقلات',
    insurance: 'زيادة الشحن والتأمين',
    demand: 'تغير الطلب',
    rates: 'تغير ضغط الفائدة',
    duration: 'مدة الصدمة',
    mbd: 'مليون برميل/يوم',
    bps: 'نقطة أساس',
    days: 'يوم',
    results: 'نطاقات السيناريو',
    resultsHint: 'يعرض المحرك ثلاث درجات حساسية لنفس الفرضيات بدلاً من رقم سعري واحد.',
    lower: 'حساسية منخفضة',
    central: 'الحساسية الأساسية',
    higher: 'حساسية مرتفعة',
    midpoint: 'منتصف النطاق',
    band: 'النطاق التوضيحي',
    modeledChange: 'تغير النموذج',
    pressure: 'ضغط النموذج الأساسي',
    durationFactor: 'عامل المدة',
    drivers: 'أكبر المحركات',
    positive: 'ضغط صعودي',
    negative: 'ضغط هبوطي',
    noDrivers: 'لا توجد صدمة مدخلة بعد.',
    needPrice: 'أدخل سعراً مرجعياً صالحاً أو استخدم السعر السوقي المتاح لعرض السيناريوهات.',
    methodology: 'منهجية واضحة',
    methodologyBody: 'النموذج حساب حساسية شفاف وليس توقعاً أو احتمالاً. عند توفر خط أساس رسمي من EIA لهرمز وباب المندب يطبّق المحرك عليه نسبة التعطل التي تختارها أنت لحساب البراميل المتأثرة؛ وإذا غاب الخط الأساسي يستخدم حساسية نسبية واضحة. لا يحوّل الأخبار إلى إغلاقات أو نسب من تلقاء نفسه.',
    liveDataNote: 'أي سعر حي يعتمد على سلسلة مزودي THE SFM الحالية وقد يكون متأخراً. عند تعذر البيانات لا يتم اختلاق سعر بديل.',
    reset: 'تصفير الافتراضات',
    loadError: 'تعذر جلب سعر النفط حالياً. يمكنك إدخال سعر مرجعي يدوياً.',
    evidenceTitle: 'مراقب الأدلة الحية',
    evidenceHint: 'يجمع إشارات هرمز وباب المندب والإنتاج والمخزون والشحن والطلب من الأخبار المتحققة والتقويم الاقتصادي ومصادر رسمية. الأدلة لا تتحول تلقائياً إلى نسب تعطّل.',
    evidenceRefresh: 'تحديث الأدلة',
    evidenceCoverage: 'تغطية الأدلة',
    evidenceSources: 'مصادر',
    evidenceStories: 'خبر مرتبط',
    evidenceCalendar: 'حدث اقتصادي',
    evidenceInventory: 'مخزون EIA',
    evidenceUnavailable: 'لا تتوفر أدلة حديثة كافية لهذه الفئة حالياً.',
    evidenceOpen: 'فتح المصدر',
    evidenceGuard: 'الأدلة الحية تساعدك في بناء الفرضية، لكن نسب السيناريو تبقى تحت تحكمك حتى لا يحول المحرك عنواناً إخبارياً إلى رقم وهمي.',
    evidenceLoadError: 'تعذر تحديث مراقب الأدلة الآن. تبقى فرضيات السيناريو يدوية.',
    inventoryLatest: 'المخزون التجاري الأمريكي',
    weeklyChange: 'التغير الأسبوعي',
    evidenceChokepoints: 'ممرات EIA',
    evidenceOpec: 'قرار OPEC+',
    officialReferences: 'المراجع الرسمية',
    chokepointBaseline: 'أحدث خط أساس رسمي للممرات',
    baselineFlow: 'التدفق المرجعي',
    impliedDisruption: 'حجم التعطل في فرضيتك',
    quarterlyReference: 'تقدير ربعي وليس حركة لحظية',
    aisCaveat: 'تنبيه EIA: بيانات AIS لهرمز في 2026 أقل موثوقية وتُراجع بشكل متكرر.',
    opecLatest: 'أحدث بيان إنتاج رسمي من OPEC',
    policyDecision: 'حالة القرار',
    decisionMaintain: 'الإبقاء على الإنتاج المطلوب',
    decisionIncrease: 'زيادة إنتاج مذكورة',
    decisionDecrease: 'خفض إنتاج مذكور',
    decisionAdjust: 'تعديل إنتاج مذكور',
    decisionUnknown: 'لا يوجد اتجاه رقمي صريح',
    scenarioMath: 'حساب من خط الأساس فقط',
    modelBasis: 'أساس حساب الممرات',
    officialFlowBasis: 'تدفق EIA الرسمي',
    proxyBasis: 'حساسية نسبية عند غياب خط الأساس',
  },
  en: {
    back: 'Back to Global Markets',
    eyebrow: 'SFM Oil Scenario Engine',
    title: 'Oil Scenario Engine',
    subtitle: 'Stress-test how shipping chokepoints, offline production, inventories, tankers, insurance, demand and rates could change price pressure. Outputs are sensitivity simulations, not price forecasts.',
    benchmark: 'Benchmark',
    brent: 'Brent',
    wti: 'WTI',
    referencePrice: 'Reference price',
    liveQuote: 'Available market quote',
    useLive: 'Use market quote',
    refresh: 'Refresh quote',
    unavailable: 'Unavailable',
    delayed: 'Delayed / reference',
    source: 'Source',
    updated: 'Last updated',
    assumptions: 'Scenario assumptions',
    assumptionsHint: 'Start from zero and change only the factors you want to test. The engine never assumes a closure or production outage on its own.',
    hormuz: 'Hormuz transit disruption',
    bab: 'Bab el-Mandeb disruption',
    offline: 'Offline production',
    spare: 'Spare capacity response',
    stocks: 'Inventory release',
    tankers: 'Tanker disruption / shortage',
    insurance: 'Freight & insurance increase',
    demand: 'Demand change',
    rates: 'Policy-rate pressure change',
    duration: 'Shock duration',
    mbd: 'mb/d',
    bps: 'bps',
    days: 'days',
    results: 'Scenario bands',
    resultsHint: 'Three sensitivity levels are shown for the same assumptions instead of one price claim.',
    lower: 'Lower sensitivity',
    central: 'Central sensitivity',
    higher: 'Higher sensitivity',
    midpoint: 'Midpoint',
    band: 'Illustrative band',
    modeledChange: 'Modeled change',
    pressure: 'Central model pressure',
    durationFactor: 'Duration factor',
    drivers: 'Largest drivers',
    positive: 'Upward pressure',
    negative: 'Downward pressure',
    noDrivers: 'No shock assumptions entered yet.',
    needPrice: 'Enter a valid reference price or use an available market quote to display scenarios.',
    methodology: 'Transparent methodology',
    methodologyBody: 'This is a transparent sensitivity model, not a forecast or probability. When an official EIA Hormuz/Bab el-Mandeb baseline is available, the engine applies only the disruption percentage you choose to calculate affected barrels; without that baseline it uses an explicit percentage proxy. Headlines never become closures or percentages automatically.',
    liveDataNote: 'Any live quote depends on THE SFM’s current provider chain and may be delayed. If data is unavailable, no replacement price is fabricated.',
    reset: 'Reset assumptions',
    loadError: 'The oil quote is unavailable right now. You can enter a reference price manually.',
    evidenceTitle: 'Live evidence monitor',
    evidenceHint: 'Combines Hormuz, Bab el-Mandeb, production, inventories, shipping and demand evidence from verified news, the economic calendar and official sources. Evidence never auto-converts into disruption percentages.',
    evidenceRefresh: 'Refresh evidence',
    evidenceCoverage: 'Evidence coverage',
    evidenceSources: 'sources',
    evidenceStories: 'related stories',
    evidenceCalendar: 'calendar events',
    evidenceInventory: 'EIA inventory',
    evidenceUnavailable: 'No sufficiently recent evidence is available for this category right now.',
    evidenceOpen: 'Open source',
    evidenceGuard: 'Live evidence helps you form an assumption, but scenario percentages stay under your control so a headline is never converted into a fabricated number.',
    evidenceLoadError: 'The evidence monitor could not refresh. Scenario assumptions remain manual.',
    inventoryLatest: 'U.S. commercial crude stocks',
    weeklyChange: 'Weekly change',
    evidenceChokepoints: 'EIA chokepoints',
    evidenceOpec: 'OPEC+ policy',
    officialReferences: 'Official references',
    chokepointBaseline: 'Latest official chokepoint baseline',
    baselineFlow: 'Reference flow',
    impliedDisruption: 'Implied disrupted volume',
    quarterlyReference: 'Quarterly estimate, not live vessel traffic',
    aisCaveat: 'EIA caveat: 2026 Hormuz AIS data are less reliable and revised frequently.',
    opecLatest: 'Latest official OPEC production statement',
    policyDecision: 'Policy state',
    decisionMaintain: 'Required production maintained',
    decisionIncrease: 'Production increase stated',
    decisionDecrease: 'Production cut stated',
    decisionAdjust: 'Production adjustment stated',
    decisionUnknown: 'No explicit numerical direction',
    scenarioMath: 'Baseline arithmetic only',
    modelBasis: 'Chokepoint model basis',
    officialFlowBasis: 'Official EIA flow',
    proxyBasis: 'Percentage proxy when baseline is unavailable',
  },
  fr: {
    back: 'Retour au Centre des marchés mondiaux',
    eyebrow: 'SFM Oil Scenario Engine',
    title: 'Moteur de scénarios pétroliers',
    subtitle: 'Testez la sensibilité du prix aux détroits, à la production indisponible, aux stocks, aux navires, à l’assurance, à la demande et aux taux. Les résultats sont des simulations de sensibilité, pas des prévisions.',
    benchmark: 'Référence',
    brent: 'Brent',
    wti: 'WTI',
    referencePrice: 'Prix de référence',
    liveQuote: 'Cours de marché disponible',
    useLive: 'Utiliser le cours',
    refresh: 'Actualiser',
    unavailable: 'Indisponible',
    delayed: 'Différé / référence',
    source: 'Source',
    updated: 'Dernière mise à jour',
    assumptions: 'Hypothèses du scénario',
    assumptionsHint: 'Partez de zéro et modifiez uniquement les facteurs à tester. Le moteur ne suppose jamais de fermeture ou d’arrêt de production de lui-même.',
    hormuz: 'Perturbation du détroit d’Ormuz',
    bab: 'Perturbation de Bab el-Mandeb',
    offline: 'Production indisponible',
    spare: 'Réponse de capacité disponible',
    stocks: 'Libération de stocks',
    tankers: 'Perturbation / pénurie de navires',
    insurance: 'Hausse fret et assurance',
    demand: 'Variation de la demande',
    rates: 'Variation de la pression des taux',
    duration: 'Durée du choc',
    mbd: 'Mb/j',
    bps: 'pb',
    days: 'jours',
    results: 'Bandes de scénario',
    resultsHint: 'Trois niveaux de sensibilité sont affichés pour les mêmes hypothèses au lieu d’un prix unique.',
    lower: 'Sensibilité faible',
    central: 'Sensibilité centrale',
    higher: 'Sensibilité élevée',
    midpoint: 'Point médian',
    band: 'Bande illustrative',
    modeledChange: 'Variation modélisée',
    pressure: 'Pression centrale du modèle',
    durationFactor: 'Facteur de durée',
    drivers: 'Principaux facteurs',
    positive: 'Pression haussière',
    negative: 'Pression baissière',
    noDrivers: 'Aucune hypothèse de choc saisie.',
    needPrice: 'Saisissez un prix de référence valide ou utilisez un cours disponible.',
    methodology: 'Méthodologie transparente',
    methodologyBody: 'Il s’agit d’un modèle de sensibilité transparent, et non d’une prévision ou d’une probabilité. Lorsqu’une référence officielle EIA pour Ormuz et Bab el-Mandeb est disponible, le moteur applique uniquement le pourcentage de perturbation choisi par vous pour calculer les barils concernés; sinon il utilise une sensibilité en pourcentage explicite. Les titres ne deviennent jamais automatiquement des fermetures ou des pourcentages.',
    liveDataNote: 'Tout cours de marché dépend de la chaîne actuelle de fournisseurs THE SFM et peut être différé. Aucune valeur de remplacement n’est inventée en cas d’indisponibilité.',
    reset: 'Réinitialiser les hypothèses',
    loadError: 'Le cours du pétrole est indisponible pour le moment. Vous pouvez saisir un prix manuellement.',
    evidenceTitle: 'Moniteur de preuves en direct',
    evidenceHint: 'Combine des signaux sur Ormuz, Bab el-Mandeb, la production, les stocks, le transport et la demande à partir d’actualités vérifiées, du calendrier économique et de sources officielles. Les preuves ne deviennent jamais automatiquement des pourcentages de perturbation.',
    evidenceRefresh: 'Actualiser les preuves',
    evidenceCoverage: 'Couverture des preuves',
    evidenceSources: 'sources',
    evidenceStories: 'articles liés',
    evidenceCalendar: 'événements calendrier',
    evidenceInventory: 'stocks EIA',
    evidenceUnavailable: 'Aucune preuve récente suffisante pour cette catégorie.',
    evidenceOpen: 'Ouvrir la source',
    evidenceGuard: 'Les preuves en direct aident à former une hypothèse, mais les pourcentages du scénario restent sous votre contrôle afin qu’un titre ne devienne jamais un chiffre inventé.',
    evidenceLoadError: 'Le moniteur de preuves ne peut pas être actualisé. Les hypothèses restent manuelles.',
    inventoryLatest: 'Stocks commerciaux de brut aux États-Unis',
    weeklyChange: 'Variation hebdomadaire',
    evidenceChokepoints: 'Détroits EIA',
    evidenceOpec: 'Politique OPEP+',
    officialReferences: 'Références officielles',
    chokepointBaseline: 'Dernière référence officielle des détroits',
    baselineFlow: 'Flux de référence',
    impliedDisruption: 'Volume perturbé implicite',
    quarterlyReference: 'Estimation trimestrielle, pas trafic maritime en direct',
    aisCaveat: 'Note EIA : les données AIS 2026 pour Ormuz sont moins fiables et souvent révisées.',
    opecLatest: 'Dernier communiqué officiel OPEP sur la production',
    policyDecision: 'État de la décision',
    decisionMaintain: 'Production requise maintenue',
    decisionIncrease: 'Hausse de production indiquée',
    decisionDecrease: 'Baisse de production indiquée',
    decisionAdjust: 'Ajustement de production indiqué',
    decisionUnknown: 'Aucune direction chiffrée explicite',
    scenarioMath: 'Calcul à partir de la référence uniquement',
    modelBasis: 'Base du modèle des détroits',
    officialFlowBasis: 'Flux officiel EIA',
    proxyBasis: 'Sensibilité en pourcentage si la référence est indisponible',
  },
} as const;

const EVIDENCE_CATEGORY_LABELS = {
  ar: {
    hormuz: 'مضيق هرمز',
    bab_el_mandeb: 'باب المندب والبحر الأحمر',
    production: 'الإنتاج و OPEC+',
    inventories: 'المخزونات',
    shipping: 'الناقلات والشحن والتأمين',
    demand_rates: 'الطلب والفائدة',
    geopolitics: 'المخاطر الجيوسياسية',
  },
  en: {
    hormuz: 'Strait of Hormuz',
    bab_el_mandeb: 'Bab el-Mandeb / Red Sea',
    production: 'Production & OPEC+',
    inventories: 'Inventories',
    shipping: 'Tankers, freight & insurance',
    demand_rates: 'Demand & rates',
    geopolitics: 'Geopolitical risk',
  },
  fr: {
    hormuz: 'Détroit d’Ormuz',
    bab_el_mandeb: 'Bab el-Mandeb / mer Rouge',
    production: 'Production et OPEP+',
    inventories: 'Stocks',
    shipping: 'Navires, fret et assurance',
    demand_rates: 'Demande et taux',
    geopolitics: 'Risque géopolitique',
  },
} as const;

const EVIDENCE_STATE_LABELS = {
  ar: { high: 'مرتفع', medium: 'متوسط', low: 'منخفض', unknown: 'غير مؤكد', tightening: 'تشدد الإمداد', easing: 'تخفيف الضغط', mixed: 'مختلط' },
  en: { high: 'High', medium: 'Medium', low: 'Low', unknown: 'Unknown', tightening: 'Tightening', easing: 'Easing', mixed: 'Mixed' },
  fr: { high: 'Élevé', medium: 'Moyen', low: 'Faible', unknown: 'Inconnu', tightening: 'Resserrement', easing: 'Détente', mixed: 'Mixte' },
} as const;

const CONTROL_DEFINITIONS: Array<{
  key: Exclude<keyof OilScenarioInput, 'referencePrice'>;
  label: 'hormuz' | 'bab' | 'offline' | 'spare' | 'stocks' | 'tankers' | 'insurance' | 'demand' | 'rates' | 'duration';
  unit: '%' | 'mbd' | 'bps' | 'days';
  min: number;
  max: number;
  step: number;
}> = [
  { key: 'hormuzDisruptionPct', label: 'hormuz', unit: '%', min: 0, max: 100, step: 1 },
  { key: 'babElMandebDisruptionPct', label: 'bab', unit: '%', min: 0, max: 100, step: 1 },
  { key: 'offlineProductionMbd', label: 'offline', unit: 'mbd', min: 0, max: 20, step: 0.1 },
  { key: 'spareCapacityResponseMbd', label: 'spare', unit: 'mbd', min: 0, max: 15, step: 0.1 },
  { key: 'stockReleaseMbd', label: 'stocks', unit: 'mbd', min: 0, max: 15, step: 0.1 },
  { key: 'tankerDisruptionPct', label: 'tankers', unit: '%', min: 0, max: 100, step: 1 },
  { key: 'freightInsurancePremiumPct', label: 'insurance', unit: '%', min: 0, max: 300, step: 5 },
  { key: 'demandChangePct', label: 'demand', unit: '%', min: -15, max: 15, step: 0.1 },
  { key: 'policyRateChangeBps', label: 'rates', unit: 'bps', min: -500, max: 1000, step: 25 },
  { key: 'durationDays', label: 'duration', unit: 'days', min: 1, max: 365, step: 1 },
];

const DRIVER_LABELS: Record<OilScenarioDriverKey, keyof typeof COPY.ar> = {
  hormuz: 'hormuz',
  babElMandeb: 'bab',
  offlineProduction: 'offline',
  spareCapacity: 'spare',
  stockRelease: 'stocks',
  tankers: 'tankers',
  freightInsurance: 'insurance',
  demand: 'demand',
  rates: 'rates',
};

const SCENARIO_LABELS: Record<OilScenarioId, 'lower' | 'central' | 'higher'> = {
  lower: 'lower',
  central: 'central',
  higher: 'higher',
};

function number(value: number, digits = 1) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

function signed(value: number) {
  return (value > 0 ? '+' : '') + number(value, 1) + '%';
}

function formatTime(value: string | null, lang: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  const locale = lang === 'fr' ? 'fr-FR-u-nu-latn' : lang === 'ar' ? 'ar-KW-u-nu-latn' : 'en-US';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function policyDecisionLabel(
  decision: NonNullable<OilIntelligenceResponse['opecPolicy']>['decision'],
  copy: typeof COPY.ar | typeof COPY.en | typeof COPY.fr,
) {
  if (decision === 'maintain') return copy.decisionMaintain;
  if (decision === 'increase') return copy.decisionIncrease;
  if (decision === 'decrease') return copy.decisionDecrease;
  if (decision === 'adjust') return copy.decisionAdjust;
  return copy.decisionUnknown;
}

export function OilScenarioEngine() {
  const { lang, dir } = useLanguage();
  const locale = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const c = COPY[locale];
  const [benchmark, setBenchmark] = useState<Benchmark>('brent');
  const [input, setInput] = useState<OilScenarioInput>(DEFAULT_OIL_SCENARIO_INPUT);
  const [quotes, setQuotes] = useState<Partial<Record<Benchmark, EnergyQuote>>>({});
  const [quoteSource, setQuoteSource] = useState('');
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [quoteError, setQuoteError] = useState(false);
  const [intelligence, setIntelligence] = useState<OilIntelligenceResponse | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState(true);
  const [evidenceError, setEvidenceError] = useState(false);

  async function loadQuotes(syncReference = false) {
    setLoadingQuote(true);
    setQuoteError(false);
    try {
      const response = await fetch('/api/market/energy/commodities');
      const payload = await response.json() as EnergyResponse;
      if (!response.ok || !payload.ok) throw new Error('oil_quote_unavailable');
      const brent = payload.items?.find(item => item.category === 'brent' && item.available && item.price);
      const wti = payload.items?.find(item => item.category === 'wti' && item.available && item.price);
      const nextQuotes: Partial<Record<Benchmark, EnergyQuote>> = {};
      if (brent) nextQuotes.brent = brent;
      if (wti) nextQuotes.wti = wti;
      setQuotes(nextQuotes);
      setQuoteSource(payload.source ?? '');
      const selected = nextQuotes[benchmark];
      if (selected?.price && (syncReference || input.referencePrice <= 0)) {
        setInput(current => ({ ...current, referencePrice: selected.price ?? current.referencePrice }));
      }
    } catch {
      setQuoteError(true);
    } finally {
      setLoadingQuote(false);
    }
  }

  async function loadEvidence() {
    setLoadingEvidence(true);
    setEvidenceError(false);
    try {
      const response = await fetch('/api/market/oil-intelligence');
      const payload = await response.json() as OilIntelligenceResponse;
      if (!response.ok || !payload.ok) throw new Error('oil_intelligence_unavailable');
      setIntelligence(payload);
    } catch {
      setEvidenceError(true);
    } finally {
      setLoadingEvidence(false);
    }
  }

  useEffect(() => {
    void loadQuotes(false);
    void loadEvidence();
    // Initial market quote only. Manual assumptions must not be overwritten by background changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedQuote = quotes[benchmark];
  const scenarioContext = useMemo(() => intelligence?.chokepoints ? {
    hormuzReferenceMbd: intelligence.chokepoints.hormuz.millionBarrelsPerDay,
    babElMandebReferenceMbd: intelligence.chokepoints.babElMandeb.millionBarrelsPerDay,
    sourceLabel: intelligence.chokepoints.source,
    referencePeriod: intelligence.chokepoints.hormuz.period,
  } : undefined, [intelligence?.chokepoints]);
  const result = useMemo(
    () => input.referencePrice > 0 ? calculateOilScenario(input, scenarioContext) : null,
    [input, scenarioContext],
  );
  const activeDrivers = result?.drivers.filter(driver => Math.abs(driver.contributionPct) >= 0.05).slice(0, 7) ?? [];

  function setBenchmarkAndSync(next: Benchmark) {
    setBenchmark(next);
    const quote = quotes[next];
    if (quote?.price) setInput(current => ({ ...current, referencePrice: quote.price ?? current.referencePrice }));
  }

  function setField(key: keyof OilScenarioInput, value: number) {
    setInput(current => ({ ...current, [key]: Number.isFinite(value) ? value : 0 }));
  }

  function resetAssumptions() {
    setInput(current => ({
      ...DEFAULT_OIL_SCENARIO_INPUT,
      referencePrice: current.referencePrice,
    }));
  }

  return (
    <div className={styles.shell} dir={dir}>
      <WorkspacePageContainer as="main" variant="wide" className={styles.main}>
        <Link href="/global-markets" className={styles.back}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{c.back}</span>
        </Link>

        <header className={styles.header}>
          <div className={styles.heroIcon} aria-hidden="true"><Droplets size={28} /></div>
          <div>
            <p className={styles.eyebrow}>{c.eyebrow}</p>
            <h1>{c.title}</h1>
            <p className={styles.subtitle}>{c.subtitle}</p>
          </div>
        </header>

        <section className={styles.quotePanel} aria-label={c.referencePrice}>
          <div className={styles.benchmarkBlock}>
            <span>{c.benchmark}</span>
            <div className={styles.segmented} role="group" aria-label={c.benchmark}>
              <button type="button" aria-pressed={benchmark === 'brent'} onClick={() => setBenchmarkAndSync('brent')}>{c.brent}</button>
              <button type="button" aria-pressed={benchmark === 'wti'} onClick={() => setBenchmarkAndSync('wti')}>{c.wti}</button>
            </div>
          </div>

          <label className={styles.priceInput}>
            <span>{c.referencePrice}</span>
            <div><span aria-hidden="true">$</span><input type="number" min="0.01" max="500" step="0.01" value={input.referencePrice || ''} onChange={event => setField('referencePrice', Number(event.target.value))} /></div>
          </label>

          <div className={styles.marketQuote}>
            <span>{c.liveQuote}</span>
            <strong dir="ltr">{selectedQuote?.price ? money(selectedQuote.price) : c.unavailable}</strong>
            <small>{selectedQuote?.delayed ? c.delayed : ''}</small>
          </div>

          <div className={styles.quoteActions}>
            <button type="button" disabled={!selectedQuote?.price} onClick={() => selectedQuote?.price && setField('referencePrice', selectedQuote.price)}>
              <Gauge size={16} aria-hidden="true" />{c.useLive}
            </button>
            <button type="button" disabled={loadingQuote} onClick={() => void loadQuotes(true)}>
              <RefreshCcw size={16} aria-hidden="true" className={loadingQuote ? styles.spinning : ''} />{c.refresh}
            </button>
          </div>

          <div className={styles.quoteMeta}>
            <span>{c.source}: {selectedQuote?.source || quoteSource || '—'}</span>
            <span>{c.updated}: {formatTime(selectedQuote?.lastUpdated ?? null, locale)}</span>
          </div>
          {quoteError ? <p className={styles.quoteError}><CircleAlert size={15} aria-hidden="true" />{c.loadError}</p> : null}
        </section>

        <section className={styles.evidencePanel} aria-label={c.evidenceTitle}>
          <div className={styles.evidenceHeader}>
            <div>
              <h2>{c.evidenceTitle}</h2>
              <p>{c.evidenceHint}</p>
            </div>
            <button type="button" disabled={loadingEvidence} onClick={() => void loadEvidence()}>
              <RefreshCcw size={16} aria-hidden="true" className={loadingEvidence ? styles.spinning : ''} />
              {c.evidenceRefresh}
            </button>
          </div>

          {evidenceError ? <p className={styles.evidenceError}><CircleAlert size={16} aria-hidden="true" />{c.evidenceLoadError}</p> : null}

          {intelligence ? (
            <>
              <div className={styles.coverageGrid} aria-label={c.evidenceCoverage}>
                <div><span>{c.evidenceSources}</span><strong dir="ltr">{intelligence.coverage.evidenceSources}</strong></div>
                <div><span>{c.evidenceStories}</span><strong dir="ltr">{intelligence.coverage.newsStories}</strong></div>
                <div><span>{c.evidenceCalendar}</span><strong dir="ltr">{intelligence.coverage.calendarEvents}</strong></div>
                <div><span>{c.evidenceInventory}</span><strong>{intelligence.coverage.eiaInventory ? '✓' : '—'}</strong></div>
                <div><span>{c.evidenceChokepoints}</span><strong>{intelligence.coverage.eiaChokepoints ? '✓' : '—'}</strong></div>
                <div><span>{c.evidenceOpec}</span><strong>{intelligence.coverage.opecPolicy ? '✓' : '—'}</strong></div>
              </div>

              {intelligence.inventory ? (
                <div className={styles.inventoryStrip}>
                  <div>
                    <span>{c.inventoryLatest}</span>
                    <strong dir="ltr">{number(intelligence.inventory.latest, 1)} M bbl</strong>
                  </div>
                  <div>
                    <span>{c.weeklyChange}</span>
                    <strong dir="ltr" className={intelligence.inventory.weeklyChange < 0 ? styles.up : styles.down}>
                      {intelligence.inventory.weeklyChange > 0 ? '+' : ''}{number(intelligence.inventory.weeklyChange, 1)} M bbl
                    </strong>
                  </div>
                  <a href={intelligence.inventory.sourceUrl} target="_blank" rel="noreferrer">{intelligence.inventory.source}</a>
                </div>
              ) : null}

              {intelligence.chokepoints || intelligence.opecPolicy ? (
                <div className={styles.officialGrid} aria-label={c.officialReferences}>
                  {intelligence.chokepoints ? (
                    <article className={styles.officialCard}>
                      <div>
                        <strong>{c.chokepointBaseline}</strong>
                        <small>{c.quarterlyReference}</small>
                      </div>
                      <dl>
                        <div><dt>{EVIDENCE_CATEGORY_LABELS[locale].hormuz}</dt><dd dir="ltr">{number(intelligence.chokepoints.hormuz.millionBarrelsPerDay, 1)} mb/d · {intelligence.chokepoints.hormuz.period}</dd></div>
                        <div><dt>{EVIDENCE_CATEGORY_LABELS[locale].bab_el_mandeb}</dt><dd dir="ltr">{number(intelligence.chokepoints.babElMandeb.millionBarrelsPerDay, 1)} mb/d · {intelligence.chokepoints.babElMandeb.period}</dd></div>
                      </dl>
                      {intelligence.chokepoints.aisReliabilityCaveat ? <p>{c.aisCaveat}</p> : null}
                      <a href={intelligence.chokepoints.sourceUrl} target="_blank" rel="noreferrer">{c.evidenceOpen}</a>
                    </article>
                  ) : null}
                  {intelligence.opecPolicy ? (
                    <article className={styles.officialCard}>
                      <div>
                        <strong>{c.opecLatest}</strong>
                        <small>{formatTime(intelligence.opecPolicy.publishedDate + 'T00:00:00.000Z', locale)}</small>
                      </div>
                      <p dir="auto">{intelligence.opecPolicy.title}</p>
                      <dl>
                        <div><dt>{c.policyDecision}</dt><dd>{policyDecisionLabel(intelligence.opecPolicy.decision, c)}</dd></div>
                        {intelligence.opecPolicy.explicitAdjustmentThousandBarrelsPerDay !== null ? (
                          <div><dt>{c.mbd}</dt><dd dir="ltr">{number(intelligence.opecPolicy.explicitAdjustmentThousandBarrelsPerDay / 1000, 3)} mb/d</dd></div>
                        ) : null}
                      </dl>
                      <a href={intelligence.opecPolicy.sourceUrl} target="_blank" rel="noreferrer">{c.evidenceOpen}</a>
                    </article>
                  ) : null}
                </div>
              ) : null}

              <div className={styles.evidenceGrid}>
                {intelligence.evidence.categories.map(category => {
                  const latest = category.items[0];
                  const stateLabels = EVIDENCE_STATE_LABELS[locale];
                  return (
                    <article className={styles.evidenceCard} key={category.id}>
                      <div className={styles.evidenceCardHead}>
                        <div>
                          <strong>{EVIDENCE_CATEGORY_LABELS[locale][category.id]}</strong>
                          <small dir="ltr">{category.evidenceCount}</small>
                        </div>
                        <span className={category.attention === 'high' ? styles.attentionHigh : category.attention === 'medium' ? styles.attentionMedium : styles.attentionLow}>
                          {stateLabels[category.attention]}
                        </span>
                      </div>
                      <p className={styles.direction}>{stateLabels[category.direction]}</p>
                      {latest ? (
                        <div className={styles.latestEvidence}>
                          <p dir="auto">{latest.title}</p>
                          <div>
                            <span>{latest.source}</span>
                            <time dateTime={latest.publishedAt}>{formatTime(latest.publishedAt, locale)}</time>
                          </div>
                          {latest.url ? <a href={latest.url} target="_blank" rel="noreferrer">{c.evidenceOpen}</a> : null}
                        </div>
                      ) : <p className={styles.noEvidence}>{c.evidenceUnavailable}</p>}
                    </article>
                  );
                })}
              </div>
              <p className={styles.evidenceGuard}><ShieldCheck size={16} aria-hidden="true" />{c.evidenceGuard}</p>
            </>
          ) : loadingEvidence ? <div className={styles.evidenceLoading}>{c.evidenceRefresh}…</div> : null}
        </section>

        <section className={styles.workspace}>
          <div className={styles.controlsPanel}>
            <div className={styles.sectionHead}>
              <div><h2>{c.assumptions}</h2><p>{c.assumptionsHint}</p></div>
              <button type="button" onClick={resetAssumptions}>{c.reset}</button>
            </div>
            <div className={styles.controlsGrid}>
              {CONTROL_DEFINITIONS.map(control => {
                const value = input[control.key];
                const unit = control.unit === 'mbd' ? c.mbd : control.unit === 'bps' ? c.bps : control.unit === 'days' ? c.days : '%';
                const chokepoint = control.key === 'hormuzDisruptionPct'
                  ? intelligence?.chokepoints?.hormuz
                  : control.key === 'babElMandebDisruptionPct'
                    ? intelligence?.chokepoints?.babElMandeb
                    : null;
                const impliedDisruption = chokepoint ? chokepoint.millionBarrelsPerDay * value / 100 : null;
                return (
                  <label key={control.key} className={styles.control}>
                    <div><span>{c[control.label]}</span><output dir="ltr">{number(value, control.step < 1 ? 1 : 0)} {unit}</output></div>
                    <input
                      type="range"
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={value}
                      onChange={event => setField(control.key, Number(event.target.value))}
                    />
                    <input
                      className={styles.numberInput}
                      type="number"
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={value}
                      onChange={event => setField(control.key, Number(event.target.value))}
                      aria-label={c[control.label]}
                    />
                    {chokepoint ? (
                      <small className={styles.controlEvidence}>
                        <span>{c.baselineFlow}: <b dir="ltr">{number(chokepoint.millionBarrelsPerDay, 1)} mb/d · {chokepoint.period}</b></span>
                        <span>{c.impliedDisruption}: <b dir="ltr">{number(impliedDisruption ?? 0, 2)} mb/d</b></span>
                        <em>{c.scenarioMath}</em>
                      </small>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </div>

          <aside className={styles.resultsPanel}>
            <div className={styles.sectionHead}>
              <div><h2>{c.results}</h2><p>{c.resultsHint}</p></div>
            </div>
            {!result ? (
              <div className={styles.emptyResult}><CircleAlert size={18} aria-hidden="true" /><p>{c.needPrice}</p></div>
            ) : (
              <>
                <div className={styles.modelStats}>
                  <div><span>{c.pressure}</span><strong dir="ltr" className={result.centralImpactPct >= 0 ? styles.up : styles.down}>{signed(result.centralImpactPct)}</strong></div>
                  <div><span>{c.durationFactor}</span><strong dir="ltr">{number(result.durationFactor, 2)}×</strong></div>
                  <div><span>{c.modelBasis}</span><strong>{result.context.mode === 'official_flow_baseline' ? c.officialFlowBasis : c.proxyBasis}</strong>{result.context.referencePeriod ? <small dir="ltr">{result.context.referencePeriod}</small> : null}</div>
                </div>
                <div className={styles.scenarioList}>
                  {result.scenarios.map(scenario => (
                    <article key={scenario.id} className={styles.scenarioCard}>
                      <div className={styles.scenarioTitle}>
                        <span>{SCENARIO_LABELS[scenario.id] === 'lower' ? <TrendingDown size={16} aria-hidden="true" /> : <TrendingUp size={16} aria-hidden="true" />}</span>
                        <strong>{c[SCENARIO_LABELS[scenario.id]]}</strong>
                      </div>
                      <div className={styles.midpoint}><span>{c.midpoint}</span><strong dir="ltr">{money(scenario.priceMid)}</strong></div>
                      <dl>
                        <div><dt>{c.band}</dt><dd dir="ltr">{money(scenario.priceLow)} – {money(scenario.priceHigh)}</dd></div>
                        <div><dt>{c.modeledChange}</dt><dd dir="ltr" className={scenario.modeledChangePct >= 0 ? styles.up : styles.down}>{signed(scenario.modeledChangePct)}</dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
              </>
            )}
          </aside>
        </section>

        <OilTargetStressTest input={input} context={scenarioContext} lang={locale} />

        <section className={styles.driversPanel}>
          <div className={styles.sectionHead}><div><h2>{c.drivers}</h2></div></div>
          {activeDrivers.length ? (
            <div className={styles.driversGrid}>
              {activeDrivers.map(driver => (
                <div key={driver.key} className={styles.driver}>
                  <span>{c[DRIVER_LABELS[driver.key]]}</span>
                  <strong dir="ltr" className={driver.contributionPct >= 0 ? styles.up : styles.down}>{signed(driver.contributionPct)}</strong>
                  <small>{driver.contributionPct >= 0 ? c.positive : c.negative}</small>
                </div>
              ))}
            </div>
          ) : <p className={styles.noDrivers}>{c.noDrivers}</p>}
        </section>

        <section className={styles.disclosure}>
          <ShieldCheck size={20} aria-hidden="true" />
          <div><h2>{c.methodology}</h2><p>{c.methodologyBody}</p><p>{c.liveDataNote}</p></div>
        </section>
      </WorkspacePageContainer>
    </div>
  );
}

export default OilScenarioEngine;
