'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpenCheck,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileSearch,
  Globe2,
  Info,
  Link2,
  Loader2,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Square,
  XCircle,
} from 'lucide-react';
import { CompanyLogo } from '@/components/asset/CompanyLogo';
import { useLanguage } from '@/hooks/useLanguage';
import type {
  ResearchProgressStep,
  SecurityCandidate,
  ShariaClassification,
  ShariaMethodology,
  ShariaScreeningResult,
  SourceConfigurationStatus,
  SourceDocument,
} from '@/lib/sharia-research/types';
import styles from './ShariaResearchPage.module.css';

type Locale = 'ar' | 'en' | 'fr';
type ViewState = 'idle' | 'identifying' | 'selection' | 'researching' | 'result' | 'error';
type HistoryItem = { id: string; result_id: string | null; original_query: string; outcome: string; created_at: string };

type PublicJob = {
  id: string;
  status: string;
  progress: number;
  currentStep: ResearchProgressStep;
  candidates: SecurityCandidate[];
  partialErrors: Array<{ code: string; message: string; url?: string }>;
  resultId: string | null;
  error: { code: string; message: string } | null;
  expiresAt: string;
};

const COPY = {
  ar: {
    eyebrow: 'مركز البحث الشرعي متعدد المصادر',
    title: 'افحص الشركة من الدليل إلى النتيجة',
    subtitle: 'يبحث النظام في جميع المصادر العامة المدعومة والمتاحة، ويجمع الإفصاحات الحالية، ثم يطبق منهجية معلنة دون افتراض قيم مفقودة.',
    scope: 'لا يدّعي النظام البحث في جميع مواقع الإنترنت، ولا يجمع نتائج بحث Google مباشرة.',
    searchLabel: 'اسم الشركة أو الرمز أو ISIN',
    placeholder: 'مثال: إنفيديا، NVIDIA، NVDA أو US67066G1040',
    searchAction: 'ابدأ البحث الموثق',
    freshAction: 'إعادة التحليل ببيانات جديدة',
    cancelAction: 'إلغاء البحث',
    newSearch: 'بحث جديد',
    configuration: 'حالة مصادر البحث',
    enabled: 'متاح',
    disabled: 'غير مهيأ',
    requires: 'يتطلب إعداداً',
    methodology: 'المنهجية',
    methodologyVersion: 'الإصدار',
    selectionTitle: 'اختر الورقة المالية الصحيحة',
    selectionBody: 'وجدنا أكثر من ورقة مالية متقاربة. اختر من الأدلة المؤكدة بدلاً من التخمين.',
    choose: 'اختيار هذه الورقة',
    progressTitle: 'تقدم البحث',
    partialFailures: 'مصادر تعذّر الوصول إليها',
    resultTitle: 'نتيجة الفحص الشرعي الآلي',
    confidence: 'اكتمال الأدلة وموثوقيتها',
    notCertainty: 'هذه النسبة تقيس جودة الأدلة واكتمالها، ولا تمثل يقيناً دينياً.',
    lastReport: 'آخر تقرير مالي مستخدم',
    lastUpdate: 'وقت الاسترجاع',
    cacheLive: 'بحث مباشر',
    cacheRecent: 'نتيجة حديثة محفوظة',
    cacheOutdated: 'نتيجة قديمة تنتظر التحديث',
    securityIdentity: 'هوية الورقة المالية',
    ticker: 'الرمز',
    exchange: 'البورصة',
    isin: 'رقم ISIN',
    country: 'الدولة',
    sector: 'القطاع',
    reasons: 'ملخص أسباب النتيجة',
    business: 'فحص النشاط التجاري',
    financial: 'فحص النسب المالية',
    unresolved: 'المسائل غير المحسومة',
    passed: 'اجتاز',
    failed: 'لم يجتز',
    review: 'يحتاج مراجعة',
    unavailable: 'غير متاح',
    formula: 'الصيغة والحساب',
    value: 'القيمة',
    threshold: 'الحد المسموح',
    reportingPeriod: 'الفترة المالية',
    sourcesTitle: 'المصادر والأدلة',
    sourceCount: 'عدد المصادر',
    official: 'رسمي',
    secondary: 'ثانوي',
    contextOnly: 'سياق فقط',
    publicationDate: 'تاريخ النشر أو الإيداع',
    retrievalDate: 'تاريخ الاسترجاع',
    supports: 'يدعم الاستنتاج',
    relevantExcerpt: 'المقتطف المرتبط',
    openSource: 'فتح المصدر',
    groupedCopies: 'روابط التقرير نفسه',
    newsTitle: 'أخبار حالية ذات صلة',
    newsNotice: 'تظهر الأخبار للسياق فقط ولم تدخل في قرار التوافق الشرعي.',
    conflicts: 'أدلة متعارضة',
    unavailableChecks: 'فحوص غير مكتملة',
    warnings: 'تنبيهات التحليل',
    manualReview: 'مراجعة شرعية بشرية لازمة',
    disclaimer: 'النتيجة فحص استثماري آلي قائم على المنهجية المختارة والمعلومات المتاحة للعامة. وليست فتوى، ولا تغني عن مراجعة مستشار شرعي مؤهل.',
    authRequired: 'سجّل الدخول لحفظ البحث والنتيجة بصورة خاصة.',
    errorTitle: 'لم يكتمل البحث',
    tryAgain: 'حاول مرة أخرى أو استخدم رمزاً مؤهلاً باسم البورصة.',
    noValue: 'لم تُفترض قيمة صفرية',
    quality: 'جودة المصادر',
    history: 'عمليات البحث الأخيرة',
    searchAgain: 'البحث مجدداً',
    high: 'مرتفعة', medium: 'متوسطة', low: 'منخفضة',
    status: {
      compliant: 'متوافق مع المنهجية الشرعية',
      non_compliant: 'غير متوافق مع المنهجية الشرعية',
      requires_review: 'يتطلب مراجعة شرعية',
      insufficient_current_data: 'البيانات الحالية غير كافية',
      conflicting_evidence: 'الأدلة متعارضة',
    },
    steps: {
      identifying_security: 'تحديد الورقة المالية',
      awaiting_security_selection: 'انتظار اختيار الورقة',
      searching_official_sources: 'البحث في المصادر الرسمية',
      retrieving_filings: 'استرجاع الإفصاحات والتقارير',
      extracting_financial_data: 'استخراج البيانات المالية',
      checking_business_activities: 'فحص أنشطة الشركة',
      calculating_ratios: 'حساب النسب المالية',
      resolving_conflicts: 'معالجة تعارض الأدلة',
      preparing_result: 'إعداد النتيجة النهائية',
    },
  },
  en: {
    eyebrow: 'Multi-source Shariah research center', title: 'Trace the company from evidence to result',
    subtitle: 'The system searches all supported, publicly accessible sources, collects current filings, and applies a disclosed methodology without filling missing values.',
    scope: 'It does not claim to search every website and does not scrape Google result pages.', searchLabel: 'Company, ticker, or ISIN',
    placeholder: 'Example: NVIDIA, NVDA, or US67066G1040', searchAction: 'Start documented research', freshAction: 'Run a fresh analysis', cancelAction: 'Cancel research', newSearch: 'New search',
    configuration: 'Research source status', enabled: 'Enabled', disabled: 'Not configured', requires: 'Requires', methodology: 'Methodology', methodologyVersion: 'Version',
    selectionTitle: 'Choose the correct security', selectionBody: 'Several securities match. Select the confirmed listing instead of guessing.', choose: 'Choose this security', progressTitle: 'Research progress', partialFailures: 'Unavailable sources',
    resultTitle: 'Automated Shariah screening result', confidence: 'Evidence completeness and reliability', notCertainty: 'This score measures evidence quality, not religious certainty.', lastReport: 'Latest financial report used', lastUpdate: 'Retrieved',
    cacheLive: 'Live research', cacheRecent: 'Recently cached result', cacheOutdated: 'Outdated result awaiting refresh', securityIdentity: 'Security identity', ticker: 'Ticker', exchange: 'Exchange', isin: 'ISIN', country: 'Country', sector: 'Sector',
    reasons: 'Reason summary', business: 'Business activity screen', financial: 'Financial screen', unresolved: 'Unresolved concerns', passed: 'Pass', failed: 'Fail', review: 'Review', unavailable: 'Unavailable', formula: 'Formula and calculation', value: 'Value', threshold: 'Threshold', reportingPeriod: 'Reporting period',
    sourcesTitle: 'Sources and evidence', sourceCount: 'Sources', official: 'Official', secondary: 'Secondary', contextOnly: 'Context only', publicationDate: 'Published or filed', retrievalDate: 'Retrieved', supports: 'Supports', relevantExcerpt: 'Relevant excerpt', openSource: 'Open source', groupedCopies: 'Grouped copies',
    newsTitle: 'Related current news', newsNotice: 'News is supporting context only and was excluded from the Shariah decision.', conflicts: 'Conflicting evidence', unavailableChecks: 'Unavailable checks', warnings: 'Analysis warnings', manualReview: 'Qualified human Shariah review remains necessary',
    disclaimer: 'The result is an automated investment screening based on the selected methodology and publicly available information. It is not a fatwa and does not replace review by a qualified Shariah adviser.',
    authRequired: 'Sign in to keep the research and result private.', errorTitle: 'Research did not complete', tryAgain: 'Try again or use an exchange-qualified symbol.', noValue: 'No zero value was assumed', quality: 'Source quality', high: 'High', medium: 'Medium', low: 'Low',
    history: 'Recent research', searchAgain: 'Research again',
    status: { compliant: 'Shariah compliant', non_compliant: 'Not Shariah compliant', requires_review: 'Requires Shariah review', insufficient_current_data: 'Insufficient current data', conflicting_evidence: 'Conflicting evidence' },
    steps: { identifying_security: 'Identifying security', awaiting_security_selection: 'Awaiting security selection', searching_official_sources: 'Searching official sources', retrieving_filings: 'Retrieving filings', extracting_financial_data: 'Extracting financial data', checking_business_activities: 'Checking business activities', calculating_ratios: 'Calculating ratios', resolving_conflicts: 'Resolving conflicts', preparing_result: 'Preparing final result' },
  },
  fr: {
    eyebrow: 'Centre de recherche charia multi-source', title: 'Suivre la société des preuves au résultat',
    subtitle: 'Le système interroge toutes les sources publiques prises en charge, collecte les documents récents et applique une méthode publiée sans compléter les valeurs absentes.',
    scope: 'Il ne prétend pas rechercher tous les sites et ne collecte pas les pages de résultats Google.', searchLabel: 'Société, symbole ou ISIN', placeholder: 'Exemple : NVIDIA, NVDA ou US67066G1040', searchAction: 'Lancer la recherche documentée', freshAction: 'Relancer une analyse récente', cancelAction: 'Annuler la recherche', newSearch: 'Nouvelle recherche',
    configuration: 'État des sources', enabled: 'Disponible', disabled: 'Non configurée', requires: 'Nécessite', methodology: 'Méthodologie', methodologyVersion: 'Version', selectionTitle: 'Choisir le bon titre', selectionBody: 'Plusieurs titres correspondent. Sélectionnez la cotation confirmée.', choose: 'Choisir ce titre', progressTitle: 'Progression de la recherche', partialFailures: 'Sources indisponibles',
    resultTitle: 'Résultat du filtrage charia automatisé', confidence: 'Complétude et fiabilité des preuves', notCertainty: 'Ce score mesure la qualité des preuves, pas une certitude religieuse.', lastReport: 'Dernier rapport financier utilisé', lastUpdate: 'Récupéré', cacheLive: 'Recherche en direct', cacheRecent: 'Résultat récent en cache', cacheOutdated: 'Résultat ancien à actualiser',
    securityIdentity: 'Identité du titre', ticker: 'Symbole', exchange: 'Bourse', isin: 'ISIN', country: 'Pays', sector: 'Secteur', reasons: 'Résumé des raisons', business: 'Activité commerciale', financial: 'Ratios financiers', unresolved: 'Points non résolus', passed: 'Réussi', failed: 'Échoué', review: 'À examiner', unavailable: 'Indisponible', formula: 'Formule et calcul', value: 'Valeur', threshold: 'Seuil', reportingPeriod: 'Période',
    sourcesTitle: 'Sources et preuves', sourceCount: 'Sources', official: 'Officielle', secondary: 'Secondaire', contextOnly: 'Contexte', publicationDate: 'Publié ou déposé', retrievalDate: 'Récupéré', supports: 'Appuie', relevantExcerpt: 'Extrait pertinent', openSource: 'Ouvrir la source', groupedCopies: 'Copies regroupées', newsTitle: 'Actualités associées', newsNotice: 'Les actualités servent uniquement de contexte et sont exclues de la décision charia.', conflicts: 'Preuves contradictoires', unavailableChecks: 'Contrôles indisponibles', warnings: 'Avertissements', manualReview: 'Une revue humaine qualifiée reste nécessaire',
    disclaimer: 'Le résultat est un filtrage d’investissement automatisé fondé sur la méthodologie choisie et les informations publiques. Il ne constitue pas une fatwa et ne remplace pas l’examen d’un conseiller qualifié en charia.', authRequired: 'Connectez-vous pour garder la recherche privée.', errorTitle: 'La recherche n’a pas abouti', tryAgain: 'Réessayez avec un symbole qualifié par la bourse.', noValue: 'Aucune valeur zéro supposée', quality: 'Qualité des sources', high: 'Élevée', medium: 'Moyenne', low: 'Faible',
    history: 'Recherches récentes', searchAgain: 'Relancer',
    status: { compliant: 'Conforme à la charia', non_compliant: 'Non conforme à la charia', requires_review: 'Examen charia requis', insufficient_current_data: 'Données actuelles insuffisantes', conflicting_evidence: 'Preuves contradictoires' },
    steps: { identifying_security: 'Identification du titre', awaiting_security_selection: 'Sélection du titre', searching_official_sources: 'Recherche des sources officielles', retrieving_filings: 'Récupération des documents', extracting_financial_data: 'Extraction des données financières', checking_business_activities: 'Vérification des activités', calculating_ratios: 'Calcul des ratios', resolving_conflicts: 'Résolution des contradictions', preparing_result: 'Préparation du résultat final' },
  },
} as const;

