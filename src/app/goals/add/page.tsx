'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Target } from 'lucide-react';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { recordAccountActivity } from '@/lib/accountActivity';
import { moneyNumber, normalizeNumberInput } from '@/lib/money';

const DURATIONS = [
  { value: '3', ar: '3 أشهر', en: '3 months', fr: '3 mois' },
  { value: '6', ar: '6 أشهر', en: '6 months', fr: '6 mois' },
  { value: '12', ar: 'سنة', en: '1 year', fr: '1 an' },
  { value: '24', ar: 'سنتان', en: '2 years', fr: '2 ans' },
];

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AddGoalPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { dir, lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState('');
  const [amount, setAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [duration, setDuration] = useState('12');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const text = (ar: string, en: string, fr = en) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;

  const formatAmount = (value: string) => {
    const clean = normalizeNumberInput(value);
    const parts = clean.split('.');
    return parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 3)}` : clean;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    if (supabaseConfigError) {
      setMessage(supabaseConfigError);
      return;
    }
    if (!user) {
      setMessage(text('سجل الدخول لحفظ الهدف', 'Sign in to save this goal', 'Connectez-vous pour enregistrer cet objectif'));
      return;
    }

    const targetValue = moneyNumber(amount, 0);
    const currentValue = moneyNumber(currentAmount, 0);
    const monthlyValue = moneyNumber(monthlyContribution, 0);

    if (!goal.trim() || targetValue <= 0) {
      setMessage(text('أدخل اسم الهدف والمبلغ المستهدف', 'Enter goal name and target amount', "Saisissez le nom de l'objectif et le montant cible"));
      return;
    }
    if (currentValue < 0 || monthlyValue < 0) {
      setMessage(text('أدخل مبالغ موجبة فقط', 'Enter positive amounts only', 'Saisissez uniquement des montants positifs'));
      return;
    }
    if (currentValue > targetValue) {
      setMessage(text('المبلغ الحالي لا يمكن أن يتجاوز الهدف', 'Current saved amount cannot exceed the target', 'Le montant actuel ne peut pas dépasser la cible'));
      return;
    }

    setSaving(true);
    const targetDate = formatDateInput(addMonths(new Date(), Number(duration) || 0));
    const goalNotes = JSON.stringify({
      currentAmount: currentValue,
      monthlyContribution: monthlyValue,
      deadline: targetDate,
      currency: 'KWD',
      description: notes.trim() || null,
    });
    const payload = {
      user_id: user.id,
      goal: goal.trim(),
      title: goal.trim(),
      name: goal.trim(),
      amount: targetValue,
      target_amount: targetValue,
      current_amount: currentValue,
      saved_amount: currentValue,
      progress_amount: currentValue,
      monthly_contribution: monthlyValue,
      target_date: targetDate,
      currency: 'KWD',
      duration,
      duration_unit: 'month',
      notes: goalNotes,
    };

    let result = await supabase.from('financial_goals').insert(payload);
    if (result.error && /title|name|target_amount|saved_amount|progress_amount|monthly_contribution|target_date|currency|column|schema|PGRST/i.test(result.error.message)) {
      result = await supabase.from('financial_goals').insert({
        user_id: user.id,
        goal: goal.trim(),
        amount: targetValue,
        current_amount: currentValue,
        duration,
        duration_unit: 'month',
        notes: goalNotes,
      });
    }
    if (result.error && /current_amount|column|schema|PGRST/i.test(result.error.message)) {
      result = await supabase.from('financial_goals').insert({
        user_id: user.id,
        goal: goal.trim(),
        amount: targetValue,
        duration,
        duration_unit: 'month',
        notes: goalNotes,
      });
    }
    setSaving(false);

    if (result.error) {
      setMessage(result.error.message || text('تعذر حفظ الهدف', 'Could not save goal', "Impossible d'enregistrer l'objectif"));
      return;
    }

    void recordAccountActivity(supabase, {
      userId: user.id,
      eventType: 'goal_added',
      entityType: 'financial_goal',
      metadata: {
        source: 'goals_add_page',
      },
    }).catch(error => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[account-activity] goal insert failed', {
          userId: user.id,
          error,
        });
      }
    });

    setGoal('');
    setAmount('');
    setCurrentAmount('');
    setMonthlyContribution('');
    setNotes('');
    setMessage(text('تم حفظ الهدف بنجاح', 'Goal saved', 'Objectif enregistré'));
    window.setTimeout(() => router.push('/goals'), 900);
  };

  if (authLoading || !mounted) {
    return <main className="page" dir={dir}><div className="spinner" /></main>;
  }

  return (
    <main className="page" dir={dir}>
      <section className="card">
        <header className="top">
          <button type="button" className="back" onClick={() => router.back()}>
            <ArrowLeft size={17} />
            {text('رجوع', 'Back', 'Retour')}
          </button>
          <LanguageSwitcher variant="gold" />
        </header>

        <div className="hero">
          <div className="mark"><Target size={30} /></div>
          <div>
            <h1>{text('إضافة هدف مالي', 'Add Financial Goal', 'Ajouter un objectif financier')}</h1>
            <p>{text('حوّل هدفك إلى مبلغ واضح ومدة زمنية قابلة للمتابعة.', 'Turn your target into a clear amount and timeline.', 'Transformez votre cible en montant clair et en calendrier suivi.')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label>{text('اسم الهدف', 'Goal name', "Nom de l'objectif")}</label>
          <input value={goal} onChange={event => setGoal(event.target.value)} placeholder={text('مثال: صندوق الطوارئ', 'Example: Emergency fund', "Exemple : fonds d'urgence")} />

          <label>{text('المبلغ المستهدف', 'Target amount', 'Montant cible')}</label>
          <input value={amount} onChange={event => setAmount(formatAmount(event.target.value))} inputMode="decimal" placeholder="0.000" dir="ltr" />

          <label>{text('المبلغ المدخر حالياً', 'Current saved amount', 'Montant actuellement épargné')}</label>
          <input value={currentAmount} onChange={event => setCurrentAmount(formatAmount(event.target.value))} inputMode="decimal" placeholder="0.000" dir="ltr" />

          <label>{text('المساهمة الشهرية', 'Monthly contribution', 'Contribution mensuelle')}</label>
          <input value={monthlyContribution} onChange={event => setMonthlyContribution(formatAmount(event.target.value))} inputMode="decimal" placeholder="0.000" dir="ltr" />

          <label>{text('المدة', 'Timeline', 'Calendrier')}</label>
          <div className="durations">
            {DURATIONS.map(item => (
              <button key={item.value} type="button" className={duration === item.value ? 'duration active' : 'duration'} onClick={() => setDuration(item.value)}>
                {lang === 'ar' ? item.ar : lang === 'fr' ? item.fr : item.en}
              </button>
            ))}
          </div>

          <label>{text('ملاحظات', 'Notes', 'Notes')}</label>
          <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder={text('اختياري', 'Optional', 'Facultatif')} />

          {message && <div className={message.includes('تم') || message.includes('saved') || message.includes('enregistré') ? 'msg ok' : 'msg'}>{message}</div>}

          <button type="submit" className="save" disabled={saving}>
            <Save size={17} />
            {saving ? text('جاري الحفظ...', 'Saving...', 'Enregistrement...') : text('حفظ الهدف', 'Save Goal', "Enregistrer l'objectif")}
          </button>
        </form>
      </section>

      <style jsx>{`
        .page{min-height:100vh;background:linear-gradient(180deg,var(--sfm-light-card),var(--sfm-card));display:grid;place-items:center;padding:24px;font-family:Tajawal,Arial,sans-serif;color:var(--sfm-foreground)}
        .card{width:min(100%,620px);background:var(--sfm-card);border:1px solid rgba(167,243,240,.16);border-radius:var(--r-2xl);box-shadow:0 24px 70px rgba(3,18,37,.12);padding:24px}
        .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.back{height:40px;border-radius:var(--r-md);border:1px solid rgba(167,243,240,.22);background:#FFFFFF;color:var(--sfm-muted);display:inline-flex;align-items:center;gap:8px;padding:0 14px;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer}
        .hero{display:flex;gap:16px;align-items:center;background:linear-gradient(135deg,var(--sfm-foreground),var(--sfm-primary-dark));border-radius:var(--r-2xl);padding:22px;color:#fff;margin-bottom:20px}.mark{width:58px;height:58px;border-radius:var(--r-xl);background:rgba(167,243,240,.14);color:var(--sfm-soft-cyan);display:grid;place-items:center;flex:0 0 auto}.hero h1{margin:0 0 8px;font-size:28px}.hero p{margin:0;color:rgba(255,255,255,.68);line-height:1.7}
        form{display:grid;gap:12px}label{font-size:13px;font-weight:900;color:var(--sfm-muted)}input,textarea{border-radius:var(--r-md);border:1.5px solid rgba(167,243,240,.22);background:rgba(247,243,234,.7);padding:0 13px;font:800 15px Tajawal,Arial,sans-serif;outline:none;color:var(--sfm-foreground)}input{height:var(--control-h-lg)}textarea{min-height:86px;padding-top:12px;resize:vertical}input:focus,textarea:focus{border-color:var(--sfm-soft-cyan);box-shadow:0 0 0 4px rgba(167,243,240,.14)}
        .durations{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.duration{min-height:44px;border:1px solid rgba(167,243,240,.2);border-radius:var(--r-md);background:#FFFFFF;color:var(--sfm-muted);font:800 13px Tajawal,Arial,sans-serif;cursor:pointer}.duration.active{background:rgba(167,243,240,.16);border-color:var(--sfm-soft-cyan);color:var(--sfm-foreground)}
        .save{height:54px;border:0;border-radius:var(--r-lg);background:linear-gradient(135deg,var(--sfm-foreground),var(--sfm-primary-dark),var(--sfm-soft-cyan));color:#fff;font:900 15px Tajawal,Arial,sans-serif;display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;margin-top:8px}.save:disabled{opacity:.6;cursor:wait}.msg{border-radius:var(--r-md);padding:11px 13px;background:rgba(239,68,68,.08);color:#B91C1C;font-size:13px;font-weight:800}.msg.ok{background:rgba(34,197,94,.08);color:#15803D}.spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(167,243,240,.22);border-top-color:var(--sfm-soft-cyan);animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:620px){.durations{grid-template-columns:1fr 1fr}.hero{align-items:flex-start;flex-direction:column}}
      `}</style>
    </main>
  );
}
