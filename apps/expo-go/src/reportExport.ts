import type { MobileLanguage } from '../../../src/lib/mobile/resourceContract';
import type { BusinessReport, FinanceReport } from './workspaceReports';

type Product = 'finance' | 'business';
type Labels = readonly [string, string, string];
type Report = FinanceReport | BusinessReport;

const label = (language: MobileLanguage, values: Labels) => values[language === 'ar' ? 0 : language === 'fr' ? 2 : 1];
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
const number = (value: number, language: MobileLanguage) => value.toLocaleString(language === 'ar' ? 'ar' : language === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 3 });

const words = {
  title: ['تقرير THE SFM الشهري', 'THE SFM monthly report', 'Rapport mensuel THE SFM'],
  finance: ['المالية', 'Finance', 'Finance'],
  business: ['عمليات الأعمال', 'Business operations', "Opérations d’entreprise"],
  period: ['شهر التقرير', 'Reporting month', 'Mois du rapport'],
  source: ['يعرض هذا التصدير ملخصات مشتقة فقط من سجلات الحساب المحمّلة لهذا التقرير. لا يجمع بين العملات.', 'This export contains summaries derived only from the account records loaded for this report. It does not combine currencies.', "Cette exportation contient uniquement des synthèses tirées des enregistrements du compte chargés pour ce rapport. Elle ne combine pas les devises."],
  partial: ['قد يكون التقرير جزئياً: تم تحميل أول 800 سجل فقط لكل قسم. راجع القسم التفصيلي قبل استخدامه ككشف كامل.', 'This report may be partial: only the first 800 records in each section were loaded. Review the detailed section before using it as a complete statement.', "Ce rapport peut être partiel : seuls les 800 premiers enregistrements de chaque section ont été chargés. Consultez le détail avant de l’utiliser comme relevé complet."],
  noRows: ['لا توجد سجلات نقدية مؤرخة لهذا الشهر.', 'No dated monetary records are available for this month.', 'Aucun enregistrement monétaire daté n’est disponible pour ce mois.'],
  receivedIncome: ['الدخل المستلم', 'Received income', 'Revenus reçus'],
  expectedIncome: ['الدخل المتوقع', 'Expected income', 'Revenus prévus'],
  expenses: ['المصروفات', 'Expenses', 'Dépenses'],
  cashAfterExpenses: ['النقد بعد المصروفات', 'Cash after expenses', 'Trésorerie après dépenses'],
  savings: ['المدخرات المضافة', 'Savings added', 'Épargne ajoutée'],
  debtOutstanding: ['الدين المتبقي', 'Debt remaining', 'Dette restante'],
  completedSales: ['المبيعات المكتملة', 'Completed sales', 'Ventes finalisées'],
  pendingSales: ['المبيعات المعلقة', 'Pending sales', 'Ventes en attente'],
  operatingExpenses: ['مصروفات التشغيل', 'Operating expenses', "Charges d’exploitation"],
  operatingNet: ['صافي التشغيل', 'Operating net', "Solde d’exploitation"],
  paidInvoices: ['الفواتير المدفوعة', 'Paid invoices', 'Factures payées'],
  outstandingInvoices: ['الفواتير المستحقة', 'Outstanding invoices', 'Factures impayées'],
  overdueInvoices: ['الفواتير المتأخرة', 'Overdue invoices', 'Factures en retard'],
  accountData: ['بيانات الحساب المستخدمة', 'Account data used', 'Données du compte utilisées'],
  income: ['الدخل', 'Income', 'Revenus'],
  records: ['سجل', 'records', 'enregistrements'],
  undated: ['سجلات بلا تاريخ تقرير', 'records without a reporting date', 'enregistrements sans date de rapport'],
  projects: ['المشاريع', 'Projects', 'Projets'],
  customers: ['العملاء', 'Customers', 'Clients'],
  suppliers: ['الموردون', 'Suppliers', 'Fournisseurs'],
  activeEmployees: ['الموظفون النشطون', 'Active employees', 'Employés actifs'],
  openInvoices: ['الفواتير المفتوحة', 'Open invoices', 'Factures ouvertes'],
} as const satisfies Record<string, Labels>;

const row = (name: string, value: string) => `<tr><th scope="row">${escapeHtml(name)}</th><td>${escapeHtml(value)}</td></tr>`;
const money = (value: number, currency: string, language: MobileLanguage) => `${number(value, language)} ${currency}`;