const STEP_ORDER: ResearchProgressStep[] = [
  'identifying_security', 'searching_official_sources', 'retrieving_filings', 'extracting_financial_data',
  'checking_business_activities', 'calculating_ratios', 'resolving_conflicts', 'preparing_result',
];

function localeCode(value: string | undefined): Locale {
  return value === 'en' || value === 'fr' ? value : 'ar';
}

function formatDate(value: string | null | undefined, locale: Locale, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-GB', {
    dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' as const } : {}),
  }).format(date);
}

function percent(value: number | null) {
  return value === null ? '—' : `${(value * 100).toFixed(2)}%`;
}

function classificationTone(status: ShariaClassification) {
  if (status === 'compliant') return styles.good;
  if (status === 'non_compliant') return styles.bad;
  if (status === 'conflicting_evidence') return styles.conflict;
  return styles.warn;
}

function checkLabel(status: string, c: typeof COPY[Locale]) {
  if (status === 'pass') return c.passed;
  if (status === 'fail') return c.failed;
  if (status === 'review') return c.review;
  return c.unavailable;
}

function methodologyName(methodology: ShariaMethodology, locale: Locale) {
  return locale === 'ar' ? methodology.nameAr : locale === 'fr' ? methodology.nameFr : methodology.name;
}

function ratioName(ratio: ShariaScreeningResult['financialRatios'][number], locale: Locale) {
  return locale === 'ar' ? ratio.nameAr : locale === 'fr' ? ratio.nameFr : ratio.name;
}

