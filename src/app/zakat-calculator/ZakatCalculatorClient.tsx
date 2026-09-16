'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Calculator, ShieldCheck } from 'lucide-react';

const rate = 0.025;

export default function ZakatCalculatorClient() {
  const [cash, setCash] = useState('');
  const [gold, setGold] = useState('');
  const [investments, setInvestments] = useState('');
  const [receivables, setReceivables] = useState('');
  const [shortTermLiabilities, setShortTermLiabilities] = useState('');

  const result = useMemo(() => {
    const values = [cash, gold, investments, receivables, shortTermLiabilities].map(value => Number(value) || 0);
    const eligible = Math.max(0, values[0] + values[1] + values[2] + values[3] - values[4]);
    return { eligible, zakat: eligible * rate };
  }, [cash, gold, investments, receivables, shortTermLiabilities]);

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-8" dir="rtl">
      <div className="mb-8 flex items-start gap-3">
        <span className="rounded-2xl bg-primary/10 p-3 text-primary"><Calculator size={24} /></span>
        <div>
          <span className="text-sm font-semibold text-primary">أداة عامة مجانية</span>
          <h1 className="mt-1 text-3xl font-bold text-foreground md:text-4xl">حاسبة الزكاة</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">أدخل قيم أصولك الزكوية والالتزامات قصيرة الأجل. النتيجة تقديرية للتنظيم وليست فتوى شرعية.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="النقد والأرصدة" value={cash} onChange={setCash} />
        <Field label="الذهب والفضة بالقيمة الحالية" value={gold} onChange={setGold} />
        <Field label="الاستثمارات الخاضعة للزكاة" value={investments} onChange={setInvestments} />
        <Field label="الديون المرجو تحصيلها" value={receivables} onChange={setReceivables} />
        <Field label="الالتزامات قصيرة الأجل القابلة للخصم" value={shortTermLiabilities} onChange={setShortTermLiabilities} />
      </div>

      <div className="mt-7 grid gap-4 rounded-2xl border border-border bg-muted/35 p-5 md:grid-cols-2">
        <div>
          <span className="text-sm text-muted-foreground">صافي الوعاء الزكوي</span>
          <strong className="mt-1 block text-2xl text-foreground">{result.eligible.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">الزكاة التقديرية 2.5%</span>
          <strong className="mt-1 block text-2xl text-primary">{result.zakat.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-primary/5 p-4 text-sm leading-7 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2"><ShieldCheck size={18} /> لا نحفظ القيم المدخلة في هذه الحاسبة العامة.</span>
        <Link href="/login?mode=register&next=%2Fzakat" className="font-semibold text-primary hover:underline">احفظ وتتبع زكاتك داخل THE SFM</Link>
      </div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input
        inputMode="decimal"
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-12 rounded-xl border border-input bg-background px-3 text-base outline-none focus:border-primary"
        placeholder="0"
      />
    </label>
  );
}
