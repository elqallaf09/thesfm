'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PiggyBank, Save } from 'lucide-react';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const INVESTMENT_TYPES = [
  { ar: 'أسهم', en: 'Stocks', icon: '📈' },
  { ar: 'صندوق استثماري', en: 'Fund', icon: '📊' },
  { ar: 'عقار', en: 'Real estate', icon: '🏢' },
  { ar: 'ذهب', en: 'Gold', icon: '🥇' },
  { ar: 'مشروع', en: 'Business', icon: '💼' },
  { ar: 'أخرى', en: 'Other', icon: '💎' },
];

export default function AddInvestmentPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { dir, isAr } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
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
      setMessage(isAr ? 'سجل الدخول لحفظ الاستثمار' : 'Sign in to save this investment');
      return;
    }
    if (!name.trim() || !amount || Number(amount) <= 0) {
      setMessage(isAr ? 'أدخل اسم الاستثمار والمبلغ' : 'Enter investment name and amount');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('investment_items').insert({
      user_id: user.id,
      name: name.trim(),
      amount: Number(amount),
    });
    setSaving(false);

    if (error) {
      setMessage(error.message || (isAr ? 'تعذر حفظ الاستثمار' : 'Could not save investment'));
      return;
    }

    setName('');
    setAmount('');
    setMessage(isAr ? 'تم حفظ الاستثمار بنجاح' : 'Investment saved');
    window.setTimeout(() => router.push('/invest'), 900);
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
          <div className="mark"><PiggyBank size={30} /></div>
          <div>
            <h1>{isAr ? 'إضافة استثمار' : 'Add Investment'}</h1>
            <p>{isAr ? 'سجل أصل استثماري فعلي يظهر في المحفظة والداشبورد.' : 'Record a real investment asset for your portfolio and dashboard.'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label>{isAr ? 'نوع الاستثمار' : 'Investment type'}</label>
          <div className="types">
            {INVESTMENT_TYPES.map(type => {
              const label = isAr ? type.ar : type.en;
              return (
                <button key={type.en} type="button" className={name === label ? 'type active' : 'type'} onClick={() => setName(label)}>
                  <span>{type.icon}</span>
                  {label}
                </button>
              );
            })}
          </div>

          <label>{isAr ? 'اسم الاستثمار' : 'Investment name'}</label>
          <input value={name} onChange={event => setName(event.target.value)} placeholder={isAr ? 'مثال: صندوق مؤشرات' : 'Example: Index fund'} />

          <label>{isAr ? 'القيمة' : 'Amount'}</label>
          <input value={amount} onChange={event => setAmount(formatAmount(event.target.value))} inputMode="decimal" placeholder="0.000" dir="ltr" />

          {message && <div className={message.includes('تم') || message.includes('saved') ? 'msg ok' : 'msg'}>{message}</div>}

          <button type="submit" className="save" disabled={saving}>
            <Save size={17} />
            {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الاستثمار' : 'Save Investment')}
          </button>
        </form>
      </section>

      <style jsx>{`
        .page{min-height:100vh;background:linear-gradient(180deg,#F7F3EA,#FFFDFC);display:grid;place-items:center;padding:24px;font-family:Tajawal,Arial,sans-serif;color:#111}
        .card{width:min(100%,620px);background:#FFFDFC;border:1px solid rgba(216,174,99,.16);border-radius:26px;box-shadow:0 24px 70px rgba(90,67,51,.12);padding:24px}
        .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.back{height:40px;border-radius:12px;border:1px solid rgba(216,174,99,.22);background:#fffaf1;color:#5B4332;display:inline-flex;align-items:center;gap:8px;padding:0 14px;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer}
        .hero{display:flex;gap:16px;align-items:center;background:linear-gradient(135deg,#111,#2B1A0D);border-radius:22px;padding:22px;color:#fff;margin-bottom:20px}.mark{width:58px;height:58px;border-radius:18px;background:rgba(216,174,99,.14);color:#D8AE63;display:grid;place-items:center;flex:0 0 auto}.hero h1{margin:0 0 8px;font-size:28px}.hero p{margin:0;color:rgba(255,255,255,.68);line-height:1.7}
        form{display:grid;gap:12px}label{font-size:13px;font-weight:900;color:#5B4332}.types{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.type{min-height:54px;border:1px solid rgba(216,174,99,.2);border-radius:14px;background:#fffaf1;color:#5B4332;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px}.type.active{background:rgba(216,174,99,.16);border-color:#D8AE63;color:#111}
        input{height:50px;border-radius:14px;border:1.5px solid rgba(216,174,99,.22);background:rgba(247,243,234,.7);padding:0 13px;font:800 15px Tajawal,Arial,sans-serif;outline:none;color:#111}input:focus{border-color:#D8AE63;box-shadow:0 0 0 4px rgba(216,174,99,.14)}
        .save{height:54px;border:0;border-radius:16px;background:linear-gradient(135deg,#111,#2D1A0A,#D8AE63);color:#fff;font:900 15px Tajawal,Arial,sans-serif;display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;margin-top:8px}.save:disabled{opacity:.6;cursor:wait}.msg{border-radius:13px;padding:11px 13px;background:rgba(239,68,68,.08);color:#B91C1C;font-size:13px;font-weight:800}.msg.ok{background:rgba(34,197,94,.08);color:#15803D}.spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(216,174,99,.22);border-top-color:#D8AE63;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:620px){.types{grid-template-columns:1fr}.hero{align-items:flex-start;flex-direction:column}}
      `}</style>
    </main>
  );
}
