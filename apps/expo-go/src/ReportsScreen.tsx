import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { MobilePage, MobileRecord, PhoneProduct } from '../../../src/lib/mobile/resourceContract';
import { useAccountSync } from './accountSync';
import type { Screen } from './navigation';
import { MobileRequestError, type MobileSessionClient } from './session';
import { Button, Busy, ErrorNotice, Label, Panel, formatValue, useUI } from './ui';
import { buildReportExport } from './reportExport';
import { businessReport, financeReport, shiftReportPeriod, type BusinessReport, type FinanceReport } from './workspaceReports';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const financeResources = ['income', 'expenses', 'savings', 'debts', 'goals'] as const;
const businessResources = ['projects', 'customers', 'suppliers', 'sales', 'invoices', 'employees', 'operating-expenses'] as const;
const maxPagesPerResource = 8;
type ResourceId = typeof financeResources[number] | typeof businessResources[number];
type Loaded = Partial<Record<ResourceId, MobileRecord[]>>;

async function readRecords(client: MobileSessionClient, product: PhoneProduct, resource: ResourceId, current: () => boolean) {
  const records: MobileRecord[] = []; let cursor: string | null = null; let pages = 0;
  do {
    const page: MobilePage = await client.request(`/api/mobile/${product}/records/${resource}?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    if (!current()) return { records: [], truncated: false };
    records.push(...page.records); cursor = page.nextCursor; pages += 1;
  } while (cursor && pages < maxPagesPerResource);
  return { records, truncated: cursor !== null };
}

export function ReportsScreen({ client, product, navigate }: { client: MobileSessionClient; product: Extract<PhoneProduct, 'finance' | 'business'>; navigate: (screen: Screen) => void }) {
  const { language, t } = useUI(); const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState<Loaded>({}); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [truncated, setTruncated] = useState(false); const [exportBusy, setExportBusy] = useState(false); const [exportError, setExportError] = useState(false); const [exportNotice, setExportNotice] = useState(false); const sequence = useRef(0);
  const resourceIds = product === 'finance' ? financeResources : businessResources;
  const load = useCallback(async (silent = false) => {
    const requestId = ++sequence.current;
    if (!silent) { setBusy(true); setError(''); }
    try {
      const current = () => requestId === sequence.current;
      const pages = await Promise.all(resourceIds.map(async resource => [resource, await readRecords(client, product, resource, current)] as const));
      if (!current()) return;
      setRecords(Object.fromEntries(pages.map(([resource, page]) => [resource, page.records]))); setTruncated(pages.some(([, page]) => page.truncated)); setError('');
    } catch (reason) { if (!silent && requestId === sequence.current) setError(reason instanceof MobileRequestError ? reason.code : 'LOAD_UNAVAILABLE'); }
    finally { if (!silent && requestId === sequence.current) setBusy(false); }
  }, [client, product, resourceIds]);
  useEffect(() => { const counter = sequence; void load(); return () => { ++counter.current; }; }, [load]);
  useAccountSync(() => { void load(true); });
  const report = useMemo(() => product === 'finance'
    ? financeReport(period, { income: records.income ?? [], expenses: records.expenses ?? [], savings: records.savings ?? [], debts: records.debts ?? [], goals: records.goals ?? [] })
    : businessReport(period, { projects: records.projects ?? [], customers: records.customers ?? [], suppliers: records.suppliers ?? [], sales: records.sales ?? [], invoices: records.invoices ?? [], employees: records.employees ?? [], operatingExpenses: records['operating-expenses'] ?? [] }), [period, product, records]);
  const movePeriod = (offset: number) => { const next = shiftReportPeriod(period, offset); if (next) setPeriod(next); };
  const exportPdf = useCallback(async () => {
    if (busy || exportBusy) return;
    setExportBusy(true); setExportError(false); setExportNotice(false);
    try {
      const file = buildReportExport({ product, period, report, language, truncated });
      const pdf = await Print.printToFileAsync({ html: file.html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: file.filename });
      setExportNotice(true);
    } catch { setExportError(true); }
    finally { setExportBusy(false); }
  }, [busy, exportBusy, language, period, product, report, truncated]);
  return <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 24 }}><Label large>{t(product === 'finance' ? ['مركز التقارير', 'Reports Center', 'Centre des rapports'] : ['عمليات الأعمال', 'Business operations', "Opérations d'entreprise"])}</Label><Label muted>{t(['???? ?????? ?????? ??? ?? ????? ?????? ???????? ?????? ????????.', 'This native monthly view uses only records in your account; currencies stay separate.', 'Cette vue mensuelle native utilise uniquement les enregistrements de votre compte ; les devises restent distinctes.'])}</Label>
    <Panel><Label>{t(['شهر التقرير', 'Reporting month', 'Mois du rapport'])}: {period}</Label><View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button label={t(['الشهر السابق', 'Previous month', 'Mois précédent'])} onPress={() => movePeriod(-1)} disabled={busy} /></View><View style={{ flex: 1 }}><Button label={t(['الشهر التالي', 'Next month', 'Mois suivant'])} onPress={() => movePeriod(1)} disabled={busy} /></View></View><Button label={t(['تحديث من حسابي', 'Refresh from my account', 'Actualiser depuis mon compte'])} onPress={() => { void load(); }} disabled={busy} /></Panel>
    {error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}{busy && !Object.keys(records).length ? <Busy /> : null}
    <Panel><Button label={t(['تصدير تقرير الحساب PDF', 'Export account report as PDF', 'Exporter le rapport du compte en PDF'])} onPress={() => { void exportPdf(); }} disabled={busy || exportBusy} /></Panel>
    {exportBusy ? <Busy /> : null}{exportNotice ? <Panel><Label>{t(['تم إعداد PDF التقرير من سجلات الحساب المحمّلة حالياً.', 'Your report PDF was prepared from the currently loaded account records.', 'Le PDF du rapport a été préparé à partir des enregistrements de compte actuellement chargés.'])}</Label></Panel> : null}{exportError ? <ErrorNotice code="REPORT_EXPORT_UNAVAILABLE" retry={() => { void exportPdf(); }} /> : null}
    {truncated ? <Panel><Label>{t(['??? ????? ??????? ???? ???????. ????? ??? ???????? ?????? ?????? ??? ?? ????? ????????.', 'This summary includes the first 800 records per section. Use Specialized reports to export all records.', 'Ce résumé inclut les 800 premières lignes par rubrique. Utilisez les rapports spécialisés pour tout exporter.'])}</Label></Panel> : null}
    {product === 'finance' ? <FinanceReportView report={report as FinanceReport} navigate={navigate} /> : <BusinessReportView report={report as BusinessReport} navigate={navigate} />}
  </ScrollView>;
}

function FinanceReportView({ report, navigate }: { report: FinanceReport; navigate: (screen: Screen) => void }) {
  const { t } = useUI();
  return <><Panel><Label large>{t(['بيانات الحساب المستخدمة', 'Account data used', 'Données du compte utilisées'])}</Label><Label>{t(['الدخل', 'Income', 'Revenus'])}: {report.incomeCount} · {t(['المصروفات', 'Expenses', 'Dépenses'])}: {report.expenseCount} · {t(['المدخرات', 'Savings', 'Épargne'])}: {report.savingsCount}</Label><Label>{t(['الديون', 'Debts', 'Dettes'])}: {report.debtCount} · {t(['الأهداف', 'Goals', 'Objectifs'])}: {report.goalCount}</Label>{report.undatedRecords ? <Label muted>{t(['???? ??????? ?? ??????? ????????? ???? ?????? ?? ????? ???????.', 'Records without a reporting date are not placed in the monthly totals.', "Les enregistrements sans date ne figurent pas dans les totaux mensuels."])}</Label> : null}</Panel>
    {report.currencies.map(row => <Panel key={row.currency}><Label large>{row.currency}</Label><Metric label={t(['الدخل المستلم', 'Received income', 'Revenus reçus'])} value={row.receivedIncome} currency={row.currency} /><Metric label={t(['الدخل المتوقع', 'Expected income', 'Revenus prévus'])} value={row.expectedIncome} currency={row.currency} /><Metric label={t(['المصروفات', 'Expenses', 'Dépenses'])} value={row.expenses} currency={row.currency} /><Metric label={t(['النقد بعد المصروفات', 'Cash after expenses', 'Trésorerie après dépenses'])} value={row.receivedIncome - row.expenses} currency={row.currency} /><Metric label={t(['الادخار المضاف', 'Savings added', 'Épargne ajout�e'])} value={row.savings} currency={row.currency} /><Metric label={t(['الديون المتبقية', 'Debt remaining', 'Dette restante'])} value={row.debtOutstanding} currency={row.currency} /></Panel>)}
    {!report.currencies.length ? <Panel><Label>{t(['?? ???? ?????? ?????? ???? ???? ????????.', 'No dated monetary records are available for this month.', 'Aucun enregistrement monétaire dat� n’est disponible pour ce mois.'])}</Label></Panel> : null}
    <Button label={t(['فتح الدخل', 'Open income', 'Ouvrir les revenus'])} onPress={() => navigate({ kind: 'records', resource: 'income' })} /><Button label={t(['فتح المصروفات', 'Open expenses', 'Ouvrir les dépenses'])} onPress={() => navigate({ kind: 'records', resource: 'expenses' })} /><Button label={t(['فتح المدخرات', 'Open savings', "Ouvrir l'Épargne"])} onPress={() => navigate({ kind: 'records', resource: 'savings' })} />
  </>;
}

function BusinessReportView({ report, navigate }: { report: BusinessReport; navigate: (screen: Screen) => void }) {
  const { t } = useUI();
  return <><Panel><Label large>{t(['سجلات العمليات', 'Operational records', 'Enregistrements opérationnels'])}</Label><Label>{t(['المشاريع', 'Projects', 'Projets'])}: {report.projectCount} · {t(['العملاء', 'Customers', 'Clients'])}: {report.customerCount} · {t(['الموردون', 'Suppliers', 'Fournisseurs'])}: {report.supplierCount}</Label><Label>{t(['الموظفون النشطون', 'Active employees', 'Employés actifs'])}: {report.employeeCount} · {t(['الفواتير المفتوحة', 'Open invoices', 'Factures ouvertes'])}: {report.openInvoiceCount}</Label>{report.undatedRecords ? <Label muted>{t(['???? ??????? ?? ??????? ????????? ???? ?????? ?? ????? ???????.', 'Records without a reporting date are not placed in the monthly totals.', "Les enregistrements sans date ne figurent pas dans les totaux mensuels."])}</Label> : null}</Panel>
    {report.currencies.map(row => <Panel key={row.currency}><Label large>{row.currency}</Label><Metric label={t(['المبيعات المكتملة', 'Completed sales', 'Ventes finalisées'])} value={row.completedSales} currency={row.currency} /><Metric label={t(['المبيعات المعلقة', 'Pending sales', 'Ventes en attente'])} value={row.pendingSales} currency={row.currency} /><Metric label={t(['المصروفات التشغيلية', 'Operating expenses', "Charges d'exploitation"])} value={row.operatingExpenses} currency={row.currency} /><Metric label={t(['صافي التشغيل', 'Operating net', "Solde d'exploitation"])} value={row.completedSales - row.operatingExpenses} currency={row.currency} /><Metric label={t(['الفواتير المدفوعة', 'Paid invoices', 'Factures payées'])} value={row.paidInvoices} currency={row.currency} /><Metric label={t(['الفواتير غير المدفوعة', 'Outstanding invoices', 'Factures impayées'])} value={row.outstandingInvoices} currency={row.currency} /><Metric label={t(['الفواتير المتأخرة', 'Overdue invoices', 'Factures en retard'])} value={row.overdueInvoices} currency={row.currency} /></Panel>)}
    {!report.currencies.length ? <Panel><Label>{t(['?? ???? ?????? ?????? ???? ???? ????????.', 'No dated monetary records are available for this month.', 'Aucun enregistrement monétaire dat� n’est disponible pour ce mois.'])}</Label></Panel> : null}
    <Button label={t(['فتح المبيعات', 'Open sales', 'Ouvrir les ventes'])} onPress={() => navigate({ kind: 'records', resource: 'sales' })} /><Button label={t(['الفواتير المفتوحة', 'Open invoices', 'Ouvrir les factures'])} onPress={() => navigate({ kind: 'records', resource: 'invoices' })} /><Button label={t(['فتح المصروفات التشغيلية', 'Open operating expenses', "Ouvrir les charges d'exploitation"])} onPress={() => navigate({ kind: 'records', resource: 'operating-expenses' })} />
  </>;
}

function Metric({ label, value, currency }: { label: string; value: number; currency: string }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Label muted>{label}</Label><Label>{formatValue(value)} {currency}</Label></View>;
}
