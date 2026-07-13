'use client';

import { useState } from 'react';
import { Check, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { INCOME_CATEGORIES } from '@/lib/income-categories';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency } from '@/lib/locale';
import { moneyNumber, normalizeNumberInput } from '@/lib/money';

interface IncomeSourcesFormProps {
  userId: string;
  username: string;
  onComplete: () => Promise<void> | void;
}

export function IncomeSourcesForm({ userId, username, onComplete }: IncomeSourcesFormProps) {
  const { t, lang, dir } = useLanguage();
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
      setError(t('income_sources_required'));
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
      setError(t('income_sources_save_error'));
      return;
    }

    await onComplete();
  };

  return (
    <main dir={dir} className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground [font-family:var(--font-ui)]">
      <div className="relative w-full max-w-none space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-success">{t('income_sources_welcome')} {username || t('income_sources_you')}</p>
          <h1 className="text-3xl font-semibold text-foreground">{t('income_sources_title')}</h1>
          <p className="text-muted-foreground">{t('income_sources_description')}</p>
        </div>

        <Card className="border-border bg-card/90 shadow-card backdrop-blur-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-semibold text-foreground">
              <Coins className="h-6 w-6" />
              {t('income_sources_form_title')}
            </CardTitle>
            <CardDescription>{t('income_sources_optional_hint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && <div className="rounded-[var(--radius-card)] border border-danger bg-danger-soft p-3 text-sm text-danger">{error}</div>}
            <div className="grid gap-4 md:grid-cols-2">
              {INCOME_CATEGORIES.map((category) => (
                <section key={category.id} className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-foreground shadow-card">
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-semibold text-foreground">{t(`income_category_${category.id}`)}</h2>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {t(`income_category_${category.id}_examples`).split('|').map((example) => (
                        <span key={example} className="rounded-[var(--radius-pill)] bg-accent-soft px-2 py-1 text-xs text-foreground-secondary">{example}</span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={category.id}>{t('income_sources_monthly_amount')}</Label>
                      <Input
                        id={category.id}
                        value={amounts[category.id] || ''}
                        onChange={(event) => setAmounts((current) => ({ ...current, [category.id]: normalizeNumberInput(event.target.value) }))}
                        placeholder="0.00"
                        className="h-12 text-center text-lg font-semibold [font-family:var(--font-data)]"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <div className="rounded-[var(--radius-card)] border border-primary bg-primary-soft p-5 text-center">
              <span className="text-sm text-foreground-secondary">{t('income_sources_total')}</span>
              <p className="text-4xl font-semibold text-foreground [font-family:var(--font-data)]">{formatCurrency(totalIncome, 'KWD', lang)}</p>
            </div>

            <Button onClick={saveSources} disabled={saving} className="h-12 w-full bg-primary text-base text-primary-foreground hover:bg-primary-hover">
              <Check className="h-5 w-5" />
              {saving ? t('income_sources_saving') : t('income_sources_save_continue')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
