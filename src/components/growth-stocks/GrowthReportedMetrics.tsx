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
  if (!growthMetricCount(data) && screenMetricCount(screening)) return <div><p className="muted">{lang === 'ar' ? 'نمو القوائم المالية' : lang === 'fr' ? 'Croissance publiée' : 'Reported growth'} · {screening?.growthPeriod} · FMP</p><div className="metric-grid"><div className="mini-metric"><span>{lang === 'ar' ? 'نمو الإيرادات' : lang === 'fr' ? 'Croissance CA' : 'Revenue growth'}</span><strong dir="ltr">{percent(screening?.revenueGrowthPercent)}</strong></div><div className="mini-metric"><span>{lang === 'ar' ? 'نمو ربحية السهم' : lang === 'fr' ? 'Croissance BPA' : 'EPS growth'}</span><strong dir="ltr">{percent(screening?.earningsGrowthPercent)}</strong></div></div></div>;
  const values = [
    [text.revenue, percent(data?.revenueGrowthPercent)], [text.earnings, percent(data?.earningsGrowthPercent)],
    [text.margin, percent(data?.netMarginPercent)], [text.cash, data?.freeCashFlow == null ? text.missing : `${formatter.format(data.freeCashFlow)} ${data.currency ?? ''}`],
  ];
  return <div className="reported-growth-metrics">
    <p className="muted">{text.annual}{data?.period ? <> · <span dir="ltr">{data.period}</span></> : null}</p>
    <div className="metric-grid">{values.map(([label, value]) => <div className="mini-metric" key={label}><span>{label}</span><strong dir={value === text.missing ? 'auto' : 'ltr'}>{value}</strong></div>)}</div>
    {data?.sourceUrl && growthMetricCount(data) > 0 ? <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="muted">SEC EDGAR{data.status === 'partial' ? ` · ${text.partial}` : ''}</a> : null}
  </div>;
}
