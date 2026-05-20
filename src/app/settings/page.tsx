'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Bell, Database, Download, Eye, Globe2, Home, KeyRound, Moon, Save, ShieldAlert, ShieldCheck, SlidersHorizontal, Sun, Trash2, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';
import type { Lang } from '@/lib/translations';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/Sidebar';

type ThemeMode = 'light' | 'dark' | 'system';

type SettingsState = {
  profile: { name: string; email: string; phone: string; country: string; profession: string };
  finance: { currency: string; budget: string; savings: string; investments: string; charity: string; monthStart: string };
  appearance: { theme: ThemeMode; luxury: boolean };
  notifications: { reports: boolean; expenses: boolean; investments: boolean; ai: boolean };
};

const STORE_KEY = 'sfm_settings';

const initialSettings: SettingsState = {
  profile: { name: '', email: '', phone: '', country: '', profession: '' },
  finance: { currency: 'KWD', budget: '750', savings: '20', investments: '15', charity: '5', monthStart: '1' },
  appearance: { theme: 'system', luxury: true },
  notifications: { reports: true, expenses: true, investments: true, ai: true },
};

const copy = {
  ar: {
    home: 'الرئيسية', title: 'الإعدادات', subtitle: 'تحكم بتجربة THE SFM من اللغة إلى الأمان والتقارير، مع حفظ التفضيلات بعد التحديث والتنقل.',
    language: 'إعدادات اللغة', account: 'إعدادات الحساب', finance: 'التفضيلات المالية', appearance: 'المظهر', notifications: 'الإشعارات',
    security: 'الخصوصية والأمان', data: 'البيانات والتقارير', saveLanguage: 'حفظ اللغة', saveProfile: 'حفظ الملف', savePrefs: 'حفظ التفضيلات',
    displayName: 'اسم العرض', email: 'البريد الإلكتروني', phone: 'الهاتف', country: 'الدولة', profession: 'المهنة', currency: 'العملة الافتراضية',
    budget: 'هدف الميزانية الشهرية', savings: 'هدف الادخار %', investments: 'هدف الاستثمار %', charity: 'هدف الخير %', monthStart: 'بداية الشهر المالي',
    light: 'فاتح', dark: 'داكن', system: 'النظام', luxury: 'تفعيل اللمسة الفاخرة', reports: 'تذكير التقرير الشهري', expenses: 'تنبيهات المصروفات',
    investAlerts: 'تنبيهات الاستثمار', aiAlerts: 'تنبيهات توصيات الذكاء الاصطناعي', changePassword: 'تغيير كلمة المرور', twoFactor: 'المصادقة الثنائية',
    twoFactorHint: 'جاهزة للربط عند تفعيل مزود المصادقة.', deleteAccount: 'منطقة حذف الحساب', deleteHint: 'إجراء حساس يحتاج تأكيداً إضافياً قبل التنفيذ.',
    exportData: 'تصدير البيانات', exportPdf: 'تصدير تقرير PDF', clearDemo: 'مسح البيانات التجريبية', saved: 'تم الحفظ', notConnected: 'واجهة آمنة بدون حذف فعلي الآن',
    selectLanguage: 'اختر اللغة', namePh: 'أدخل الاسم', emailPh: 'name@example.com', phonePh: '+965 0000 0000', countryPh: 'الكويت', professionPh: 'المهنة',
  },
  en: {
    home: 'Home', title: 'Settings', subtitle: 'Control THE SFM from language and appearance to security, notifications, and reports. Preferences persist after refresh and navigation.',
    language: 'Language Settings', account: 'Account Settings', finance: 'Financial Preferences', appearance: 'Appearance', notifications: 'Notifications',
    security: 'Privacy & Security', data: 'Data & Reports', saveLanguage: 'Save language', saveProfile: 'Save profile', savePrefs: 'Save preferences',
    displayName: 'Display name', email: 'Email', phone: 'Phone', country: 'Country', profession: 'Profession', currency: 'Default currency',
    budget: 'Monthly budget target', savings: 'Savings target %', investments: 'Investment target %', charity: 'Charity target %', monthStart: 'Financial month start',
    light: 'Light', dark: 'Dark', system: 'System', luxury: 'Luxury theme accent', reports: 'Monthly report reminders', expenses: 'Expense alerts',
    investAlerts: 'Investment alerts', aiAlerts: 'AI recommendation alerts', changePassword: 'Change password', twoFactor: 'Two-factor authentication',
    twoFactorHint: 'Ready to connect when auth provider support is enabled.', deleteAccount: 'Delete account area', deleteHint: 'Sensitive action requires extra confirmation before any execution.',
    exportData: 'Export data', exportPdf: 'Export monthly PDF', clearDemo: 'Clear demo data', saved: 'Saved', notConnected: 'Safe placeholder, no destructive action is wired',
    selectLanguage: 'Select language', namePh: 'Enter name', emailPh: 'name@example.com', phonePh: '+965 0000 0000', countryPh: 'Kuwait', professionPh: 'Profession',
  },
  fr: {
    home: 'Accueil', title: 'Parametres', subtitle: 'Controlez THE SFM: langue, apparence, securite, notifications et rapports. Les preferences restent apres actualisation et navigation.',
    language: 'Langue', account: 'Compte', finance: 'Preferences financieres', appearance: 'Apparence', notifications: 'Notifications',
    security: 'Confidentialite et securite', data: 'Donnees et rapports', saveLanguage: 'Enregistrer la langue', saveProfile: 'Enregistrer le profil', savePrefs: 'Enregistrer les preferences',
    displayName: 'Nom affiche', email: 'E-mail', phone: 'Telephone', country: 'Pays', profession: 'Profession', currency: 'Devise par defaut',
    budget: 'Budget mensuel cible', savings: 'Objectif epargne %', investments: 'Objectif investissement %', charity: 'Objectif charite %', monthStart: 'Debut du mois financier',
    light: 'Clair', dark: 'Sombre', system: 'Systeme', luxury: 'Accent luxe', reports: 'Rappels du rapport mensuel', expenses: 'Alertes de depenses',
    investAlerts: 'Alertes investissement', aiAlerts: 'Alertes IA', changePassword: 'Changer le mot de passe', twoFactor: 'Authentification a deux facteurs',
    twoFactorHint: 'Pret a connecter lorsque le fournisseur auth est active.', deleteAccount: 'Zone de suppression du compte', deleteHint: 'Action sensible avec confirmation supplementaire avant execution.',
    exportData: 'Exporter les donnees', exportPdf: 'Exporter le PDF mensuel', clearDemo: 'Effacer les donnees demo', saved: 'Enregistre', notConnected: 'Espace sur, aucune action destructive connectee',
    selectLanguage: 'Choisir la langue', namePh: 'Entrez le nom', emailPh: 'name@example.com', phonePh: '+965 0000 0000', countryPh: 'Koweit', professionPh: 'Profession',
  },
} satisfies Record<Lang, Record<string, string>>;

