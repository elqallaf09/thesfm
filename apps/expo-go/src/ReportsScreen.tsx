import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { MobilePage, MobileRecord, PhoneProduct } from '../../../src/lib/mobile/resourceContract';
import { useAccountSync } from './accountSync';
import type { Screen } from './navigation';
import { MobileRequestError, type MobileSessionClient } from './session';
import { Button, Busy, ErrorNotice, Label, Panel, formatValue, useUI } from './ui';
import { businessReport, financeReport, shiftReportPeriod, type BusinessReport, type FinanceReport } from './workspaceReports';

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
  const { t } = useUI(); const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState<Loaded>({}); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [truncated, setTruncated] = useState(false); const sequence = useRef(0);
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
  return <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 24 }}><Label large>{t(product === 'finance' ? ['???? ????????', 'Reports Center', 'Centre des rapports'] : ['???? ??????? ???????', 'Business operations', "Op�rations d'entreprise"])}</Label><Label muted>{t(['???? ?????? ?????? ??? ?? ????? ?????? ???????? ?????? ????????.', 'This native monthly view uses only records in your account; currencies stay separate.', 'Cette vue mensuelle native utilise uniquement les enregistrements de votre compte ; les devises restent distinctes.'])}</Label>
    <Panel><Label>{t(['??????', 'Reporting month', 'Mois du rapport'])}: {period}</Label><View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button label={t(['?????? ???????', 'Previous month', 'Mois pr�c�dent'])} onPress={() => movePeriod(-1)} disabled={busy} /></View><View style={{ flex: 1 }}><Button label={t(['?????? ???????', 'Next month', 'Mois suivant'])} onPress={() => movePeriod(1)} disabled={busy} /></View></View><Button label={t(['????? ????????', 'Refresh from my account', 'Actualiser depuis mon compte'])} onPress={() => { void load(); }} disabled={busy} /></Panel>
    {error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}{busy && !Object.keys(records).length ? <Busy /> : null}
    {truncated ? <Panel><Label>{t(['??? ????? ??????? ???? ???????. ????? ??? ???????? ?????? ?????? ??? ?? ????? ????????.', 'Only the first 800 records per section are included. Narrow the month or review the detailed section for more.', 'Seuls les 800 premiers enregistrements par section sont inclus. Affinez le mois ou consultez la section d�taill�e.'])}</Label></Panel> : null}
    {product === 'finance' ? <FinanceReportView report={report as FinanceReport} navigate={navigate} /> : <BusinessReportView report={report as BusinessReport} navigate={navigate} />}
  </ScrollView>;
}

function FinanceReportView({ report, navigate }: { report: FinanceReport; navigate: (screen: Screen) => void }) {
  const { t } = useUI();
  return <><Panel><Label large>{t(['?????? ??????', 'Account data used', 'Donn�es du compte utilis�es'])}</Label><Label>{t(['??????', 'Income', 'Revenus'])}: {report.incomeCount} · {t(['?????????', 'Expenses', 'D�penses'])}: {report.expenseCount} · {t(['????????', 'Savings', '�pargne'])}: {report.savingsCount}</Label><Label>{t(['??????', 'Debts', 'Dettes'])}: {report.debtCount} · {t(['???????', 'Goals', 'Objectifs'])}: {report.goalCount}</Label>{report.undatedRecords ? <Label muted>{t(['???? ??????? ?? ??????? ????????? ???? ?????? ?? ????? ???????.', 'Records without a reporting date are not placed in the monthly totals.', "Les enregistrements sans date ne figurent pas dans les totaux mensuels."])}</Label> : null}</Panel>
    {report.currencies.map(row => <Panel key={row.currency}><Label large>{row.currency}</Label><Metric label={t(['????? ???????', 'Received income', 'Revenus re�us'])} value={row.receivedIncome} currency={row.currency} /><Metric label={t(['????? ????????', 'Expected income', 'Revenus pr�vus'])} value={row.expectedIncome} currency={row.currency} /><Metric label={t(['?????????', 'Expenses', 'D�penses'])} value={row.expenses} currency={row.currency} /><Metric label={t(['?????? ????? ???????', 'Cash after expenses', 'Tr�sorerie apr�s d�penses'])} value={row.receivedIncome - row.expenses} currency={row.currency} /><Metric label={t(['????????', 'Savings added', '�pargne ajout�e'])} value={row.savings} currency={row.currency} /><Metric label={t(['??? ??????', 'Debt remaining', 'Dette restante'])} value={row.debtOutstanding} currency={row.currency} /></Panel>)}
    {!report.currencies.length ? <Panel><Label>{t(['?? ???? ?????? ?????? ???? ???? ????????.', 'No dated monetary records are available for this month.', 'Aucun enregistrement mon�taire dat� n’est disponible pour ce mois.'])}</Label></Panel> : null}
    <Button label={t(['??? ??????', 'Open income', 'Ouvrir les revenus'])} onPress={() => navigate({ kind: 'records', resource: 'income' })} /><Button label={t(['??? ?????????', 'Open expenses', 'Ouvrir les d�penses'])} onPress={() => navigate({ kind: 'records', resource: 'expenses' })} /><Button label={t(['??? ???????', 'Open savings', "Ouvrir l'�pargne"])} onPress={() => navigate({ kind: 'records', resource: 'savings' })} />
  </>;
}

