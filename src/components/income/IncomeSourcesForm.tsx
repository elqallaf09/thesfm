'use client';

import { useState } from 'react';
import { Check, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { INCOME_CATEGORIES } from '@/lib/income-categories';
import { moneyNumber } from '@/lib/money';

interface IncomeSourcesFormProps {
  userId: string;
  username: string;
  onComplete: () => Promise<void> | void;
}

export function IncomeSourcesForm({ userId, username, onComplete }: IncomeSourcesFormProps) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totalIncome = INCOME_CATEGORIES.reduce((sum, category) => {
    const amount = moneyNumber(amounts[category.id], 0);
    return sum + amount;
  }, 0);

  const saveSources = async () => {
    setError('');
    if (totalIncome <= 0) {
      setError('أدخل مبلغاً واحداً على الأقل من أنواع الدخل الشهري');
      return;
    }

    setSaving(true);
    await supabase.from('monthly_income_sources').delete().eq('user_id', userId);

    const rows = INCOME_CATEGORIES.map((category) => ({
      user_id: userId,
      category: category.id,
      label: category.nameAr,
      amount: moneyNumber(amounts[category.id], 0),
    })).filter((row) => row.amount > 0);

    const { error: insertError } = await supabase.from('monthly_income_sources').insert(rows);
    setSaving(false);

    if (insertError) {
      setError(insertError.message || 'تعذر حفظ أنواع الدخل');
      return;
    }

    await onComplete();
  };

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#f7faf7_0%,_#eef6ef_42%,_#dfeee7_100%)] px-4 py-8 dark:bg-[linear-gradient(135deg,_#07110d_0%,_#0d1d16_48%,_var(--sfm-foreground)827_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(120deg,rgba(0,96,72,0.10)_0,rgba(0,96,72,0.10)_1px,transparent_1px,transparent_42px),linear-gradient(160deg,rgba(187,151,82,0.12)_0,rgba(187,151,82,0.12)_1px,transparent_1px,transparent_68px)] dark:opacity-20" />
      <div className="relative mx-auto max-w-5xl space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">مرحباً {username || 'بك'}</p>
          <h1 className="text-3xl font-bold text-emerald-950 dark:text-emerald-100">أنواع الدخل الشهري</h1>
          <p className="text-muted-foreground">اختر مصادر دخلك وأدخل قيمة كل مصدر ليتم حساب دخلك الشهري بدقة.</p>
        </div>

        <Card className="border-border bg-card/90 shadow-[0_24px_80px_rgba(0,66,54,0.14)] backdrop-blur-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
              <Coins className="h-6 w-6" />
              تعبئة المدخول الشهري
            </CardTitle>
            <CardDescription>يمكنك ترك أي نوع دخل لا ينطبق عليك بقيمة فارغة.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
            <div className="grid gap-4 md:grid-cols-2">
              {INCOME_CATEGORIES.map((category) => (
                <section key={category.id} className="rounded-2xl border border-border bg-card/90 p-4 text-card-foreground">
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-bold text-emerald-950 dark:text-emerald-100">{category.nameAr}</h2>
                      <p className="text-xs text-muted-foreground">{category.nameEn}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {category.examples.map((example) => (
                        <span key={example} className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">{example}</span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={category.id}>المبلغ الشهري</Label>
                      <Input
                        id={category.id}
                        value={amounts[category.id] || ''}
                        onChange={(event) => setAmounts((current) => ({ ...current, [category.id]: event.target.value }))}
                        placeholder="0.00"
                        className="h-12 text-center text-lg font-bold"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-center dark:border-emerald-800 dark:bg-emerald-950/40">
              <span className="text-sm text-emerald-700 dark:text-emerald-300">إجمالي المدخول الشهري</span>
              <p className="text-4xl font-bold text-emerald-900 dark:text-emerald-100">{totalIncome.toLocaleString('ar-SA')} د.ك</p>
            </div>

            <Button onClick={saveSources} disabled={saving} className="h-12 w-full bg-emerald-700 text-base hover:bg-emerald-800">
              <Check className="h-5 w-5" />
              {saving ? 'جار الحفظ...' : 'حفظ والمتابعة'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