export default function SettingsPage() {
  const router = useRouter();
  const { lang, setLang, dir } = useLanguage();
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const c = copy[lang];
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) setSettings({ ...initialSettings, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const persist = (next = settings, message = c.saved) => {
    setSettings(next);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch {}
    if (user) {
      supabase.from('profiles').update({
        preferred_lang: lang,
        preferred_currency: next.finance.currency,
        preferred_theme: theme || next.appearance.theme,
        dashboard_prefs: {
          budget: next.finance.budget,
          savings: next.finance.savings,
          investments: next.finance.investments,
          charity: next.finance.charity,
          monthStart: next.finance.monthStart,
          luxury: next.appearance.luxury,
        },
        notification_prefs: next.notifications,
      }).eq('id', user.id).then(() => {}).catch(() => {});
    }
    setSaved(message);
    window.setTimeout(() => setSaved(''), 1600);
  };

  const languageOptions = useMemo(() => [
    { id: 'ar' as Lang, label: 'العربية' },
    { id: 'en' as Lang, label: 'English' },
    { id: 'fr' as Lang, label: 'Français' },
  ], []);

  const setNested = <S extends keyof SettingsState, K extends keyof SettingsState[S]>(section: S, key: K, value: SettingsState[S][K]) => {
    setSettings(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ lang, settings }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'the-sfm-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="settings-shell" dir={dir}>
      <Sidebar />
      <section className="settings-page">
        <header className="topbar">
          <button className="ghost-btn" onClick={() => router.push('/')}><Home size={17} />{c.home}</button>
          <LanguageSwitcher variant="gold" />
        </header>

        <section className="hero">
          <div className="hero-icon"><SlidersHorizontal size={34} /></div>
          <div>
            <h1>{c.title}</h1>
            <p>{c.subtitle}</p>
          </div>
          {saved && <span className="saved-pill">{saved}</span>}
        </section>

        <div className="grid">
          <Card icon={<Globe2 />} title={c.language}>
            <label>{c.selectLanguage}</label>
            <select value={lang} onChange={e => setLang(e.target.value as Lang)}>
              {languageOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <button className="gold-btn" onClick={() => persist(settings, c.saved)}><Save size={16} />{c.saveLanguage}</button>
          </Card>

          <Card icon={<UserRound />} title={c.account}>
            <Input label={c.displayName} value={settings.profile.name} placeholder={c.namePh} onChange={v => setNested('profile', 'name', v)} />
            <Input label={c.email} value={settings.profile.email} placeholder={c.emailPh} onChange={v => setNested('profile', 'email', v)} />
            <Input label={c.phone} value={settings.profile.phone} placeholder={c.phonePh} onChange={v => setNested('profile', 'phone', v)} />
            <Input label={c.country} value={settings.profile.country} placeholder={c.countryPh} onChange={v => setNested('profile', 'country', v)} />
            <Input label={c.profession} value={settings.profile.profession} placeholder={c.professionPh} onChange={v => setNested('profile', 'profession', v)} />
            <button className="gold-btn" onClick={() => persist()}><Save size={16} />{c.saveProfile}</button>
          </Card>

          <Card icon={<SlidersHorizontal />} title={c.finance}>
            <Input label={c.currency} value={settings.finance.currency} onChange={v => setNested('finance', 'currency', v)} />
            <Input label={c.monthStart} value={settings.finance.monthStart} type="number" onChange={v => setNested('finance', 'monthStart', v)} />
            <Input label={c.budget} value={settings.finance.budget} type="number" onChange={v => setNested('finance', 'budget', v)} />
            <Input label={c.savings} value={settings.finance.savings} type="number" onChange={v => setNested('finance', 'savings', v)} />
            <Input label={c.investments} value={settings.finance.investments} type="number" onChange={v => setNested('finance', 'investments', v)} />
            <Input label={c.charity} value={settings.finance.charity} type="number" onChange={v => setNested('finance', 'charity', v)} />
            <button className="gold-btn" onClick={() => persist()}><Save size={16} />{c.savePrefs}</button>
          </Card>

          <Card icon={<Eye />} title={c.appearance}>
            <div className="mode-row">
              {(['light', 'dark', 'system'] as ThemeMode[]).map(mode => (
                <button key={mode} className={(theme || settings.appearance.theme) === mode ? 'mode active' : 'mode'} onClick={() => { setTheme(mode); setNested('appearance', 'theme', mode); }}>
                  {mode === 'dark' ? <Moon size={15} /> : <Sun size={15} />}{c[mode]}
                </button>
              ))}
            </div>
            <Toggle checked={settings.appearance.luxury} label={c.luxury} onChange={v => setNested('appearance', 'luxury', v)} />
          </Card>

          <Card icon={<Bell />} title={c.notifications}>
            <Toggle checked={settings.notifications.reports} label={c.reports} onChange={v => setNested('notifications', 'reports', v)} />
            <Toggle checked={settings.notifications.expenses} label={c.expenses} onChange={v => setNested('notifications', 'expenses', v)} />
            <Toggle checked={settings.notifications.investments} label={c.investAlerts} onChange={v => setNested('notifications', 'investments', v)} />
            <Toggle checked={settings.notifications.ai} label={c.aiAlerts} onChange={v => setNested('notifications', 'ai', v)} />
          </Card>

          <Card icon={<ShieldCheck />} title={c.security}>
            <button className="soft-btn"><KeyRound size={16} />{c.changePassword}</button>
            <button className="soft-btn"><ShieldCheck size={16} />{c.twoFactor}</button>
            <p className="hint">{c.twoFactorHint}</p>
            <div className="danger"><ShieldAlert size={18} /><strong>{c.deleteAccount}</strong><span>{c.deleteHint}</span></div>
          </Card>

          <Card icon={<Database />} title={c.data}>
            <button className="soft-btn" onClick={exportJson}><Download size={16} />{c.exportData}</button>
            <button className="soft-btn" onClick={() => window.print()}><Download size={16} />{c.exportPdf}</button>
            <button className="danger-btn" type="button"><Trash2 size={16} />{c.clearDemo}</button>
            <p className="hint">{c.notConnected}</p>
          </Card>
        </div>
      </section>
      <style jsx>{`
        .settings-shell{min-height:100vh;background:linear-gradient(180deg,#f7f1e6 0%,#fffdf8 56%,#f3ead9 100%);color:#15110d;font-family:Tajawal,Arial,sans-serif}.settings-page{max-width:1180px;margin:0 auto;margin-inline-start:230px;padding:24px 18px 70px}.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.ghost-btn,.gold-btn,.soft-btn,.danger-btn,.mode{min-height:40px;border-radius:12px;border:1px solid rgba(190,149,82,.28);display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 14px;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer}.ghost-btn,.soft-btn{background:#fffaf1;color:#5c4228}.gold-btn{width:100%;background:linear-gradient(135deg,#d8ae63,#b88935);color:#1d1207;border:0;box-shadow:0 12px 24px rgba(184,137,53,.22)}.danger-btn{background:#fff4f1;color:#9c2f1d;border-color:#f0c7bf}.hero{position:relative;display:flex;gap:18px;align-items:center;background:linear-gradient(135deg,#111 0%,#2b1a0d 58%,#8b6328 135%);color:#fffdf7;border-radius:26px;padding:28px;margin-bottom:16px;box-shadow:0 24px 50px rgba(43,26,13,.18)}.hero-icon{width:64px;height:64px;border-radius:20px;background:rgba(216,174,99,.14);display:grid;place-items:center;color:#d8ae63;flex:0 0 auto}.hero h1{font-size:34px;line-height:1;margin:0 0 10px}.hero p{margin:0;max-width:760px;line-height:1.8;color:rgba(255,255,255,.72)}.saved-pill{position:absolute;top:22px;inset-inline-end:24px;background:#fffaf1;color:#6f4a16;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:900}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{background:rgba(255,253,248,.88);border:1px solid rgba(190,149,82,.2);border-radius:20px;padding:18px;box-shadow:0 16px 40px rgba(75,51,29,.08);backdrop-filter:blur(10px)}.card.full{grid-column:1/-1}.card-title{display:flex;align-items:center;gap:10px;margin-bottom:14px}.card-title svg{color:#c99b4f}.card-title h2{font-size:18px;margin:0}.field{display:grid;gap:7px;margin-bottom:12px}.field label,label{font-size:12px;font-weight:900;color:#6c5842}input,select{width:100%;height:42px;border-radius:12px;border:1px solid rgba(190,149,82,.28);background:#fffaf1;color:#18120d;padding:0 12px;font:700 14px Tajawal,Arial,sans-serif;outline:none}input:focus,select:focus{border-color:#c99b4f;box-shadow:0 0 0 3px rgba(216,174,99,.16)}.mode-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.mode{background:#fffaf1;color:#7a6148}.mode.active{background:#19130d;color:#f7d79c;border-color:#19130d;box-shadow:0 0 0 3px rgba(216,174,99,.2)}.toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid rgba(190,149,82,.12);font-weight:800;color:#4d3b2c}.switch{width:46px;height:26px;border-radius:999px;border:0;background:#d9cbbb;padding:3px;cursor:pointer}.switch span{display:block;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s ease}.switch.on{background:#c99b4f}.switch.on span{transform:translateX(-20px)}[dir="ltr"] .switch.on span{transform:translateX(20px)}.hint{font-size:12px;line-height:1.7;color:#8a7764;margin:10px 0 0}.danger{display:grid;grid-template-columns:auto 1fr;gap:4px 8px;background:#fff3ed;border:1px solid #f0c7bf;border-radius:14px;padding:12px;color:#8d2d1e}.danger span{grid-column:2;color:#9b6a5b;font-size:12px;line-height:1.6}@media(max-width:1024px){.settings-page{margin-inline-start:0}}@media(max-width:760px){.grid{grid-template-columns:1fr}.hero{align-items:flex-start;padding:22px;flex-direction:column}.hero h1{font-size:28px}.saved-pill{position:static;align-self:flex-start}.mode-row{grid-template-columns:1fr}.topbar{gap:10px;align-items:flex-start;flex-direction:column}}
      `}</style>
    </main>
  );
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <section className="card"><div className="card-title">{icon}<h2>{title}</h2></div>{children}</section>;
}

function Input({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <div className="field"><label>{label}</label><input type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></div>;
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <div className="toggle"><span>{label}</span><button className={checked ? 'switch on' : 'switch'} onClick={() => onChange(!checked)} aria-pressed={checked}><span /></button></div>;
}
