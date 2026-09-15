 'use client';
import { useLanguage } from '@/hooks/useLanguage';
type Evidence = { fieldCoverage?: Array<{ field: string; state: string; reportedValues: number }>;
  fundReview?: { coverage?: string; reason?: string; asOf?: string; holdingCount?: number; passingWeight?: number; failingWeight?: number; unknownWeight?: number } };
const labels: Record<string, [string, string, string]> = {
  total_assets: ['الأصول', 'Assets', 'Actifs'], interest_bearing_debt: ['الدين', 'Debt', 'Dette'], cash_and_equivalents: ['النقد', 'Cash', 'Trésorerie'],
  interest_bearing_securities: ['الأدوات ذات الفائدة', 'Interest-bearing instruments', 'Instruments portant intérêt'], accounts_receivable: ['الذمم المدينة', 'Receivables', 'Créances'],
  total_income: ['الإيرادات', 'Revenue', 'Revenus'], interest_income: ['دخل الفوائد', 'Interest income', 'Intérêts'], prohibited_revenue: ['الدخل غير المتوافق الآخر', 'Other non-compliant income', 'Autres revenus non conformes'],
  exact: ['قيمة موثقة', 'Verified amount', 'Montant vérifié'], bounded: ['حد موثق — ليس حقلًا مفقودًا', 'Documented bound — not missing', 'Borne documentée — non absente'],
  missing: ['لم يُستخرج', 'Not extracted', 'Non extrait'], invalid: ['لم يجتز التحقق', 'Validation incomplete', 'Validation incomplète'], outdated_period: ['لفترة أقدم', 'Older period', 'Période antérieure'],
};
export default function ShariahCoverageDetails({ evidence }: { evidence: Evidence }) {
  const { lang } = useLanguage(); const ix = lang === 'ar' ? 0 : lang === 'fr' ? 2 : 1;
  const text = (ar: string, en: string, fr: string) => [ar, en, fr][ix];
  const percent = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : '—';
  const fund = evidence.fundReview;
  return <>
    {!!evidence.fieldCoverage?.length && <details open><summary>{text('تغطية الحقول الفعلية', 'Actual field coverage', 'Couverture réelle des champs')}</summary><div className="coverage-grid">
      {evidence.fieldCoverage.map(item => <p key={item.field}><strong>{labels[item.field]?.[ix] ?? item.field}</strong>: {labels[item.state]?.[ix] ?? item.state}</p>)}
    </div></details>}
    {fund && <div className="fund-proof"><strong>{text('مراجعة الصندوق منفصلة عن فحص الشركات', 'Fund review is separate from corporate screening', 'Examen du fonds distinct du filtrage des entreprises')}</strong>
      <p>{text('تاريخ المكونات', 'Holdings date', 'Date des positions')}: <span dir="ltr">{fund.asOf ?? '—'}</span> · {text('عدد المكونات المستخرجة', 'Extracted holdings', 'Positions extraites')}: {fund.holdingCount ?? '—'}</p>
      {fund.holdingCount ? <p>{text('أوزان مكونات اجتازت / لم تجتز / غير محسومة', 'Weights passing / failing / undetermined', 'Poids conformes / non conformes / indéterminés')}: <span dir="ltr">{percent(fund.passingWeight)} / {percent(fund.failingWeight)} / {percent(fund.unknownWeight)}</span></p> : null}
      <p>{text('عدم اكتمال المكونات أو شروط الحفظ والتسوية يبقي الصندوق للمراجعة. لا تُطبق عليه نسب ميزانية شركة.', 'Incomplete holdings or custody/settlement terms keep the fund under review. Corporate balance-sheet ratios are not applied.', 'Des positions ou conditions de garde/règlement incomplètes imposent un examen. Les ratios d’entreprise ne sont pas appliqués.')}</p>
      <small dir="ltr">{fund.reason}</small>
    </div>}
    <style jsx>{`.coverage-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:8px}.coverage-grid p,.fund-proof p{margin:0;line-height:1.6;overflow-wrap:anywhere}.fund-proof{display:grid;gap:8px}summary{cursor:pointer;min-height:36px}`}</style>
  </>;
}