function localizedReason(value: string, locale: Locale) {
  if (locale === 'en') return value;
  const ar = locale === 'ar';
  if (value.startsWith('No current substantive Tier 1')) return ar ? 'لم يُستخرج وصف حالي وكافٍ للنشاط من مصدر رسمي من الفئة الأولى.' : 'Aucune description d’activité actuelle et substantielle de niveau 1 n’a été extraite.';
  if (value.startsWith('Documented prohibited and interest income')) return ar ? 'تتجاوز الإيرادات المحظورة ودخل الفوائد الموثقان حد المنهجية.' : 'Les revenus interdits et les intérêts documentés dépassent le seuil de la méthodologie.';
  if (value.startsWith('An official company source describes')) return ar ? 'يصف مصدر رسمي للشركة نشاطاً رئيسياً مستبعداً مباشرةً.' : 'Une source officielle décrit une activité principale directement exclue.';
  if (value.startsWith('Questionable activity terms')) return ar ? 'ظهرت إشارات إلى نشاط مشكوك فيه، لكن الأدلة العامة لا تثبت أهميته النسبية في الإيرادات.' : 'Des termes d’activité douteuse apparaissent, sans preuve publique de leur importance dans les revenus.';
  if (value.startsWith('Current official business descriptions')) return ar ? 'توفرت أوصاف رسمية حالية للنشاط، ولم يظهر فيها نشاط مستبعد وفق الإعدادات.' : 'Des descriptions officielles actuelles ont été trouvées sans activité exclue détectée.';
  if (value.startsWith('Separate prohibited-revenue')) return ar ? 'لم يُفصح عن الإيراد المحظور ودخل الفوائد كقيمتين مستقلتين؛ ولم تُعامل أي قيمة مفقودة على أنها صفر.' : 'Les revenus interdits et les intérêts ne sont pas tous deux publiés séparément; aucune valeur absente n’a été traitée comme zéro.';
  if (value.startsWith('Missing current-period field')) return ar ? `حقول الفترة الحالية ناقصة. ${COPY.ar.noValue}.` : 'Des champs de la période actuelle sont absents. Aucune valeur zéro n’a été supposée.';
  if (value.startsWith('Input currencies conflict')) return ar ? 'تتعارض عملات المدخلات، ولم يُجر تحويل آلي لقيم الإفصاحات.' : 'Les devises des entrées divergent; aucune conversion automatique des dépôts n’est appliquée.';
  if (value.startsWith('This confidence score')) return ar ? COPY.ar.notCertainty : COPY.fr.notCertainty;
  if (value.startsWith('The latest usable financial period')) return ar ? 'تجاوزت أحدث فترة مالية قابلة للاستخدام حد حداثة البيانات في المنهجية.' : 'La dernière période financière utilisable dépasse la limite de fraîcheur de la méthodologie.';
  if (value.startsWith('News is displayed')) return ar ? COPY.ar.newsNotice : COPY.fr.newsNotice;
  if (value.startsWith('Marketable-security XBRL labels')) return ar ? 'قد تشمل حقول الأوراق المالية في XBRL أدوات تحتاج طبيعتها الربوية إلى تحقق يدوي.' : 'Les libellés XBRL des titres peuvent inclure des instruments dont la nature portant intérêt exige une vérification manuelle.';
  return ar ? 'يتطلب هذا الاستنتاج مراجعة الأدلة المرتبطة أدناه.' : 'Cette conclusion exige l’examen des preuves liées ci-dessous.';
}