function financeCurrencyRows(report: FinanceReport, language: MobileLanguage) {
  return report.currencies.map(currency => `<section class="currency"><h2>${escapeHtml(currency.currency)}</h2><table><tbody>${[
    row(label(language, words.receivedIncome), money(currency.receivedIncome, currency.currency, language)),
    row(label(language, words.expectedIncome), money(currency.expectedIncome, currency.currency, language)),
    row(label(language, words.expenses), money(currency.expenses, currency.currency, language)),
    row(label(language, words.cashAfterExpenses), money(currency.receivedIncome - currency.expenses, currency.currency, language)),
    row(label(language, words.savings), money(currency.savings, currency.currency, language)),
    row(label(language, words.debtOutstanding), money(currency.debtOutstanding, currency.currency, language)),
  ].join('')}</tbody></table></section>`).join('');
}

function businessCurrencyRows(report: BusinessReport, language: MobileLanguage) {
  return report.currencies.map(currency => `<section class="currency"><h2>${escapeHtml(currency.currency)}</h2><table><tbody>${[
    row(label(language, words.completedSales), money(currency.completedSales, currency.currency, language)),
    row(label(language, words.pendingSales), money(currency.pendingSales, currency.currency, language)),
    row(label(language, words.operatingExpenses), money(currency.operatingExpenses, currency.currency, language)),
    row(label(language, words.operatingNet), money(currency.completedSales - currency.operatingExpenses, currency.currency, language)),
    row(label(language, words.paidInvoices), money(currency.paidInvoices, currency.currency, language)),
    row(label(language, words.outstandingInvoices), money(currency.outstandingInvoices, currency.currency, language)),
    row(label(language, words.overdueInvoices), money(currency.overdueInvoices, currency.currency, language)),
  ].join('')}</tbody></table></section>`).join('');
}

function accountData(product: Product, report: Report, language: MobileLanguage) {
  const finance = report as FinanceReport;
  const business = report as BusinessReport;
  const values = product === 'finance'
    ? [
      row(label(language, words.income), `${number(finance.incomeCount, language)} ${label(language, words.records)}`),
      row(label(language, words.expenses), `${number(finance.expenseCount, language)} ${label(language, words.records)}`),
      row(label(language, words.savings), `${number(finance.savingsCount, language)} ${label(language, words.records)}`),
      row(label(language, words.debtOutstanding), `${number(finance.debtCount, language)} ${label(language, words.records)}`),
    ]
    : [
      row(label(language, words.projects), `${number(business.projectCount, language)} ${label(language, words.records)}`),
      row(label(language, words.customers), `${number(business.customerCount, language)} ${label(language, words.records)}`),
      row(label(language, words.suppliers), `${number(business.supplierCount, language)} ${label(language, words.records)}`),
      row(label(language, words.activeEmployees), `${number(business.employeeCount, language)} ${label(language, words.records)}`),
      row(label(language, words.openInvoices), `${number(business.openInvoiceCount, language)} ${label(language, words.records)}`),
    ];
  values.push(row(label(language, words.undated), `${number(report.undatedRecords, language)} ${label(language, words.records)}`));
  return `<section><h2>${escapeHtml(label(language, words.accountData))}</h2><table><tbody>${values.join('')}</tbody></table></section>`;
}

export function buildReportExport({ product, period, report, language, truncated }: { product: Product; period: string; report: Report; language: MobileLanguage; truncated: boolean }) {
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const title = `${label(language, words.title)} — ${label(language, product === 'finance' ? words.finance : words.business)}`;
  const body = product === 'finance' ? financeCurrencyRows(report as FinanceReport, language) : businessCurrencyRows(report as BusinessReport, language);
  return {
    filename: `the-sfm-${product}-${period}-report.pdf`,
    html: `<!doctype html><html lang="${language}" dir="${direction}"><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#101828;margin:28px;line-height:1.45}h1{font-size:22px;margin:0 0 8px}h2{font-size:17px;margin:20px 0 8px}.meta,.notice{padding:12px;border-radius:8px;background:#f2f4f7;margin:12px 0}.notice{background:#fff4e5;color:#7a4200}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #d0d5dd;padding:8px;text-align:start}th{font-weight:600;width:62%}.currency{break-inside:avoid}@page{margin:18mm}</style></head><body><h1>${escapeHtml(title)}</h1><div class="meta"><strong>${escapeHtml(label(language, words.period))}:</strong> ${escapeHtml(period)}<br>${escapeHtml(label(language, words.source))}</div>${truncated ? `<div class="notice">${escapeHtml(label(language, words.partial))}</div>` : ''}${accountData(product, report, language)}${body || `<p>${escapeHtml(label(language, words.noRows))}</p>`}</body></html>`,
  };
}