function BusinessReportView({ report, navigate }: { report: BusinessReport; navigate: (screen: Screen) => void }) {
  const { t } = useUI();
  return <><Panel><Label large>{t(['?????? ????????', 'Operational records', 'Enregistrements op�rationnels'])}</Label><Label>{t(['????????', 'Projects', 'Projets'])}: {report.projectCount} · {t(['???????', 'Customers', 'Clients'])}: {report.customerCount} · {t(['????????', 'Suppliers', 'Fournisseurs'])}: {report.supplierCount}</Label><Label>{t(['???????? ????????', 'Active employees', 'Employ�s actifs'])}: {report.employeeCount} · {t(['???????? ????????', 'Open invoices', 'Factures ouvertes'])}: {report.openInvoiceCount}</Label>{report.undatedRecords ? <Label muted>{t(['???? ??????? ?? ??????? ????????? ???? ?????? ?? ????? ???????.', 'Records without a reporting date are not placed in the monthly totals.', "Les enregistrements sans date ne figurent pas dans les totaux mensuels."])}</Label> : null}</Panel>
    {report.currencies.map(row => <Panel key={row.currency}><Label large>{row.currency}</Label><Metric label={t(['???????? ????????', 'Completed sales', 'Ventes finalis�es'])} value={row.completedSales} currency={row.currency} /><Metric label={t(['????????? ???????', 'Pending sales', 'Ventes en attente'])} value={row.pendingSales} currency={row.currency} /><Metric label={t(['???????? ????????', 'Operating expenses', "Charges d'exploitation"])} value={row.operatingExpenses} currency={row.currency} /><Metric label={t(['???? ???????', 'Operating net', "Solde d'exploitation"])} value={row.completedSales - row.operatingExpenses} currency={row.currency} /><Metric label={t(['???????? ??????????', 'Paid invoices', 'Factures pay�es'])} value={row.paidInvoices} currency={row.currency} /><Metric label={t(['???????? ????????', 'Outstanding invoices', 'Factures impay�es'])} value={row.outstandingInvoices} currency={row.currency} /><Metric label={t(['???????? ????????', 'Overdue invoices', 'Factures en retard'])} value={row.overdueInvoices} currency={row.currency} /></Panel>)}
    {!report.currencies.length ? <Panel><Label>{t(['?? ???? ?????? ?????? ???? ???? ????????.', 'No dated monetary records are available for this month.', 'Aucun enregistrement mon�taire dat� n’est disponible pour ce mois.'])}</Label></Panel> : null}
    <Button label={t(['??? ????????', 'Open sales', 'Ouvrir les ventes'])} onPress={() => navigate({ kind: 'records', resource: 'sales' })} /><Button label={t(['??? ?????????', 'Open invoices', 'Ouvrir les factures'])} onPress={() => navigate({ kind: 'records', resource: 'invoices' })} /><Button label={t(['??? ????????? ????????', 'Open operating expenses', "Ouvrir les charges d'exploitation"])} onPress={() => navigate({ kind: 'records', resource: 'operating-expenses' })} />
  </>;
}

function Metric({ label, value, currency }: { label: string; value: number; currency: string }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Label muted>{label}</Label><Label>{formatValue(value)} {currency}</Label></View>;
}