function localizedSupport(document: SourceDocument, locale: Locale) {
  if (locale === 'en') return document.supports.join(' · ');
  const ar = locale === 'ar';
  if (document.sourceType === 'methodology') return ar ? 'قواعد الأنشطة · صيغ النسب · الحدود · إرشادات التنقية' : 'Règles d’activité · formules · seuils · purification';
  if (document.sourceType === 'annual_report' || document.sourceType === 'quarterly_report') return ar ? 'نشاط الشركة · الشركات التابعة · فئات الإيراد · سياق القوائم المالية' : 'Activité · filiales · catégories de revenus · contexte financier';
  if (document.sourceType === 'regulatory_filing') return ar ? 'هوية الشركة · فترات الإفصاح · القيم المالية الرسمية' : 'Identité · périodes de dépôt · valeurs financières officielles';
  if (document.sourceType === 'exchange_filing') return ar ? 'الرمز · اسم الورقة · البورصة' : 'Symbole · nom du titre · bourse';
  if (document.sourceType === 'news' || document.sourceType === 'rss') return ar ? 'سياق حالي فقط؛ لا يحدد النتيجة الشرعية' : 'Contexte actuel uniquement; exclu de la décision charia';
  return ar ? 'دليل عام داعم يحتاج تقييم سلطة الناشر' : 'Preuve publique complémentaire dont l’autorité doit être évaluée';
}

