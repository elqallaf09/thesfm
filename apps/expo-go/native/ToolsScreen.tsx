import { useCallback, useEffect, useState } from 'react';
import { Share, Switch, Text, View } from 'react-native';
import { accountSummary, message, product } from './api';
import { shortcuts, type Row } from './catalog';
import { openScreen } from './navigation';
import { normalizeNumber } from './records';
import { Button, Busy, Card, Copy, ErrorNote, Input, Page, s, Title } from './ui';

const labels: Record<string, string> = {
  monthlyIncome: 'الدخل الشهري', monthlyExpenses: 'المصروفات الشهرية', monthlyNet: 'صافي الشهر', trackedPosition: 'المركز المالي', activeDebtCount: 'الالتزامات النشطة',
  projectCount: 'المشاريع', customerCount: 'العملاء', supplierCount: 'الموردون', activeEmployeeCount: 'الموظفون النشطون', invoiceCount: 'الفواتير', openInvoiceCount: 'الفواتير المفتوحة', overdueInvoiceCount: 'الفواتير المتأخرة', outstandingInvoiceAmount: 'المبالغ المستحقة', monthlySales: 'مبيعات الشهر', monthlyOperatingExpenses: 'مصروفات التشغيل', monthlyOperatingNet: 'صافي التشغيل',
};
export function ReportsScreen({ path }: { path: string }) {
  const [summary, setSummary] = useState<Row | null>(null); const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try { const body = await accountSummary<Row>(); if (!body.ok) throw new Error('تعذر تحميل التقرير'); setSummary(body.summary); }
    catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const title = path === '/income/month-close' ? 'مراجعة الشهر' : path === '/decisions' ? 'مراجعة مؤشرات الأعمال' : 'تقرير الحساب';
  const values = Object.entries(labels).filter(([key]) => summary && key in summary).map(([key, label]) => {
    const value = summary?.[key];
    const count = key.endsWith('Count');
    return [label, value == null || (!count && !summary?.currency) ? '—' : `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 3 })}${count ? '' : ` ${summary?.currency}`}`];
  });
  return <Page><Title>{title}</Title><Copy>الشهر الحالي · {new Date().toLocaleDateString('ar-KW-u-nu-latn', { year: 'numeric', month: 'long' })}</Copy><ErrorNote text={error} /><Button title="تحديث التقرير" secondary onPress={() => { void load(); }} disabled={busy} />{busy ? <Busy /> : null}
    {values.map(([label, value]) => <Card key={label}><Copy>{label}</Copy><Title>{value}</Title></Card>)}
    {summary ? <Button title="مشاركة التقرير" onPress={() => { void Share.share({ message: [`THE SFM — ${title}`, new Date().toLocaleDateString('en-GB'), ...values.map(([label, value]) => `${label}: ${value}`)].join('\n') }); }} /> : null}
    <Copy>المجاميع من خدمة ملخص الحساب. راجع السجلات للتفاصيل؛ علامة — تعني أن القيمة غير متاحة.</Copy>
    {shortcuts[product].slice(0, 4).map(([target, label]) => <Button key={target} title={`فتح ${label}`} secondary onPress={() => openScreen(target)} />)}
  </Page>;
}
export function ZakatScreen() {
  const [cash, setCash] = useState(''); const [liabilities, setLiabilities] = useState('0'); const [nisab, setNisab] = useState(''); const [currency, setCurrency] = useState('KWD'); const [year, setYear] = useState(false);
  const [result, setResult] = useState<string | null>(null); const [error, setError] = useState('');
  function calculate() {
    setError(''); setResult(null);
    const values = [cash, liabilities, nisab].map(normalizeNumber);
    if (values.some(value => !/^\d+(\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) || Number(values[2]) <= 0 || !/^[A-Za-z]{3}$/.test(currency)) { setError('أدخل مبالغ صحيحة ونصاباً موجباً وعملة واحدة للحساب'); return; }
    const net = Math.max(0, Number(values[0]) - Number(values[1]));
    setResult(!year ? 'لم تؤكد اكتمال الحول؛ لا تُحتسب زكاة مستحقة هنا.' : net < Number(values[2]) ? 'المبلغ أقل من النصاب الذي أدخلته.' : `التقدير: ${(net * .025).toLocaleString('en-US', { maximumFractionDigits: 3 })} ${currency.toUpperCase()}`);
  }
  const reset = (fn: (v: string) => void) => (value: string) => { fn(value); setResult(null); };
  return <Page><Title>حاسبة الزكاة</Title><Copy>حساب نقدي مبسط بنسبة 2.5% بعد بلوغ النصاب واكتمال الحول الهجري. أدخل جميع المبالغ بنفس العملة والنصاب الذي تعتمد عليه.</Copy><Input label="الأموال الخاضعة للزكاة" numeric value={cash} onChange={reset(setCash)} /><Input label="الالتزامات القابلة للخصم" numeric value={liabilities} onChange={reset(setLiabilities)} /><Input label="قيمة النصاب" numeric value={nisab} onChange={reset(setNisab)} /><Input label="العملة" value={currency} onChange={reset(setCurrency)} /><View style={s.row}><Text style={s.label}>اكتمل الحول الهجري</Text><Switch accessibilityLabel="اكتمل الحول الهجري" value={year} onValueChange={value => { setYear(value); setResult(null); }} /></View><ErrorNote text={error} /><Button title="احسب" onPress={calculate} />{result ? <Card><Title>{result}</Title></Card> : null}</Page>;
}
