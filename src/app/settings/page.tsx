'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Database,
  Download,
  Globe2,
  Home,
  KeyRound,
  Monitor,
  Moon,
  Palette,
  Save,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Target,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/hooks/useLanguage';
import type { Lang } from '@/lib/translations';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { CURRENCIES } from '@/lib/currencies';
import { useCurrency } from '@/lib/useCurrency';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { ToggleSwitch } from '@/components/settings/ToggleSwitch';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { DeleteAccountModal } from '@/components/settings/DeleteAccountModal';
import { TwoFAModal } from '@/components/settings/TwoFAModal';

/* ─── Types ──────────────────────────────────────────────── */
type ThemeMode = 'light' | 'dark' | 'system';

type SettingsState = {
  profile:       { name: string; email: string; phone: string; country: string; profession: string };
  finance:       { currency: string; budget: string; savings: string; investments: string; charity: string };
  cycle:         { day: string };
  appearance:    { theme: ThemeMode; luxury: boolean };
  notifications: { reports: boolean; expenses: boolean; investments: boolean; ai: boolean };
};

const STORE_KEY = 'sfm_settings';

const DEFAULTS: SettingsState = {
  profile:       { name: '', email: '', phone: '', country: '', profession: '' },
  finance:       { currency: 'KWD', budget: '750', savings: '20', investments: '15', charity: '5' },
  cycle:         { day: '1' },
  appearance:    { theme: 'light', luxury: true },
  notifications: { reports: true, expenses: true, investments: true, ai: true },
};

