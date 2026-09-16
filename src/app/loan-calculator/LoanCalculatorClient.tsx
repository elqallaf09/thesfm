'use client';

import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';

function number(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export default function LoanCalculatorClient() {
  const [amount, setAmount] = useState('10000');
  const [annualRate, setAnnualRate] = useState('5');
  const [years, setYears] = useState('5');

  const result = useMemo(() => {
    const principal = number(amount);
    const months = Math.max(1, Math.floor(number(years) * 12));
    const monthlyRate = number(annualRate) / 100 / 12;
    const monthlyPayment = monthlyRate === 0
      ? principal / months
      : principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
    const total = monthlyPayment * months;
    return { monthlyPayment, total, interest: Math.max(0, total - principal) };
  }, [amount, annualRate, years]);

  return (
    <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-[var(--shadow-sm)] md:p-8" dir="rtl">
      <div className="mb-8 flex items-start gap-3">
        <span className="rounded-[var(--radius-card)] bg-primary/10 p-3 text-primary"><Calculator size={24} /></span>
        <div>
          <span className="text-sm font-semibold text-primary">أداة عامة مجانية</span>
          <h1 className="mt-1 text-3xl font-bold text-foreground md:text-4xl">حاسبة القرض</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">احسب القسط الشهري وإجمالي التكلفة حسب المبلغ والمدة ومعدل الفائدة. الأرقام تقديرية وقد تختلف عن عرض البنك الفعلي.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="مبلغ القرض" value={amount} onChange={setAmount} />
        <Field label="الفائدة السنوية %" value={annualRate} onChange={setAnnualRate} />
        <Field label="المدة بالسنوات" value={years} onChange={setYears} />
      </div>

      <div className="mt-7 grid gap-4 rounded-[var(--radius-card)] border border-border bg-muted/35 p-5 sm:grid-cols-3">
        <Result label="القسط الشهري" value={result.monthlyPayment} primary />
        <Result label="إجمالي السداد" value={result.total} />
        <Result label="إجمالي الفائدة" value={result.interest} />
      </div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-sm font-medium text-foreground"><span>{label}</span><input type="number" inputMode="decimal" min="0" step="0.01" value={value} onChange={event => onChange(event.target.value)} className="h-12 rounded-[var(--radius-control)] border border-input bg-background px-3 text-base outline-none focus:border-primary" /></label>;
}

function Result({ label, value, primary }: { label: string; value: number; primary?: boolean }) {
  return <div><span className="text-sm text-muted-foreground">{label}</span><strong className={`mt-1 block text-xl ${primary ? 'text-primary' : 'text-foreground'}`}>{value.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></div>;
}
