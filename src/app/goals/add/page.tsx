'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Target } from 'lucide-react';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const DURATIONS = [
  { value: '3', ar: '3 أشهر', en: '3 months' },
  { value: '6', ar: '6 أشهر', en: '6 months' },
  { value: '12', ar: 'سنة', en: '1 year' },
  { value: '24', ar: 'سنتان', en: '2 years' },
];

export default function AddGoalPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { dir, isAr } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('12');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatAmount = (value: string) => {
    const clean = value.replace(/[^\d.]/g, '');
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
      setMessage(isAr ? 'سجل الدخول لحفظ الهدف' : 'Sign in to save this goal');
      return;
    }
    if (!goal.trim() || !amount || Number(amount) <= 0) {
      setMessage(isAr ? 'أدخل اسم الهدف والمبلغ المستهدف' : 'Enter goal name and target amount');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('financial_goals').insert({
      user_id: user.id,
      goal: goal.trim(),
      amount: Number(amount),
      duration,
      duration_unit: 'month',
      notes: notes.trim() || null,
    });
    setSaving(false);

    if (error) {
      setMessage(error.message || (isAr ? 'تعذر حفظ الهدف' : 'Could not save goal'));
      return;
    }

    setGoal('');
    setAmount('');
    setNotes('');
    setMessage(isAr ? 'تم حفظ الهدف بنجاح' : 'Goal saved');
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
            {isAr ? 'رجوع' : 'Back'}
          </button>
          <LanguageSwitcher variant="gold" />
        </header>

        <div className="hero">
          <div className="mark"><Target size={30} /></div>
          <div>
            <h1>{isAr ? 'إضافة هدف مالي' : 'Add Financial Goal'}</h1>
            <p>{isAr ? 'حوّل هدفك إلى مبلغ واضح ومدة زمنية قابلة للمتابعة.' : 'Turn your target into a clear amount and timeline.'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label>{isAr ? 'اسم الهدف' : 'Goal name'}</label>
          <input value={goal} onChange={event => setGoal(event.target.value)} placeholder={isAr ? 'مثال: صندوق الطوارئ' : 'Example: Emergency fund'} />

          <label>{isAr ? 'المبلغ المستهدف' : 'Target amount'}</label>
          <input value={amount} onChange={event => setAmount(formatAmount(event.target.value))} inputMode="decimal" placeholder="0.000" dir="ltr" />

          <label>{isAr ? 'المدة' : 'Timeline'}</label>
          <div className="durations">
            {DURATIONS.map(item => (
              <button key={item.value} type="button" className={duration === item.value ? 'duration active' : 'duration'} onClick={() => setDuration(item.value)}>
                {isAr ? item.ar : item.en}
              </button>
            ))}
          </div>

          <label>{isAr ? 'ملاحظات' : 'Notes'}</label>
          <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder={isAr ? 'اختياري' : 'Optional'} />

          {message && <div className={message.includes('تم') || message.includes('saved') ? 'msg ok' : 'msg'}>{message}</div>}

          <button type="submit" className="save" disabled={saving}>
            <Save size={17} />
            {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الهدف' : 'Save Goal')}
          </button>
        </form>
      </section>

      <style jsx>{`
        .page{min-height:100vh;background:linear-gradient(180deg,#F7F3EA,#FFFDFC);display:grid;place-items:center;padding:24px;font-family:Tajawal,Arial,sans-serif;color:#111}
        .card{width:min(100%,620px);background:#FFFDFC;border:1px solid rgba(216,174,99,.16);border-radius:26px;box-shadow:0 24px 70px rgba(90,67,51,.12);padding:24px}
        .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.back{height:40px;border-radius:12px;border:1px solid rgba(216,174,99,.22);background:#fffaf1;color:#5B4332;display:inline-flex;align-items:center;gap:8px;padding:0 14px;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer}
        .hero{display:flex;gap:16px;align-items:center;background:linear-gradient(135deg,#111,#2B1A0D);border-radius:22px;padding:22px;color:#fff;margin-bottom:20px}.mark{width:58px;height:58px;border-radius:18px;background:rgba(216,174,99,.14);color:#D8AE63;display:grid;place-items:center;flex:0 0 auto}.hero h1{margin:0 0 8px;font-size:28px}.hero p{margin:0;color:rgba(255,255,255,.68);line-height:1.7}
        form{display:grid;gap:12px}label{font-size:13px;font-weight:900;color:#5B4332}input,textarea{border-radius:14px;border:1.5px solid rgba(216,174,99,.22);background:rgba(247,243,234,.7);padding:0 13px;font:800 15px Tajawal,Arial,sans-serif;outline:none;color:#111}input{height:50px}textarea{min-height:86px;padding-top:12px;resize:vertical}input:focus,textarea:focus{border-color:#D8AE63;box-shadow:0 0 0 4px rgba(216,174,99,.14)}
        .durations{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.duration{min-height:44px;border:1px solid rgba(216,174,99,.2);border-radius:14px;background:#fffaf1;color:#5B4332;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer}.duration.active{background:rgba(216,174,99,.16);border-color:#D8AE63;color:#111}
        .save{height:54px;border:0;border-radius:16px;background:linear-gradient(135deg,#111,#2D1A0A,#D8AE63);color:#fff;font:900 15px Tajawal,Arial,sans-serif;display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;margin-top:8px}.save:disabled{opacity:.6;cursor:wait}.msg{border-radius:13px;padding:11px 13px;background:rgba(239,68,68,.08);color:#B91C1C;font-size:13px;font-weight:800}.msg.ok{background:rgba(34,197,94,.08);color:#15803D}.spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(216,174,99,.22);border-top-color:#D8AE63;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:620px){.durations{grid-template-columns:1fr 1fr}.hero{align-items:flex-start;flex-direction:column}}
      `}</style>
    </main>
  );
}
