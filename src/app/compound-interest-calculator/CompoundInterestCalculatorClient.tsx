'use client';

import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';

function number(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export default function CompoundInterestCalculatorClient() {
  const [principal, setPrincipal] = useState('1000');
  const [monthlyContribution, setMonthlyContribution] = useState('100');
  const [annualRate, setAnnualRate] = useState('5');
  const [years, setYears] = useState('10');

  const result = useMemo(() => {
    const start = number(principal);
    const monthly = number(monthlyContribution);
    const rate = number(annualRate) / 100 / 12;
    const months = Math.max(0, Math.floor(number(years) * 12));
    let balance = start;
    for (let month = 0; month < months; month += 1) {
      balance = balance * (1 + rate) + monthly;
    }
    const contributed = start + monthly * months;
    return { balance, contributed, growth: Math.max(0, balance - contributed) };
  }, [principal, monthlyContribution, annualRate, years]);

  return (
    <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-[var(--shadow-sm)] md:p-8" dir="rtl">
      <div className="mb-8 flex items-start gap-3">
        <span className="rounded-[var(--radius-card)] bg-primary/10 p-3 text-primary"><TrendingUp size={24} /></span>
        <div>
          <span className="text-sm font-semibold text-primary">أداة عامة مجانية</span>
          <h1 className="mt-1 text-3xl font-bold text-foreground md:text-4xl">حاسبة الفائدة المركبة</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">شاهد أثر الوقت والمساهمات الدورية على نمو رأس المال. النتيجة تعليمية وليست وعداً بعائد استثماري.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="رأس المال الابتدائي" value={principal} onChange={setPrincipal} />
        <Field label="المساهمة الشهرية" value={monthlyContribution} onChange={setMonthlyContribution} />
        <Field label="العائد السنوي المفترض %" value={annualRate} onChange={setAnnualRate} />
        <Field label="عدد السنوات" value={years} onChange={setYears} />
      </div>

      <div className="mt-7 grid gap-4 rounded-[var(--radius-card)] border border-border bg-muted/35 p-5 sm:grid-cols-3">
        <Result label="القيمة النهائية" value={result.balance} />
        <Result label="إجمالي المساهمات" value={result.contributed} />
        <Result label="النمو المحسوب" value={result.growth} primary />
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