export function ShariaResearchPage() {
  const { lang } = useLanguage();
  const locale = localeCode(lang);
  const c = COPY[locale];
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [view, setView] = useState<ViewState>('idle');
  const [job, setJob] = useState<PublicJob | null>(null);
  const [candidates, setCandidates] = useState<SecurityCandidate[]>([]);
  const [result, setResult] = useState<ShariaScreeningResult | null>(null);
  const [error, setError] = useState('');
  const [methodologies, setMethodologies] = useState<ShariaMethodology[]>([]);
  const [methodologyId, setMethodologyId] = useState('msci-islamic-index-series-assets');
  const [sourceStatus, setSourceStatus] = useState<SourceConfigurationStatus[]>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const pollingJobId = job?.id ?? null;
  const pollingJobStatus = job?.status ?? null;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sharia-research/methodologies', { cache: 'no-store' })
      .then(async response => response.ok ? response.json() : null)
      .then(payload => {
        if (cancelled || !payload?.ok) return;
        setMethodologies(payload.methodologies ?? []);
        setSourceStatus(payload.sources ?? []);
      })
      .catch(() => undefined);
    fetch('/api/sharia-research/history', { cache: 'no-store' })
      .then(async response => response.ok ? response.json() : null)
      .then(payload => { if (!cancelled && payload?.ok) setHistory(payload.items ?? []); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const loadResult = useCallback(async (resultId: string) => {
    const response = await fetch(`/api/sharia-research/results/${encodeURIComponent(resultId)}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload?.error?.message || 'RESULT_LOAD_FAILED');
    setResult(payload.result);
    setView('result');
    setJob(null);
  }, []);

  useEffect(() => {
    if (!pollingJobId || !pollingJobStatus || !['queued', 'running'].includes(pollingJobStatus)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const response = await fetch(`/api/sharia-research/jobs/${encodeURIComponent(pollingJobId)}`, { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload?.error?.message || 'JOB_STATUS_FAILED');
        if (cancelled) return;
        setJob(payload.job);
        if (payload.job.status === 'completed' && payload.job.resultId) {
          await loadResult(payload.job.resultId);
          return;
        }
        if (['failed', 'cancelled', 'expired'].includes(payload.job.status)) {
          setError(payload.job.error?.message || `${payload.job.status}`);
          setView('error');
          return;
        }
        timer = setTimeout(poll, 1_800);
      } catch (pollError) {
        if (cancelled) return;
        setError(pollError instanceof Error ? pollError.message : String(pollError));
        timer = setTimeout(poll, 3_500);
      }
    };
    void poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [loadResult, pollingJobId, pollingJobStatus]);

  const startSearch = useCallback(async (searchQuery: string, selectedCanonicalId?: string, forceRefresh = false) => {
    setError('');
    setResult(null);
    setView(selectedCanonicalId ? 'identifying' : 'identifying');
    const response = await fetch('/api/sharia-research/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery, methodologyId, selectedCanonicalId, forceRefresh }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload?.error?.code === 'AUTH_REQUIRED'
        ? c.authRequired
        : locale === 'en' ? payload?.error?.message || 'Search failed.' : c.tryAgain);
    }
    if (payload.status === 'awaiting_selection') {
      setCandidates(payload.candidates ?? []);
      setView('selection');
      return;
    }
    if (payload.status === 'completed' && payload.result) {
      setResult(payload.result);
      setView('result');
      return;
    }
    setJob({
      id: payload.jobId,
      status: payload.status,
      progress: payload.progress ?? 5,
      currentStep: payload.currentStep ?? 'identifying_security',
      candidates: [], partialErrors: [], resultId: null, error: null, expiresAt: '',
    });
    setView('researching');
  }, [c.authRequired, c.tryAgain, locale, methodologyId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setSubmittedQuery(value);
    try { await startSearch(value); }
    catch (searchError) { setError(searchError instanceof Error ? searchError.message : String(searchError)); setView('error'); }
  };

  const selectSecurity = async (candidate: SecurityCandidate) => {
    try { await startSearch(submittedQuery, candidate.canonicalId); }
    catch (selectionError) { setError(selectionError instanceof Error ? selectionError.message : String(selectionError)); setView('error'); }
  };

  const cancelJob = async () => {
    if (!job) return;
    await fetch(`/api/sharia-research/jobs/${encodeURIComponent(job.id)}`, { method: 'DELETE' }).catch(() => undefined);
    setView('idle');
    setJob(null);
  };

  const refreshResult = async () => {
    if (!result) return;
    setView('researching');
    setError('');
    const response = await fetch(`/api/sharia-research/results/${encodeURIComponent(result.id)}/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force: true }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) { setError(payload?.error?.message || 'REFRESH_FAILED'); setView('error'); return; }
    setJob({ id: payload.jobId, status: payload.status, progress: 5, currentStep: 'identifying_security', candidates: [], partialErrors: [], resultId: null, error: null, expiresAt: '' });
  };

  const reset = () => { setView('idle'); setJob(null); setResult(null); setCandidates([]); setError(''); setQuery(''); };
  const selectedMethodology = methodologies.find(item => item.id === methodologyId);

  return (
    <main id="main-content" className={styles.page} dir={direction}>
      <section className={styles.hero}>
        <div className={styles.heroSeal} aria-hidden="true"><FileSearch size={24} /></div>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{c.eyebrow}</span>
          <h1>{c.title}</h1>
          <p>{c.subtitle}</p>
          <div className={styles.scopeNote}><Info size={16} /><span>{c.scope}</span></div>
        </div>
        <div className={styles.heroMeta}>
          <button type="button" className={styles.configButton} onClick={() => setSourcesOpen(open => !open)} aria-expanded={sourcesOpen}>
            <Globe2 size={17} /><span>{c.configuration}</span><ChevronDown className={sourcesOpen ? styles.rotate : ''} size={16} />
          </button>
          {sourcesOpen && <SourceConfiguration statuses={sourceStatus} c={c} />}
        </div>
      </section>

      <section className={styles.searchPanel} aria-label={c.searchLabel}>
        <form onSubmit={submit} className={styles.searchForm}>
          <label>
            <span>{c.searchLabel}</span>
            <div className={styles.searchControl}>
              <Search size={20} aria-hidden="true" />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder={c.placeholder} dir="auto" maxLength={160} autoComplete="off" />
            </div>
          </label>
          <label className={styles.methodSelect}>
            <span>{c.methodology}</span>
            <select value={methodologyId} onChange={event => setMethodologyId(event.target.value)}>
              {(methodologies.length ? methodologies : [{ id: methodologyId, name: 'MSCI Islamic Index Series', nameAr: 'منهجية سلسلة مؤشرات MSCI الإسلامية', nameFr: 'Série d’indices islamiques MSCI', version: '2025-07' } as ShariaMethodology]).map(method => (
                <option value={method.id} key={method.id}>{methodologyName(method, locale)} · {method.version}</option>
              ))}
            </select>
          </label>
          <button type="submit" className={styles.primaryButton} disabled={!query.trim() || view === 'identifying'}>
            {view === 'identifying' ? <Loader2 className={styles.spin} size={18} /> : <FileSearch size={18} />}{c.searchAction}
          </button>
        </form>
        {selectedMethodology && (
          <div className={styles.methodStrip}>
            <BookOpenCheck size={16} />
            <span>{methodologyName(selectedMethodology, locale)}</span>
            <b>{c.methodologyVersion}: {selectedMethodology.version}</b>
            <a href={selectedMethodology.sourceDocument.url} target="_blank" rel="noreferrer">{selectedMethodology.sourceDocument.publisher}<ExternalLink size={13} /></a>
          </div>
        )}
      </section>

      <div className={styles.liveRegion} aria-live="polite">
        {view === 'identifying' && <IdentifyingState label={c.steps.identifying_security} />}
        {view === 'selection' && <SelectionState candidates={candidates} c={c} locale={locale} onSelect={selectSecurity} />}
        {view === 'researching' && job && <ProgressState job={job} c={c} locale={locale} onCancel={cancelJob} />}
        {view === 'error' && <ErrorState message={error} c={c} onReset={reset} />}
        {view === 'result' && result && <ResultView result={result} c={c} locale={locale} onRefresh={refreshResult} onReset={reset} />}
      </div>

      {view === 'idle' && (
        <><section className={styles.emptyResearch}>
          <div><ShieldCheck size={24} /><h2>{c.business}</h2><p>{c.subtitle}</p></div>
          <div><FileCheck2 size={24} /><h2>{c.financial}</h2><p>{c.noValue}</p></div>
          <div><Link2 size={24} /><h2>{c.sourcesTitle}</h2><p>{c.scope}</p></div>
        </section>{history.length > 0 && <section className={styles.historyPanel}><SectionTitle icon={<Clock3 size={19} />} title={c.history} /><div>{history.slice(0, 6).map(item => <button type="button" key={item.id} onClick={() => setQuery(item.original_query)}><span dir="auto">{item.original_query}</span><small>{formatDate(item.created_at, locale, true)}</small><b>{c.searchAgain}</b></button>)}</div></section>}</>
      )}

      <section className={styles.disclaimer}><ShieldAlert size={20} /><div><strong>{c.manualReview}</strong><p>{c.disclaimer}</p></div></section>
    </main>
  );
}

function SourceConfiguration({ statuses, c }: { statuses: SourceConfigurationStatus[]; c: typeof COPY[Locale] }) {
  return <div className={styles.configPopover}>{statuses.map(status => (
    <div key={status.id} className={styles.configRow}>
      {status.enabled ? <CheckCircle2 size={15} /> : <CircleDashed size={15} />}
      <span>{status.label}</span>
      <b className={status.enabled ? styles.enabled : styles.disabled}>{status.enabled ? c.enabled : c.disabled}</b>
      {!status.enabled && status.requirement && <small>{c.requires}: <code dir="ltr">{status.requirement}</code></small>}
    </div>
  ))}</div>;
}

function IdentifyingState({ label }: { label: string }) {
  return <section className={styles.stateCard}><Loader2 className={styles.spin} size={26} /><h2>{label}</h2></section>;
}

function SelectionState({ candidates, c, locale, onSelect }: { candidates: SecurityCandidate[]; c: typeof COPY[Locale]; locale: Locale; onSelect: (candidate: SecurityCandidate) => void }) {
  return <section className={styles.selectionPanel}>
    <div className={styles.sectionHeading}><AlertTriangle size={21} /><div><h2>{c.selectionTitle}</h2><p>{c.selectionBody}</p></div></div>
    <div className={styles.candidateGrid}>{candidates.map(candidate => (
      <article key={candidate.canonicalId} className={styles.candidateCard}>
        <CompanyLogo symbol={candidate.ticker} name={candidate.name} logoUrl={candidate.logoUrl ?? undefined} exchange={candidate.exchange} size="md" />
        <div className={styles.candidateIdentity}><h3 dir="auto">{locale === 'ar' && candidate.nameAr ? candidate.nameAr : candidate.name}</h3><p dir="ltr">{candidate.ticker} · {candidate.exchange}</p>{candidate.isin && <small dir="ltr">{candidate.isin}</small>}</div>
        <button type="button" onClick={() => onSelect(candidate)}>{c.choose}</button>
      </article>
    ))}</div>
  </section>;
}

function ProgressState({ job, c, locale, onCancel }: { job: PublicJob; c: typeof COPY[Locale]; locale: Locale; onCancel: () => void }) {
  const currentIndex = STEP_ORDER.indexOf(job.currentStep);
  return <section className={styles.progressPanel}>
    <div className={styles.progressHeader}><div><span>{c.progressTitle}</span><strong>{job.progress}%</strong></div><button type="button" onClick={onCancel}><Square size={14} />{c.cancelAction}</button></div>
    <div className={styles.progressTrack}><span style={{ width: `${job.progress}%` }} /></div>
    <ol className={styles.steps}>{STEP_ORDER.map((step, index) => {
      const complete = index < currentIndex;
      const active = step === job.currentStep;
      return <li key={step} className={complete ? styles.stepComplete : active ? styles.stepActive : ''}>{complete ? <Check size={14} /> : active ? <Loader2 className={styles.spin} size={14} /> : <CircleDashed size={14} />}<span>{c.steps[step]}</span></li>;
    })}</ol>
    {job.partialErrors.length > 0 && <details className={styles.partialErrors}><summary>{c.partialFailures} ({job.partialErrors.length})</summary>{job.partialErrors.map((item, index) => <p key={`${item.code}-${index}`}><b dir="ltr">{item.code}</b>{locale === 'en' ? ` — ${item.message}` : ` — ${c.tryAgain}`}</p>)}</details>}
  </section>;
}

function ErrorState({ message, c, onReset }: { message: string; c: typeof COPY[Locale]; onReset: () => void }) {
  return <section className={styles.errorPanel}><AlertCircle size={30} /><h2>{c.errorTitle}</h2><p>{message || c.tryAgain}</p><button type="button" onClick={onReset}>{c.newSearch}</button></section>;
}

function ResultView({ result, c, locale, onRefresh, onReset }: { result: ShariaScreeningResult; c: typeof COPY[Locale]; locale: Locale; onRefresh: () => void; onReset: () => void }) {
  const businessStatus = result.businessScreen.status;
  const cacheLabel = result.cacheState === 'outdated' ? c.cacheOutdated : result.cacheState === 'recently_cached' ? c.cacheRecent : c.cacheLive;
  const evidenceByDocument = useMemo(() => new Map(result.documents.concat(result.relatedNews).map(document => [document.id, result.evidence.filter(item => item.documentId === document.id)])), [result]);
  return <div className={styles.resultStack}>
    <section className={`${styles.resultHero} ${classificationTone(result.classification)}`}>
      <div className={styles.resultIdentity}>
        <CompanyLogo symbol={result.security.ticker} name={result.security.name} logoUrl={result.security.logoUrl ?? undefined} exchange={result.security.exchange} size="lg" />
        <div><span>{c.resultTitle}</span><h2>{c.status[result.classification]}</h2><p dir="auto">{locale === 'ar' && result.security.nameAr ? result.security.nameAr : result.security.name}</p></div>
      </div>
      <div className={styles.confidenceBlock}><div><span>{c.confidence}</span><strong>{result.confidence}%</strong></div><div className={styles.confidenceTrack}><span style={{ width: `${result.confidence}%` }} /></div><small>{c.notCertainty}</small></div>
      <div className={styles.resultMeta}>
        <span><BookOpenCheck size={15} />{methodologyName(result.methodology, locale)}</span>
        <span><Clock3 size={15} />{c.lastReport}: {formatDate(result.lastFinancialReportDate, locale)}</span>
        <span><RefreshCcw size={15} />{cacheLabel} · {formatDate(result.retrievedAt, locale, true)}</span>
      </div>
      <div className={styles.resultActions}><button type="button" onClick={onRefresh}><RefreshCcw size={16} />{c.freshAction}</button><button type="button" onClick={onReset}>{c.newSearch}</button></div>
    </section>

    <section className={styles.identityPanel}><SectionTitle icon={<Building2 size={19} />} title={c.securityIdentity} />
      <dl className={styles.identityGrid}><Fact label={c.ticker} value={result.security.ticker} ltr /><Fact label={c.exchange} value={result.security.exchange} /><Fact label={c.isin} value={result.security.isin || '—'} ltr /><Fact label={c.country} value={result.security.country || '—'} /><Fact label={c.sector} value={result.security.sector || result.security.industry || '—'} /><Fact label={c.sourceCount} value={String(result.sourceCount)} /></dl>
    </section>

    <section className={styles.reasonPanel}><SectionTitle icon={<ShieldCheck size={19} />} title={c.reasons} />
      <div className={styles.screenGrid}>
        <ScreenSummary title={c.business} status={businessStatus} c={c} reasons={result.businessScreen.reasons.map(reason => localizedReason(reason, locale))} />
        <ScreenSummary title={c.financial} status={result.financialRatios.some(item => item.status === 'fail') ? 'fail' : result.financialRatios.some(item => item.status === 'unavailable') ? 'unavailable' : 'pass'} c={c} reasons={result.financialRatios.filter(item => item.status !== 'pass').map(item => ratioName(item, locale))} />
        <ScreenSummary title={c.unresolved} status={result.conflicts.length ? 'fail' : result.unavailableChecks.length || result.businessScreen.status === 'review' ? 'review' : 'pass'} c={c} reasons={result.conflicts.map(item => locale === 'ar' ? `تعارض مادي في الحقل ${item.field}.` : locale === 'fr' ? `Contradiction importante dans le champ ${item.field}.` : item.summary).concat(result.financialRatios.filter(item => item.status === 'unavailable').map(item => ratioName(item, locale)))} />
      </div>
    </section>

    <section className={styles.ratiosPanel}><SectionTitle icon={<FileCheck2 size={19} />} title={c.financial} />
      <div className={styles.ratioGrid}>{result.financialRatios.map(ratio => <article className={styles.ratioCard} key={ratio.ruleId}>
        <div className={styles.ratioHeading}><h3>{ratioName(ratio, locale)}</h3><StatusPill status={ratio.status} label={checkLabel(ratio.status, c)} /></div>
        <dl><Fact label={c.value} value={percent(ratio.value)} ltr /><Fact label={c.threshold} value={`≤ ${percent(ratio.threshold)}`} ltr /><Fact label={c.reportingPeriod} value={ratio.reportingPeriod || '—'} ltr /></dl>
        <div className={styles.formula}><span>{c.formula}</span><code dir="ltr">{ratio.formula}</code></div>
        {ratio.warning && <p className={styles.ratioWarning}><AlertTriangle size={14} />{localizedReason(ratio.warning, locale)}</p>}
      </article>)}</div>
    </section>

    {(result.conflicts.length > 0 || result.unavailableChecks.length > 0) && <section className={styles.alertPanel}><SectionTitle icon={<AlertTriangle size={19} />} title={c.conflicts} />
      {result.conflicts.map((conflict, index) => <p key={`${conflict.field}-${index}`}><b dir="ltr">{conflict.field}</b> — {locale === 'ar' ? 'تعرض المصادر قيماً مختلفة جوهرياً للفترة نفسها.' : locale === 'fr' ? 'Les sources publient des valeurs sensiblement différentes pour la même période.' : conflict.summary}</p>)}
      {result.financialRatios.filter(ratio => ratio.status === 'unavailable').map(ratio => <p key={ratio.ruleId}><CircleDashed size={14} />{ratioName(ratio, locale)}</p>)}
    </section>}

    <section className={styles.sourcesPanel}><div className={styles.sourceHeader}><SectionTitle icon={<Link2 size={19} />} title={c.sourcesTitle} /><div className={styles.qualityBadges}><span>{c.quality}</span><b>T1 {result.sourceQualityBreakdown.tier1}</b><b>T2 {result.sourceQualityBreakdown.tier2}</b><b>T3 {result.sourceQualityBreakdown.tier3}</b><b>T4 {result.sourceQualityBreakdown.tier4}</b></div></div>
      <div className={styles.sourceList}>{result.documents.map(document => <SourceCard key={document.id} document={document} evidence={evidenceByDocument.get(document.id) ?? []} c={c} locale={locale} />)}</div>
    </section>

    {result.relatedNews.length > 0 && <section className={styles.newsPanel}><SectionTitle icon={<Globe2 size={19} />} title={c.newsTitle} /><p className={styles.newsNotice}><Info size={15} />{c.newsNotice}</p><div className={styles.newsGrid}>{result.relatedNews.map(document => <SourceCard key={document.id} document={document} evidence={evidenceByDocument.get(document.id) ?? []} c={c} locale={locale} compact />)}</div></section>}

    <section className={styles.warningPanel}><SectionTitle icon={<ShieldAlert size={19} />} title={c.warnings} /><ul>{result.warnings.map(warning => <li key={warning}>{localizedReason(warning, locale)}</li>)}</ul></section>
  </div>;
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) { return <div className={styles.sectionTitle}>{icon}<h2>{title}</h2></div>; }
function Fact({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) { return <div><dt>{label}</dt><dd dir={ltr ? 'ltr' : 'auto'}>{value}</dd></div>; }

function StatusPill({ status, label }: { status: string; label: string }) {
  const icon = status === 'pass' ? <CheckCircle2 size={14} /> : status === 'fail' ? <XCircle size={14} /> : <AlertTriangle size={14} />;
  return <span className={`${styles.statusPill} ${status === 'pass' ? styles.statusPass : status === 'fail' ? styles.statusFail : styles.statusWarn}`}>{icon}{label}</span>;
}

function ScreenSummary({ title, status, c, reasons }: { title: string; status: string; c: typeof COPY[Locale]; reasons: string[] }) {
  return <article className={styles.screenCard}><div><h3>{title}</h3><StatusPill status={status} label={checkLabel(status, c)} /></div>{reasons.length ? <ul>{reasons.slice(0, 4).map(reason => <li key={reason}>{reason}</li>)}</ul> : <p>—</p>}</article>;
}

function SourceCard({ document, evidence, c, locale, compact = false }: { document: SourceDocument; evidence: ShariaScreeningResult['evidence']; c: typeof COPY[Locale]; locale: Locale; compact?: boolean }) {
  const badge = document.reliability === 'context_only' ? c.contextOnly : document.tier === 1 && document.reliability === 'official' ? c.official : c.secondary;
  const excerpts = evidence.map(item => item.excerpt).concat(document.evidenceSnippets).filter(Boolean).slice(0, compact ? 1 : 3);
  return <article className={`${styles.sourceCard} ${compact ? styles.sourceCompact : ''}`}>
    <div className={styles.sourceTop}><span className={document.tier === 1 && document.reliability === 'official' ? styles.officialBadge : styles.secondaryBadge}>{badge}</span><span dir="ltr">{document.domain}</span></div>
    <h3 dir="auto">{document.sourceTitle}</h3>
    <div className={styles.sourceDates}><span>{c.publicationDate}: {formatDate(document.publicationDate || document.filingDate, locale)}</span><span>{c.retrievalDate}: {formatDate(document.retrievalDate, locale, true)}</span></div>
    {!compact && document.supports.length > 0 && <p className={styles.supports}><b>{c.supports}:</b> {localizedSupport(document, locale)}</p>}
    {excerpts.length > 0 && <div className={styles.excerpts}><span>{c.relevantExcerpt}</span>{excerpts.map((excerpt, index) => <blockquote key={`${document.id}-${index}`}>{excerpt}</blockquote>)}</div>}
    <a className={styles.sourceLink} href={document.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />{c.openSource}<span dir="ltr">{document.sourceUrl}</span></a>
    {!compact && (document.groupedUrls?.length ?? 0) > 1 && <details className={styles.groupedUrls}><summary>{c.groupedCopies} ({document.groupedUrls?.length})</summary>{document.groupedUrls?.map(url => <a key={url} href={url} target="_blank" rel="noreferrer" dir="ltr">{url}</a>)}</details>}
  </article>;
}
