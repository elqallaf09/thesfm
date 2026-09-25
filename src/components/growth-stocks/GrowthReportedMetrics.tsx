import styles from './GrowthReportedMetrics.module.css';
import { growthMetricCount, type GrowthFundamentals } from '@/lib/market/growthFundamentalsCore';
export type GrowthScreenEvidence = { revenueGrowthPercent?: number | null; earningsGrowthPercent?: number | null; growthPeriod?: string | null };
export function screenMetricCount(data?: GrowthScreenEvidence) { return data?.growthPeriod ? [data.revenueGrowthPercent, data.earningsGrowthPercent].filter(value => typeof value === 'number' && Number.isFinite(value)).length : 0; }
type Lang = 'ar' | 'en' | 'fr';
const copy = {
  ar: { annual: 'البيانات السنوية المعلنة', revenue: 'نمو الإيرادات السنوي', earnings: 'نمو صافي الربح السنوي', margin: 'هامش صافي الربح', cash: 'التدفق النقدي الحر', partial: 'بيانات جزئية', missing: 'غير متاح', loading: 'جارٍ جلب الإيداعات المالية', ready: 'تتوفر بيانات أساسية', unavailable: 'لم تتوفر بيانات مالية كافية', note: 'تُحسب المؤشرات من الإيداعات السنوية المتاحة، مع إظهار الفترة والمصدر. وجود السهم في قائمة المراقبة لا يعني اجتيازه شروط النمو.', sourceError: 'تعذر تحميل الإيداعات المالية حالياً. يمكنك إعادة المحاولة بزر التحديث.' },
  en: { annual: 'Reported annual financials', revenue: 'Annual revenue growth', earnings: 'Annual net income growth', margin: 'Net profit margin', cash: 'Free cash flow', partial: 'Partial data', missing: 'Unavailable', loading: 'Loading financial filings', ready: 'Fundamentals available', unavailable: 'Insufficient reported financials', note: 'Metrics use available annual filings with their period and source. Watchlist membership does not mean a stock passes the growth screen.', sourceError: 'Financial filings could not be loaded. Use Refresh to try again.' },
  fr: { annual: 'Données annuelles publiées', revenue: 'Croissance annuelle du CA', earnings: 'Croissance annuelle du bénéfice net', margin: 'Marge nette', cash: 'Flux de trésorerie disponible', partial: 'Données partielles', missing: 'Indisponible', loading: 'Chargement des rapports financiers', ready: 'Fondamentaux disponibles', unavailable: 'Données financières insuffisantes', note: 'Les indicateurs utilisent les rapports annuels disponibles avec période et source. La liste de suivi ne garantit pas le respect des critères de croissance.', sourceError: 'Les rapports financiers n’ont pas pu être chargés. Utilisez Actualiser pour réessayer.' },
};
export function GrowthCoverageSummary({ items, loading, lang }: { items: Array<GrowthScreenEvidence & { reported?: GrowthFundamentals }>; loading: boolean; lang: Lang }) {
  const text = copy[lang];
  const covered = items.filter(item => growthMetricCount(item.reported) > 0 || screenMetricCount(item) > 0).length;
  const sourceFailure = items.some(item => item.reported?.reason === 'source_unavailable');
  return <><strong>{loading ? text.loading : covered ? text.ready : text.unavailable} <span dir="ltr">{covered}/{items.length}</span></strong><p>{!loading && !covered && sourceFailure ? text.sourceError : text.note}</p></>;
}
export function GrowthReportedMetrics({ data, lang, screening }: { data?: GrowthFundamentals; lang: Lang; screening?: GrowthScreenEvidence }) {
  const text = copy[lang];
  const formatter = new Intl.NumberFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang, { maximumFractionDigits: 2, numberingSystem: 'latn' });
  const percent = (value: number | null | undefined) => value == null ? text.missing : `${formatter.format(value)}%`;
  const hasReported = growthMetricCount(data) > 0;
  const useScreening = !hasReported && screenMetricCount(screening) > 0;
  const values: Array<[string, number | null | undefined, string]> = useScreening ? [
    [lang === 'ar' ? 'نمو الإيرادات' : lang === 'fr' ? 'Croissance CA' : 'Revenue growth', screening?.revenueGrowthPercent, percent(screening?.revenueGrowthPercent)],
    [lang === 'ar' ? 'نمو ربحية السهم' : lang === 'fr' ? 'Croissance BPA' : 'EPS growth', screening?.earningsGrowthPercent, percent(screening?.earningsGrowthPercent)],
  ] : [
    [text.revenue, data?.revenueGrowthPercent, percent(data?.revenueGrowthPercent)],
    [text.earnings, data?.earningsGrowthPercent, percent(data?.earningsGrowthPercent)],
    [text.margin, data?.netMarginPercent, percent(data?.netMarginPercent)],
    [text.cash, data?.freeCashFlow, data?.freeCashFlow == null ? text.missing : `${formatter.format(data.freeCashFlow)} ${data.currency ?? ''}`],
  ];
  const available = values.filter(([, value]) => typeof value === 'number' && Number.isFinite(value));
  const missing = values.filter(([, value]) => value == null || !Number.isFinite(value)).map(([label]) => label);
  const period = useScreening ? screening?.growthPeriod : data?.period;
  const combinedCapex = data?.freeCashFlowBasis === 'property_equipment_and_intangibles';
  const missingLabel = lang === 'ar' ? 'مؤشرات لم تتوفر' : lang === 'fr' ? 'Indicateurs indisponibles' : 'Unavailable metrics';
  return <div className={`reported-growth-metrics ${styles.root}`}>
    {available.length > 0 ? <>
      <p className={styles.heading}>{useScreening ? (lang === 'ar' ? 'نمو القوائم المالية' : lang === 'fr' ? 'Croissance publiée' : 'Reported growth') : text.annual}{period ? <> · <bdi>{period}</bdi></> : null}</p>
      <dl className={styles.grid}>{available.map(([label, , value]) => <div className={styles.metric} key={label}><dt>{label}</dt><dd dir="ltr">{value}</dd></div>)}</dl>
      {combinedCapex ? <p className={styles.note}>{lang === 'ar' ? 'التدفق الحر بعد مشتريات الممتلكات والمعدات والأصول غير الملموسة.' : lang === 'fr' ? 'Flux disponible après achats d’immobilisations corporelles et incorporelles.' : 'Free cash flow after property, equipment and intangible asset purchases.'}</p> : null}
      {useScreening ? <span className={styles.source}>FMP</span> : data?.sourceUrl ? <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.source}>SEC EDGAR{missing.length ? ` · ${text.partial}` : ''}</a> : null}
    </> : <p className={styles.note}>{!data ? text.loading : data.reason === 'source_unavailable' ? text.sourceError : text.unavailable}</p>}
    {missing.length && data ? <details className={styles.note}><summary>{missingLabel} ({missing.length})</summary><p>{missing.join(' · ')}</p></details> : null}
  </div>;
}