/* ─── Component ──────────────────────────────────────────── */
export default function SettingsPage() {
  const router                = useRouter();
  const { lang, setLang, dir, t } = useLanguage();
  const { user }              = useAuth();
  const { theme, setTheme }   = useTheme();
  const { currency: ctxCurrency, setCurrency: setCtxCurrency } = useCurrency();

  const [settings, setSettings]               = useState<SettingsState>(DEFAULTS);
  const [saved, setSaved]                     = useState('');
  const [showChangePass, setShowChangePass]   = useState(false);
  const [showTwoFA, setShowTwoFA]             = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  /* Load stored settings on mount */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SettingsState>;
      setSettings(prev => ({
        ...prev,
        ...parsed,
        profile:       { ...prev.profile,       ...(parsed.profile       ?? {}) },
        finance:       { ...prev.finance,        ...(parsed.finance       ?? {}) },
        cycle:         { ...prev.cycle,          ...(parsed.cycle         ?? {}) },
        appearance:    { ...prev.appearance,     ...(parsed.appearance    ?? {}) },
        notifications: { ...prev.notifications,  ...(parsed.notifications ?? {}) },
      }));
    } catch { /* ignore parse errors */ }
  }, []);

  /* Sync luxury CSS class */
  useEffect(() => {
    if (settings.appearance.luxury) {
      document.documentElement.classList.add('luxury');
    } else {
      document.documentElement.classList.remove('luxury');
    }
  }, [settings.appearance.luxury]);

  /* Flash saved banner */
  const flash = useCallback((msg?: string) => {
    setSaved(msg ?? t('settings_saved'));
    window.setTimeout(() => setSaved(''), 2200);
  }, [t]);

  /* Persist to localStorage + Supabase profile */
  const persist = useCallback((next: SettingsState) => {
    setSettings(next);
    setCtxCurrency(next.finance.currency);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    if (user) {
      void supabase
        .from('profiles')
        .update({
          display_name: next.profile.name   || null,
          phone_number: next.profile.phone  || null,
        })
        .eq('id', user.id);
    }
    flash();
  }, [user, setCtxCurrency, flash]);

  /* Typed setter for nested keys */
  const set = <S extends keyof SettingsState, K extends keyof SettingsState[S]>(
    section: S, key: K, value: SettingsState[S][K],
  ) => setSettings(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));

  /* Export settings as JSON */
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ lang, settings }, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'the-sfm-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    flash(t('settings_saved'));
  };

  /* Clear demo data keys from localStorage */
  const clearDemoData = () => {
    const DEMO_KEYS = [
      'sfm_demo_expenses', 'sfm_demo_income',
      'sfm_demo_invest',   'sfm_demo_savings', 'sfm_demo_goals',
    ];
    DEMO_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
    flash(t('deleteSuccess'));
  };

  /* ─── Data ──────────────────────────────────────────────── */
  const langOptions: { id: Lang; label: string }[] = [
    { id: 'ar', label: 'العربية' },
    { id: 'en', label: 'English' },
    { id: 'fr', label: 'Français' },
  ];

  const themeOptions: { id: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { id: 'light',  icon: <Sun size={14} />,     label: t('settings_theme_light')  },
    { id: 'dark',   icon: <Moon size={14} />,    label: t('settings_theme_dark')   },
    { id: 'system', icon: <Monitor size={14} />, label: t('settings_theme_system') },
  ];

  const activeTheme = (theme ?? settings.appearance.theme) as ThemeMode;

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <>
      {/* ── Modals ───────────────────────────────────────────── */}
      {showChangePass    && <ChangePasswordModal onClose={() => setShowChangePass(false)} />}
      {showTwoFA         && <TwoFAModal          onClose={() => setShowTwoFA(false)} />}
      {showDeleteAccount && user && (
        <DeleteAccountModal userId={user.id} onClose={() => setShowDeleteAccount(false)} />
      )}

      <main className="sshell" dir={dir}>
        <Sidebar />

        <div className="spage">
          {/* Top bar */}
          <header className="stop">
            <button className="sghost" onClick={() => router.push('/')}>
              <Home size={15} />{t('settings_home')}
            </button>
            {saved && <span className="spill">{saved}</span>}
          </header>

          {/* Hero */}
          <section className="shero">
            <div className="shero-icon"><SlidersHorizontal size={28} /></div>
            <div>
              <h1 className="shero-title">{t('settings_title')}</h1>
              <p className="shero-sub">{t('settings_subtitle')}</p>
            </div>
          </section>

          {/* Grid of cards */}
          <div className="sgrid">

            {/* ── 1. Language ─────────────────────────────────── */}
            <SettingsCard icon={<Globe2 size={20} />} title={t('settings_language')}>
              <div className="sfield">
                <label className="slabel">{t('settings_select_lang')}</label>
                <select
                  className="sselect"
                  value={lang}
                  onChange={e => setLang(e.target.value as Lang)}
                >
                  {langOptions.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
              <button className="sbtn sbtn-gold" onClick={() => flash()}>
                <Save size={14} />{t('settings_save_language')}
              </button>
            </SettingsCard>

            {/* ── 2. Appearance ───────────────────────────────── */}
            <SettingsCard icon={<Palette size={20} />} title={t('settings_appearance')}>
              <div className="smode-row">
                {themeOptions.map(opt => (
                  <button
                    key={opt.id}
                    className={`smode-btn${activeTheme === opt.id ? ' smode-btn-active' : ''}`}
                    onClick={() => {
                      setTheme(opt.id);
                      set('appearance', 'theme', opt.id);
                    }}
                  >
                    {opt.icon}{opt.label}
                  </button>
                ))}
              </div>
              <ToggleSwitch
                checked={settings.appearance.luxury}
                label={t('settings_luxury')}
                onChange={v => set('appearance', 'luxury', v)}
              />
              <button
                className="sbtn sbtn-gold"
                style={{ marginTop: '6px' }}
                onClick={() => persist(settings)}
              >
                <Save size={14} />{t('settings_save_preferences')}
              </button>
            </SettingsCard>

            {/* ── 3. Financial Plan ───────────────────────────── */}
            <SettingsCard icon={<SlidersHorizontal size={20} />} title={t('settings_financial')}>
              <div className="sfield">
                <label className="slabel">{t('settings_currency')}</label>
                <select
                  className="sselect"
                  value={ctxCurrency}
                  onChange={e => {
                    set('finance', 'currency', e.target.value);
                    setCtxCurrency(e.target.value);
                  }}
                >
                  {CURRENCIES.map(cur => (
                    <option key={cur.code} value={cur.code}>
                      {cur.symbolAr} — {lang === 'fr' ? cur.nameFr : lang === 'en' ? cur.nameEn : cur.nameAr} ({cur.code})
                    </option>
                  ))}
                </select>
              </div>
              <SField label={t('settings_budget')}      value={settings.finance.budget}      type="number" min="0"        onChange={v => set('finance', 'budget',      v)} />
              <SField label={t('settings_savings_pct')} value={settings.finance.savings}     type="number" min="0" max="100" onChange={v => set('finance', 'savings',     v)} />
              <SField label={t('settings_invest_pct')}  value={settings.finance.investments} type="number" min="0" max="100" onChange={v => set('finance', 'investments', v)} />
              <SField label={t('settings_charity_pct')} value={settings.finance.charity}     type="number" min="0" max="100" onChange={v => set('finance', 'charity',     v)} />
              <button className="sbtn sbtn-gold" onClick={() => persist(settings)}>
                <Save size={14} />{t('settings_save_preferences')}
              </button>
            </SettingsCard>

            {/* ── 4. Cycle Start ──────────────────────────────── */}
            <SettingsCard
              icon={<Target size={20} />}
              title={t('settings_cycle_start')}
              subtitle={t('settings_cycle_hint')}
            >
              <div className="sfield">
                <label className="slabel">{t('settings_cycle_day_label')}</label>
                <select
                  className="sselect"
                  value={settings.cycle.day}
                  onChange={e => set('cycle', 'day', e.target.value)}
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d)}>{d}</option>
                  ))}
                </select>
              </div>
              <button className="sbtn sbtn-gold" onClick={() => persist(settings)}>
                <Save size={14} />{t('settings_save_preferences')}
              </button>
            </SettingsCard>

            {/* ── 5. Notifications ────────────────────────────── */}
            <SettingsCard icon={<Bell size={20} />} title={t('settings_notifications')}>
              <ToggleSwitch
                checked={settings.notifications.reports}
                label={t('settings_notif_reports')}
                onChange={v => set('notifications', 'reports', v)}
              />
              <ToggleSwitch
                checked={settings.notifications.expenses}
                label={t('settings_notif_expenses')}
                onChange={v => set('notifications', 'expenses', v)}
              />
              <ToggleSwitch
                checked={settings.notifications.investments}
                label={t('settings_notif_invest')}
                onChange={v => set('notifications', 'investments', v)}
              />
              <ToggleSwitch
                checked={settings.notifications.ai}
                label={t('settings_notif_ai')}
                hint={t('settings_notif_hint')}
                onChange={v => set('notifications', 'ai', v)}
              />
              <button
                className="sbtn sbtn-gold"
                style={{ marginTop: '6px' }}
                onClick={() => persist(settings)}
              >
                <Save size={14} />{t('settings_save_preferences')}
              </button>
            </SettingsCard>

            {/* ── 6. Security ─────────────────────────────────── */}
            <SettingsCard icon={<ShieldCheck size={20} />} title={t('settings_security')}>
              <button
                className="sbtn sbtn-soft"
                onClick={() => setShowChangePass(true)}
              >
                <KeyRound size={15} />{t('settings_change_password')}
              </button>
              <button
                className="sbtn sbtn-soft"
                onClick={() => setShowTwoFA(true)}
              >
                <ShieldCheck size={15} />{t('settings_two_factor')}
                <span className="sbadge-under">{t('settings_under_dev')}</span>
              </button>
              <p className="shint">{t('settings_2fa_hint')}</p>
            </SettingsCard>

            {/* ── 7. Data & Reports ───────────────────────────── */}
            <SettingsCard icon={<Database size={20} />} title={t('settings_data')}>
              <button className="sbtn sbtn-soft" onClick={exportJson}>
                <Download size={15} />{t('settings_export_data')}
              </button>
              <button className="sbtn sbtn-soft" onClick={() => window.print()}>
                <Download size={15} />{t('settings_export_pdf')}
              </button>
              <button className="sbtn sbtn-danger-soft" onClick={clearDemoData}>
                <Trash2 size={15} />{t('settings_clear_demo')}
              </button>
            </SettingsCard>

            {/* ── 8. Danger Zone ──────────────────────────────── */}
            <SettingsCard
              icon={<ShieldAlert size={20} />}
              title={t('settings_danger_zone')}
              subtitle={t('settings_danger_hint')}
              danger
            >
              <div className="sdanger-warn">
                <AlertTriangle size={16} />
                <span>{t('settings_delete_confirm')}</span>
              </div>
              <button
                className="sbtn sbtn-delete"
                onClick={() => setShowDeleteAccount(true)}
                disabled={!user}
              >
                <Trash2 size={15} />{t('settings_delete_account')}
              </button>
              {!user && (
                <p className="shint" style={{ color: '#9c6b3a' }}>{t('login_sign_in')}</p>
              )}
            </SettingsCard>

          </div>{/* /sgrid */}
        </div>{/* /spage */}
      </main>

      {/* ── Styles ───────────────────────────────────────────── */}
      <style jsx>{`
        /* Shell */
        .sshell {
          min-height: 100vh;
          background: linear-gradient(180deg, #f7f1e6 0%, #fffdf8 56%, #f3ead9 100%);
          color: #15110d;
          font-family: Tajawal, Cairo, Arial, sans-serif;
        }
        .spage {
          max-width: 1160px;
          margin: 0 auto;
          margin-inline-start: 230px;
          padding: 24px 18px 80px;
        }

        /* Top bar */
        .stop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
          min-height: 38px;
        }
        .sghost {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          height: 36px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid rgba(190, 149, 82, 0.28);
          background: #fffaf1;
          color: #5c4228;
          font: 800 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }
        .sghost:hover { background: #f5e8d0; }
        .spill {
          background: #edf7ee;
          color: #1a6e3c;
          border: 1px solid #b5ddc0;
          border-radius: 999px;
          padding: 5px 16px;
          font-size: 12px;
          font-weight: 900;
          animation: sfade-in 0.2s ease;
        }
        @keyframes sfade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

        /* Hero */
        .shero {
          display: flex;
          align-items: center;
          gap: 18px;
          background: linear-gradient(135deg, #111 0%, #2b1a0d 58%, #8b6328 135%);
          color: #fffdf7;
          border-radius: 24px;
          padding: 26px 28px;
          margin-bottom: 18px;
          box-shadow: 0 20px 50px rgba(43, 26, 13, 0.18);
        }
        .shero-icon {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          background: rgba(216, 174, 99, 0.14);
          display: grid;
          place-items: center;
          color: #d8ae63;
          flex-shrink: 0;
        }
        .shero-title {
          font-size: 30px;
          font-weight: 900;
          margin: 0 0 8px;
          line-height: 1;
        }
        .shero-sub {
          margin: 0;
          font-size: 13.5px;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.7);
          max-width: 680px;
        }

        /* Grid */
        .sgrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        /* Shared field */
        .sfield {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .slabel {
          font-size: 12px;
          font-weight: 900;
          color: #6c5842;
        }
        .sselect {
          width: 100%;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(190, 149, 82, 0.28);
          background: #fffaf1;
          color: #18120d;
          padding: 0 12px;
          font: 700 13px Tajawal, Arial, sans-serif;
          outline: none;
          cursor: pointer;
        }
        .sselect:focus {
          border-color: #c99b4f;
          box-shadow: 0 0 0 3px rgba(216, 174, 99, 0.15);
        }

        /* Buttons */
        .sbtn {
          width: 100%;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(190, 149, 82, 0.28);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
          font: 800 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s;
        }
        .sbtn-gold {
          background: linear-gradient(135deg, #d8ae63, #b88935);
          color: #1d1207;
          border: 0;
          box-shadow: 0 8px 20px rgba(184, 137, 53, 0.22);
        }
        .sbtn-gold:hover {
          box-shadow: 0 12px 28px rgba(184, 137, 53, 0.32);
        }
        .sbtn-soft {
          background: #fffaf1;
          color: #5c4228;
          justify-content: flex-start;
        }
        .sbtn-soft:hover { background: #f5e8d0; }
        .sbtn-danger-soft {
          background: #fff4f1;
          color: #9c2f1d;
          border-color: #f0c7bf;
          justify-content: flex-start;
        }
        .sbtn-danger-soft:hover { background: #ffecea; }
        .sbtn-delete {
          background: #ffecea;
          color: #9c2f1d;
          border-color: #e8b4aa;
        }
        .sbtn-delete:hover:not(:disabled) { background: #ffdad6; }
        .sbtn-delete:disabled { opacity: 0.45; cursor: not-allowed; }
        .sbadge-under {
          margin-inline-start: 6px;
          background: #f5e8cf;
          color: #7a5c28;
          border-radius: 999px;
          padding: 2px 10px;
          font-size: 10px;
          font-weight: 900;
        }

        /* Theme mode row */
        .smode-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .smode-btn {
          height: 38px;
          border-radius: 10px;
          border: 1px solid rgba(190, 149, 82, 0.25);
          background: #fffaf1;
          color: #7a6148;
          font: 800 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s;
        }
        .smode-btn-active {
          background: #19130d;
          color: #f7d79c;
          border-color: #19130d;
          box-shadow: 0 0 0 3px rgba(216, 174, 99, 0.18);
        }

        /* Danger zone warning */
        .sdanger-warn {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #fff3ed;
          border: 1px solid #f0c7bf;
          border-radius: 12px;
          padding: 10px 12px;
          color: #8d2d1e;
          font-size: 12.5px;
          line-height: 1.6;
        }
        .sdanger-warn svg { flex-shrink: 0; margin-top: 1px; }

        /* Hint text */
        .shint {
          font-size: 11.5px;
          line-height: 1.7;
          color: #8a7764;
          margin: 0;
        }

        /* Responsive */
        @media (max-width: 1024px) { .spage { margin-inline-start: 0; } }
        @media (max-width: 760px) {
          .sgrid { grid-template-columns: 1fr; }
          .shero { flex-direction: column; align-items: flex-start; padding: 20px; }
          .shero-title { font-size: 24px; }
          .smode-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}

/* ─── Inline field sub-component ───────────────────────────── */
interface SFieldProps {
  label: string;
  value: string;
  type?: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
}
function SField({ label, value, type = 'text', min, max, onChange }: SFieldProps) {
  return (
    <div className="sfield">
      <label className="slabel">{label}</label>
      <input
        className="sinput"
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(e.target.value)}
      />
      <style jsx>{`
        .sfield { display: flex; flex-direction: column; gap: 6px; }
        .slabel { font-size: 12px; font-weight: 900; color: #6c5842; }
        .sinput {
          width: 100%; height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(190,149,82,.28);
          background: #fffaf1; color: #18120d;
          padding: 0 12px;
          font: 700 14px Tajawal, Arial, sans-serif;
          outline: none; box-sizing: border-box;
        }
        .sinput:focus { border-color: #c99b4f; box-shadow: 0 0 0 3px rgba(216,174,99,.15); }
      `}</style>
    </div>
  );
}
