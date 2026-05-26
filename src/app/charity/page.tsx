'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { MONTHS } from '@/lib/translations';

const LEGACY_CHARITY_PREFIX = '\u062e\u064a\u0631\u064a\u0629';

/* ─── Types ─── */
interface CharityRecord {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  month: string;        // "YYYY-MM"
  note: string;
  created_at?: string;
}

/* ─── Helpers ─── */
function currentYM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function labelFromYM(ym: string, lang: keyof typeof MONTHS): string {
  const [y, m] = ym.split('-');
  return `${MONTHS[lang][parseInt(m) - 1]} ${y}`;
}

function buildMonthOptions(lang: keyof typeof MONTHS): { value: string; label: string }[] {
  const opts = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ value: ym, label: labelFromYM(ym, lang) });
  }
  return opts.reverse();
}

/* ─── Progress Ring ─── */
function Ring({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <defs>
        <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--sfm-soft-cyan)" />
          <stop offset="100%" stopColor="var(--sfm-muted)" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(167,243,240,0.14)" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#cg)" strokeWidth="8"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }} />
    </svg>
  );
}

/* ═══════════════════════════════════════
   CHARITY PAGE
═══════════════════════════════════════ */
export default function CharityPage() {
  const { user, loading } = useAuth();
  const { dir, lang, t } = useLanguage();
  const router = useRouter();

  /* ── State ── */
  const [records, setRecords]   = useState<CharityRecord[]>([]);
  const [month,   setMonth]     = useState(currentYM());
  const [amount,  setAmount]    = useState('');
  const [name,    setName]      = useState('');
  const [saving,  setSaving]    = useState(false);
  const [deleting,setDeleting]  = useState<string | null>(null);
  const [msg,     setMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [mounted, setMounted]   = useState(false);

  const monthOptions = useMemo(() => buildMonthOptions(lang), [lang]);
  const selectedMonthLabel = labelFromYM(month, lang);
  const currencyLabel = t('charity.currency');
  const zakatShortcut = lang === 'ar'
    ? { title: 'الزكاة', button: 'فتح صفحة الزكاة' }
    : lang === 'fr'
      ? { title: 'Zakat', button: 'Ouvrir la page Zakat' }
      : { title: 'Zakat', button: 'Open Zakat Page' };

  /* ── Load charity records ── */
  const load = useCallback(async () => {
    if (!user) return;

    // Try charity table first; fall back to expense_items with charity category
    const { data, error } = await supabase
      .from('expense_items')
      .select('id, user_id, name, amount, created_at')
      .eq('user_id', user.id)
      .like('name', `${LEGACY_CHARITY_PREFIX}:%`)
      .order('created_at', { ascending: false });

    if (error) {
      setMsg({ type: 'err', text: `${t('charity.loadError')}: ${error.message}` });
      return;
    }

    if (data) {
      const mapped: CharityRecord[] = data.map(r => {
        // Legacy stored name format: "<charity-prefix>:YYYY-MM:note"
        const parts = r.name.split(':');
        return {
          id:         r.id,
          user_id:    r.user_id,
          name:       parts[2] || t('charity.defaultDonationName'),
          amount:     Number(r.amount) || 0,
          month:      parts[1] || currentYM(),
          note:       parts[2] || '',
          created_at: r.created_at,
        };
      });
      setRecords(mapped);
    }
  }, [t, user]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  /* ── Save ── */
  const save = async () => {
    if (!user || saving) return;

    const amt = parseFloat(amount.replace(/[^\d.]/g, ''));
    if (!amt || amt <= 0) { setMsg({ type: 'err', text: t('charity.invalidAmount') }); return; }
    if (!name.trim())     { setMsg({ type: 'err', text: t('charity.invalidName') }); return; }

    setSaving(true); setMsg(null);

    /*
      Store in expense_items using a prefixed name convention:
        "<charity-prefix>:YYYY-MM:note"
      This lets us:
        1. Filter charity records easily
        2. Count charity as an expense automatically (it IS in expense_items)
        3. Avoid needing a separate table
    */
    const rowName = `${LEGACY_CHARITY_PREFIX}:${month}:${name.trim()}`;

    try {
      const { error } = await supabase
        .from('expense_items')
        .insert({
          user_id: user.id,
          name:    rowName,
          amount:  amt,
        });

      if (error) {
        setMsg({ type: 'err', text: `${t('charity.saveError')}: ${error.message}` });
      } else {
        setMsg({ type: 'ok', text: t('charity.saveSuccess').replace('{amount}', amt.toFixed(3)).replace('{currency}', currencyLabel).replace('{month}', selectedMonthLabel) });
        setAmount(''); setName('');
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const remove = async (id: string) => {
    if (deleting) return;

    setDeleting(id);
    const { error } = await supabase.from('expense_items').delete().eq('id', id);
    if (error) {
      setMsg({ type: 'err', text: `${t('charity.deleteError')}: ${error.message}` });
    } else {
      setRecords(r => r.filter(x => x.id !== id));
      setMsg({ type: 'ok', text: t('charity.deleteSuccess') });
    }
    setDeleting(null);
  };

  /* ── Derived ── */
  const monthRecords  = records.filter(r => r.month === month);
  const monthTotal    = monthRecords.reduce((s, r) => s + r.amount, 0);
  const allTotal      = records.reduce((s, r) => s + r.amount, 0);
  const targetPct     = allTotal > 0 ? Math.min((monthTotal / (allTotal / 12)) * 100, 100) : 0;

  const S = (d: number) => ({
    opacity:   mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(16px)',
    transition: `opacity .5s ease ${d}ms, transform .5s ease ${d}ms`,
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--sfm-light-card)' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '3px solid rgba(167,243,240,0.2)', borderTopColor: 'var(--sfm-soft-cyan)', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .cp { font-family: 'Tajawal', sans-serif; background: var(--sfm-light-card); min-height: 100vh; color: var(--sfm-foreground); display: flex; overflow-x: hidden; }
        .charity-content { width: 100%; max-width: none; margin: 0; min-width: 0; }
        .g2 > *, .kpi-g > *, .cc { min-width: 0; }
        .cp ::-webkit-scrollbar { width: 4px; }
        .cp ::-webkit-scrollbar-thumb { background: rgba(167,243,240,.3); border-radius: 10px; }
        .cc { background: var(--sfm-card); border: 1px solid rgba(167,243,240,.14); border-radius: 22px; box-shadow: 0 4px 22px rgba(3,18,37,.06); transition: all .25s cubic-bezier(.4,0,.2,1); }
        .cc:hover:not(.no-h) { transform: translateY(-2px); box-shadow: 0 10px 34px rgba(3,18,37,.10); }
        .ci { width: 100%; background: rgba(247,243,234,.7); border: 1.5px solid rgba(167,243,240,.25); border-radius: 13px; padding: 13px 16px; font-family: 'Tajawal', sans-serif; font-size: 15px; color: var(--sfm-foreground); outline: none; transition: border-color .2s, box-shadow .2s; -webkit-appearance: none; }
        .ci:focus { border-color: var(--sfm-soft-cyan); box-shadow: 0 0 0 3px rgba(167,243,240,.14); }
        .ci-sel { background: rgba(247,243,234,.7) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%231D8CFF' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat left 14px center; cursor: pointer; }
        .save-btn { width: 100%; height: 54px; background: linear-gradient(135deg, var(--sfm-foreground) 0%, var(--sfm-primary-dark) 50%, var(--sfm-soft-cyan) 100%); border: none; border-radius: 16px; color: #fff; font-family: 'Tajawal', sans-serif; font-size: 16px; font-weight: 700; cursor: pointer; transition: all .25s; position: relative; overflow: hidden; }
        .save-btn::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent)); opacity: 0; transition: opacity .25s; }
        .save-btn:hover:not(:disabled)::before { opacity: 1; }
        .save-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(21,21,21,.25), 0 0 0 1px rgba(167,243,240,.35); }
        .save-btn:active:not(:disabled) { transform: scale(.98); }
        .save-btn:disabled { opacity: .55; cursor: not-allowed; }
        .save-btn span { position: relative; z-index: 1; }
        .row-hover:hover { background: rgba(167,243,240,.04) !important; }
        .charity-projects-shortcut { margin: -6px 0 22px; padding: 20px 22px; display: flex; align-items: center; justify-content: space-between; gap: 18px; background: radial-gradient(circle at 12% 15%, rgba(167,243,240,.18), transparent 30%), linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 62%,var(--sfm-card-dark) 145%); border: 1px solid rgba(167,243,240,.24); border-radius: 22px; box-shadow: 0 12px 34px rgba(3,18,37,.14); color: var(--sfm-card); overflow: hidden; }
        .charity-projects-shortcut-icon { width: 52px; height: 52px; border-radius: 16px; background: rgba(167,243,240,.16); border: 1px solid rgba(167,243,240,.22); display: grid; place-items: center; font-size: 24px; flex: 0 0 auto; }
        .charity-projects-shortcut-copy { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .charity-projects-shortcut h2 { margin: 0; color: var(--sfm-card); font-size: 18px; font-weight: 900; }
        .charity-projects-shortcut p { margin: 5px 0 0; color: rgba(248,251,255,.68); font-size: 13px; line-height: 1.75; max-width: 760px; }
        .charity-projects-shortcut-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
        .charity-projects-shortcut button { min-height: 44px; border: 0; border-radius: 14px; background: linear-gradient(135deg,var(--sfm-soft-cyan),var(--sfm-soft-cyan)); color: var(--sfm-foreground); padding: 0 16px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; font-family: Tajawal,sans-serif; font-size: 13px; font-weight: 900; white-space: nowrap; box-shadow: 0 8px 22px rgba(167,243,240,.22); }
        @media (max-width: 768px) { .g2 { grid-template-columns: 1fr !important; } .kpi-g { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 640px) { .charity-projects-shortcut { display: grid; padding: 18px; } .charity-projects-shortcut-copy { align-items: flex-start; } .charity-projects-shortcut-actions { display: grid; } .charity-projects-shortcut button { width: 100%; } }
        @media (max-width: 560px) { .kpi-g { grid-template-columns: 1fr !important; } }
      `}</style>

      <div className="cp" dir={dir}>
        <Sidebar />
        <DashboardPageShell className="charity-main" contentClassName="charity-content">

          {/* ─── Header ─── */}
          <div style={{ ...S(0), display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', background: 'var(--sfm-card)', border: '1.5px solid rgba(167,243,240,.22)', borderRadius: '12px', cursor: 'pointer', color: 'var(--sfm-muted)', fontSize: '13px', fontWeight: '700', fontFamily: 'Tajawal,sans-serif', flexShrink: 0 }}
            >{t('common_backToDashboard')}</button>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: '900', color: 'var(--sfm-foreground)', lineHeight: 1.2 }}>
                🤲 {t('charity.title')}
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--sfm-muted)', marginTop: '4px' }}>
                {t('charity.subtitle')}
              </p>
            </div>
            <LanguageSwitcher variant="gold" compact />
          </div>

          {/* ─── KPI row ─── */}
          <div className="kpi-g" style={{ ...S(40), display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '22px' }}>
            {[
              { icon: '🤲', label: t('charity.monthTotal').replace('{month}', selectedMonthLabel), val: monthTotal, color: 'var(--sfm-soft-cyan)' },
              { icon: '📅', label: t('charity.yearTotal'), val: allTotal, color: '#22C55E' },
              { icon: '📋', label: t('charity.donationCount'), val: records.length, unit: '', color: '#3B82F6', isCount: true },
            ].map((k, i) => (
              <div key={i} className="cc no-h" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', background: `${k.color}14`, borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{k.icon}</div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--sfm-muted)', marginBottom: '4px', fontWeight: '600' }}>{k.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: k.color, fontFamily: "'IBM Plex Sans Arabic',sans-serif", lineHeight: 1 }}>
                    {(k as any).isCount ? k.val : k.val.toFixed(3)}
                    {!(k as any).isCount && <span style={{ fontSize: '13px', color: 'var(--sfm-muted)', marginInlineStart: '4px', fontWeight: '500' }}> {currencyLabel}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <section className="charity-projects-shortcut" style={S(70)}>
            <div className="charity-projects-shortcut-copy">
              <div className="charity-projects-shortcut-icon" aria-hidden="true">🌙</div>
              <div>
                <h2>{t('charity.projectsShortcutTitle')}</h2>
                <p>{t('charity.projectsShortcutDescription')}</p>
              </div>
            </div>
            <div className="charity-projects-shortcut-actions">
              <button type="button" onClick={() => router.push('/charity-projects')}>
                {t('charity.openProjects')}
              </button>
              <button type="button" onClick={() => router.push('/zakat')} aria-label={zakatShortcut.button}>
                {zakatShortcut.button}
              </button>
            </div>
          </section>

          <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, .7fr)', gap: '20px', alignItems: 'start' }}>

            {/* ─── LEFT: Form + History ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Message */}
              {msg && (
                <div style={{ padding: '13px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px', background: msg.type === 'ok' ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)', border: `1.5px solid ${msg.type === 'ok' ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}`, color: msg.type === 'ok' ? '#16A34A' : '#DC2626', animation: 'fadeUp .3s ease', fontFamily: 'Tajawal,sans-serif', fontSize: '14px', fontWeight: '600' }}>
                  {msg.text}
                </div>
              )}

              {/* Add charity form */}
              <div className="cc" style={{ ...S(80), padding: '26px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px', paddingBottom: '18px', borderBottom: '1px solid rgba(167,243,240,.10)' }}>
                  <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent))', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', boxShadow: '0 4px 14px rgba(167,243,240,.3)' }}>🤲</div>
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--sfm-foreground)' }}>{t('charity.addDonation')}</h2>
                    <p style={{ fontSize: '12px', color: 'var(--sfm-muted)', marginTop: '2px' }}>{t('charity.autoExpenseNote')}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Month selector */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', display: 'block', marginBottom: '7px' }}>📅 {t('charity.month')}</label>
                    <select className="ci ci-sel" value={month} onChange={e => setMonth(e.target.value)}
                      style={{ height: '48px', paddingLeft: '36px' }}>
                      {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', display: 'block', marginBottom: '7px' }}>💰 {t('charity.amount')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid rgba(167,243,240,.25)', borderRadius: '13px', overflow: 'hidden', background: 'rgba(247,243,234,.7)', transition: 'border-color .2s, box-shadow .2s' }}
                      onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--sfm-soft-cyan)'}
                      onBlurCapture={e => e.currentTarget.style.borderColor = 'rgba(167,243,240,.25)'}>
                      <span style={{ padding: '0 12px', fontSize: '12.5px', fontWeight: '700', color: 'var(--sfm-soft-cyan)', borderInlineStart: '1px solid rgba(167,243,240,.18)', height: '48px', display: 'flex', alignItems: 'center', flexShrink: 0, fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{currencyLabel}</span>
                      <input
                        type="text" inputMode="decimal" placeholder="0.000" dir="ltr" value={amount}
                        onChange={e => setAmount(e.target.value)}
                        style={{ flex: 1, height: '48px', padding: '0 14px', background: 'transparent', border: 'none', outline: 'none', fontSize: '17px', fontWeight: '700', color: 'var(--sfm-foreground)', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}
                      />
                    </div>
                  </div>

                  {/* Name / note */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', display: 'block', marginBottom: '7px' }}>📝 {t('charity.nameOrNote')}</label>
                    <input className="ci" placeholder={t('charity.namePlaceholder')} value={name}
                      onChange={e => setName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && save()}
                      style={{ height: '48px' }} />
                  </div>

                  {/* Save */}
                  <button className="save-btn" onClick={save} disabled={saving}>
                    <span>
                      {saving
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.25)', borderTopColor: '#fff', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                          {t('saving')}
                        </span>
                        : `🤲 ${t('charity.saveDonation')}`}
                    </span>
                  </button>

                  <p style={{ textAlign: 'center', fontSize: '11.5px', color: 'var(--sfm-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <span>📊</span> {t('charity.countedInExpenses')}
                  </p>
                </div>
              </div>

              {/* History table */}
              <div className="cc" style={{ ...S(160), padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--sfm-foreground)' }}>
                    {t('charity.historyTitle')}
                    {monthRecords.length > 0 && (
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--sfm-muted)', marginInlineStart: '8px' }}>
                        ({selectedMonthLabel})
                      </span>
                    )}
                  </h3>
                  <span style={{ fontSize: '11px', padding: '3px 10px', background: 'rgba(167,243,240,.10)', borderRadius: '20px', color: 'var(--sfm-muted)', fontWeight: '700' }}>
                    {t('charity.donationCountValue').replace('{count}', String(monthRecords.length))}
                  </span>
                </div>

                {monthRecords.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🤲</div>
                    <p style={{ fontSize: '14px', color: 'var(--sfm-muted)', lineHeight: 1.6 }}>
                      {t('charity.noDonationsForMonth').replace('{month}', selectedMonthLabel)}
                    </p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(167,243,240,.12)' }}>
                        {[t('charity.tableName'), t('charity.tableAmount'), t('charity.tableMonth'), ''].map(h => (
                          <th key={h} style={{ padding: '9px 10px', textAlign: 'right', fontSize: '11.5px', fontWeight: '700', color: 'var(--sfm-muted)', letterSpacing: '.02em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthRecords.map((r, i) => (
                        <tr key={r.id} className="row-hover" style={{ borderBottom: i < monthRecords.length - 1 ? '1px solid rgba(167,243,240,.07)' : 'none', background: 'transparent', transition: 'background .15s' }}>
                          <td style={{ padding: '12px 10px', fontSize: '13.5px', color: 'var(--sfm-muted)', fontWeight: '600' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '16px' }}>🤲</span>
                              {r.name}
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--sfm-soft-cyan)', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>
                              {r.amount.toFixed(3)}
                              <span style={{ fontSize: '11px', color: 'var(--sfm-muted)', marginInlineStart: '4px' }}>{currencyLabel}</span>
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', fontSize: '12px', color: 'var(--sfm-muted)' }}>{labelFromYM(r.month, lang)}</td>
                          <td style={{ padding: '12px 10px', textAlign: 'left' }}>
                            <button onClick={() => remove(r.id)} disabled={deleting === r.id}
                              style={{ width: '32px', height: '32px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '9px', cursor: 'pointer', color: '#EF4444', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                              {deleting === r.id ? '...' : '✕'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Total row */}
                    <tfoot>
                      <tr style={{ borderTop: '2px solid rgba(167,243,240,.12)' }}>
                        <td colSpan={1} style={{ padding: '12px 10px', fontSize: '13.5px', fontWeight: '800', color: 'var(--sfm-foreground)' }}>{t('charity.total')}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--sfm-soft-cyan)', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>
                            {monthTotal.toFixed(3)} <span style={{ fontSize: '11px', color: 'var(--sfm-muted)' }}>{currencyLabel}</span>
                          </span>
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              {/* All months summary */}
              {records.length > 0 && (
                <div className="cc" style={{ ...S(220), padding: '22px 24px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--sfm-foreground)', marginBottom: '16px' }}>
                    {t('charity.allMonthsSummary')}
                  </h3>
                  {(() => {
                    const byMonth: Record<string, number> = {};
                    records.forEach(r => { byMonth[r.month] = (byMonth[r.month] || 0) + r.amount; });
                    return Object.entries(byMonth)
                      .sort((a, b) => b[0].localeCompare(a[0]))
                      .map(([ym, total]) => (
                        <div key={ym} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid rgba(167,243,240,.07)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--sfm-soft-cyan)' }} />
                            <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--sfm-muted)', cursor: 'pointer' }}
                              onClick={() => setMonth(ym)}>{labelFromYM(ym, lang)}</span>
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--sfm-soft-cyan)', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>
                            {total.toFixed(3)} <span style={{ fontSize: '11px', color: 'var(--sfm-muted)' }}>{currencyLabel}</span>
                          </span>
                        </div>
                      ));
                  })()}
                </div>
              )}
            </div>

            {/* ─── RIGHT: AI Sidebar ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '20px' }}>

              {/* Progress card */}
              <div style={{ background: 'linear-gradient(145deg,var(--sfm-primary-dark),var(--sfm-card-dark))', borderRadius: '22px', padding: '24px 20px', textAlign: 'center', border: '1px solid rgba(167,243,240,.2)', boxShadow: '0 8px 32px rgba(3,18,37,.22)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '130px', height: '130px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(167,243,240,.12) 0%,transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ fontSize: '13px', color: 'rgba(167,243,240,.6)', marginBottom: '16px', fontWeight: '600', letterSpacing: '.04em' }}>{t('charity.thisMonth')}</div>
                <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 14px' }}>
                  <Ring pct={targetPct} size={80} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '17px', fontWeight: '900', color: 'var(--sfm-soft-cyan)', fontFamily: "'IBM Plex Sans Arabic',sans-serif", lineHeight: 1 }}>{Math.round(targetPct)}</span>
                    <span style={{ fontSize: '9px', color: 'rgba(167,243,240,.5)' }}>%</span>
                  </div>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--sfm-card)', fontFamily: "'IBM Plex Sans Arabic',sans-serif", marginBottom: '6px' }}>
                  {monthTotal.toFixed(3)} <span style={{ fontSize: '14px', color: 'rgba(167,243,240,.7)' }}>{currencyLabel}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)' }}>{selectedMonthLabel}</div>
              </div>

              {/* Charity types guide */}
              <div className="cc no-h" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--sfm-foreground)', marginBottom: '14px' }}>🌟 {t('charity.typesTitle')}</h4>
                {[
                  { icon: '🙏', name: t('charity.typeGeneral'), desc: t('charity.typeGeneralDesc') },
                  { icon: '🌙', name: t('charity.typeZakat'), desc: t('charity.typeZakatDesc') },
                  { icon: '🐑', name: t('charity.typeSacrifice'), desc: t('charity.typeSacrificeDesc') },
                  { icon: '👶', name: t('charity.typeOrphan'), desc: t('charity.typeOrphanDesc') },
                  { icon: '📿', name: t('charity.typeKaffara'), desc: t('charity.typeKaffaraDesc') },
                  { icon: '🕌', name: t('charity.typeWaqf'), desc: t('charity.typeWaqfDesc') },
                ].map((type, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: i < 5 ? '1px solid rgba(167,243,240,.07)' : 'none', cursor: 'pointer' }}
                    onClick={() => setName(type.name)}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{type.icon}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-foreground)' }}>{type.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--sfm-muted)' }}>{type.desc}</div>
                    </div>
                    <span style={{ marginInlineStart: 'auto', fontSize: '11px', color: 'var(--sfm-soft-cyan)' }}>{t('charity.selectType')}</span>
                  </div>
                ))}
              </div>

              {/* AI tip */}
              <div style={{ background: 'rgba(167,243,240,.07)', border: '1px solid rgba(167,243,240,.2)', borderRadius: '18px', padding: '18px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '16px' }}>✨</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-soft-cyan)' }}>{t('charity.dailyMessage')}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--sfm-muted)', lineHeight: 1.75, fontStyle: 'italic' }}>
                  {t('charity.dailyQuote')}
                </p>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div style={{ ...S(300), marginTop: '24px', paddingTop: '18px', borderTop: '1px solid rgba(167,243,240,.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', color: 'var(--sfm-soft-cyan)' }}>
              <Image src="/sfm-logo.png" alt="THE SFM" width={24} height={24} className="sfm-brand-mark sfm-brand-mark--compact" />
              <span>THE SFM</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--sfm-muted)' }}>{t('charity.footerNote')}</p>
          </div>

        </DashboardPageShell>
      </div>
    </>
  );
}
