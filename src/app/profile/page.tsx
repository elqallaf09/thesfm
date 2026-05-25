'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  Crown,
  Database,
  Download,
  Eye,
  Globe2,
  KeyRound,
  Languages,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Palette,
  Phone,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Trash2,
  User,
  WalletCards,
} from 'lucide-react';
import { CurrencySelect } from '@/components/CurrencySelect';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/lib/useCurrency';

type Lang = 'ar' | 'en' | 'fr';
type ThemeMode = 'light' | 'dark' | 'system';
type ModalKind = 'password' | 'twoFactor' | 'devices' | 'delete' | 'subscription' | null;
type TextMap = Record<Lang, string>;

type ProfileState = {
  displayName: string;
  username: string;
  email: string;
  phoneCode: string;
  phone: string;
  age: string;
  gender: string;
  country: string;
  city: string;
  profession: string;
};

type PreferencesState = {
  language: Lang;
  theme: ThemeMode;
  currency: string;
  cycleStart: string;
  luxury: boolean;
  reports: boolean;
  expenses: boolean;
  investments: boolean;
  ai: boolean;
};

const STORE_KEY = 'sfm_settings';
const PROFILE_EXTRA_KEY = 'sfm_profile_extras';

const txt = {
  title: { ar: 'الملف الشخصي', en: 'Profile', fr: 'Profil' },
  subtitle: { ar: 'إدارة بياناتك الشخصية وإعدادات حسابك', en: 'Manage your identity and account settings', fr: 'Gérez votre identité et les paramètres du compte' },
  identity: { ar: 'بطاقة الهوية الشخصية', en: 'Identity Card', fr: "Carte d'identité" },
  accountStats: { ar: 'إحصائيات الحساب', en: 'Account Statistics', fr: 'Statistiques du compte' },
  personalInfo: { ar: 'المعلومات الشخصية', en: 'Personal Information', fr: 'Informations personnelles' },
  security: { ar: 'الأمان وتسجيل الدخول', en: 'Security and Sign-in', fr: 'Sécurité et connexion' },
  preferences: { ar: 'التفضيلات الشخصية', en: 'Personal Preferences', fr: 'Préférences personnelles' },
  premium: { ar: 'العضوية والمميزات', en: 'Membership and Benefits', fr: 'Abonnement et avantages' },
  activity: { ar: 'نشاط الحساب', en: 'Account Activity', fr: 'Activité du compte' },
  danger: { ar: 'منطقة الخطر', en: 'Danger Zone', fr: 'Zone de danger' },
  premiumBadge: { ar: 'SFM Premium', en: 'SFM Premium', fr: 'SFM Premium' },
  elite: { ar: 'Elite Member', en: 'Elite Member', fr: 'Membre Elite' },
  completion: { ar: 'اكتمال الملف', en: 'Profile completion', fr: 'Profil complété' },
  lastUpdate: { ar: 'آخر تحديث: اليوم', en: 'Last update: today', fr: "Dernière mise à jour : aujourd'hui" },
  lastActivity: { ar: 'آخر نشاط: نشط الآن', en: 'Last activity: active now', fr: 'Dernière activité : actif' },
  selectedLanguage: { ar: 'اللغة المختارة', en: 'Selected language', fr: 'Langue sélectionnée' },
  editPhoto: { ar: 'تعديل الصورة', en: 'Edit photo', fr: 'Modifier la photo' },
  viewProfile: { ar: 'عرض الملف', en: 'View profile', fr: 'Voir le profil' },
  goals: { ar: 'الأهداف المالية', en: 'Financial goals', fr: 'Objectifs financiers' },
  investmentStatus: { ar: 'حالة الاستثمار', en: 'Investment status', fr: "Statut d'investissement" },
  active: { ar: 'نشط', en: 'Active', fr: 'Actif' },
  inactive: { ar: 'غير نشط', en: 'Inactive', fr: 'Inactif' },
  health: { ar: 'مستوى الصحة المالية', en: 'Financial health', fr: 'Santé financière' },
  fullName: { ar: 'الاسم الكامل', en: 'Full name', fr: 'Nom complet' },
  username: { ar: 'اسم المستخدم', en: 'Username', fr: "Nom d'utilisateur" },
  email: { ar: 'البريد الإلكتروني', en: 'Email', fr: 'E-mail' },
  phone: { ar: 'رقم الهاتف', en: 'Phone number', fr: 'Téléphone' },
  phoneCode: { ar: 'رمز الدولة', en: 'Country code', fr: 'Indicatif' },
  age: { ar: 'العمر', en: 'Age', fr: 'Âge' },
  gender: { ar: 'الجنس', en: 'Gender', fr: 'Genre' },
  male: { ar: 'ذكر', en: 'Male', fr: 'Homme' },
  female: { ar: 'أنثى', en: 'Female', fr: 'Femme' },
  country: { ar: 'الدولة', en: 'Country', fr: 'Pays' },
  city: { ar: 'المدينة', en: 'City', fr: 'Ville' },
  profession: { ar: 'المهنة', en: 'Profession', fr: 'Profession' },
  preferredCurrency: { ar: 'العملة المفضلة', en: 'Preferred currency', fr: 'Devise préférée' },
  preferredLanguage: { ar: 'اللغة المفضلة', en: 'Preferred language', fr: 'Langue préférée' },
  savePersonal: { ar: 'حفظ المعلومات الشخصية', en: 'Save personal information', fr: 'Enregistrer les informations' },
  saved: { ar: 'تم الحفظ بنجاح', en: 'Saved successfully', fr: 'Enregistré avec succès' },
  saveError: { ar: 'تعذر الحفظ. حاول مرة أخرى.', en: 'Could not save. Try again.', fr: "Impossible d'enregistrer. Réessayez." },
  changePassword: { ar: 'تغيير كلمة المرور', en: 'Change password', fr: 'Changer le mot de passe' },
  twoFactor: { ar: 'تفعيل المصادقة الثنائية', en: 'Enable two-factor authentication', fr: "Activer l'authentification à deux facteurs" },
  connectedDevices: { ar: 'الأجهزة المتصلة', en: 'Connected devices', fr: 'Appareils connectés' },
  lastLogin: { ar: 'آخر تسجيل دخول', en: 'Last login', fr: 'Dernière connexion' },
  signOutAll: { ar: 'تسجيل الخروج من كل الأجهزة', en: 'Sign out from all devices', fr: 'Se déconnecter de tous les appareils' },
  currentPassword: { ar: 'كلمة المرور الحالية', en: 'Current password', fr: 'Mot de passe actuel' },
  newPassword: { ar: 'كلمة المرور الجديدة', en: 'New password', fr: 'Nouveau mot de passe' },
  confirmPassword: { ar: 'تأكيد كلمة المرور الجديدة', en: 'Confirm new password', fr: 'Confirmer le nouveau mot de passe' },
  passwordMismatch: { ar: 'كلمتا المرور غير متطابقتين', en: 'Passwords do not match', fr: 'Les mots de passe ne correspondent pas' },
  passwordShort: { ar: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل', en: 'Password must be at least 8 characters', fr: 'Le mot de passe doit contenir au moins 8 caractères' },
  passwordChanged: { ar: 'تم تغيير كلمة المرور', en: 'Password changed', fr: 'Mot de passe modifié' },
  twoFactorHint: { ar: 'المصادقة الثنائية تحتاج ربطها بنظام المصادقة.', en: 'Two-factor authentication needs to be connected to the auth system.', fr: "L'authentification à deux facteurs doit être reliée au système d'authentification." },
  devicesHint: { ar: 'إدارة الأجهزة تحتاج ربط سجل الجلسات في نظام المصادقة.', en: 'Device management needs session history from the auth system.', fr: 'La gestion des appareils nécessite l’historique des sessions.' },
  language: { ar: 'اللغة', en: 'Language', fr: 'Langue' },
  theme: { ar: 'المظهر', en: 'Theme', fr: 'Thème' },
  light: { ar: 'فاتح', en: 'Light', fr: 'Clair' },
  dark: { ar: 'داكن', en: 'Dark', fr: 'Sombre' },
  system: { ar: 'النظام', en: 'System', fr: 'Système' },
  currency: { ar: 'العملة', en: 'Currency', fr: 'Devise' },
  cycleStart: { ar: 'بداية الشهر المالي', en: 'Financial month start', fr: 'Début du mois financier' },
  luxury: { ar: 'تفعيل اللمسة الفاخرة', en: 'Enable luxury accent', fr: 'Activer la touche luxe' },
  notifications: { ar: 'الإشعارات', en: 'Notifications', fr: 'Notifications' },
  reports: { ar: 'تذكير التقرير الشهري', en: 'Monthly report reminders', fr: 'Rappels du rapport mensuel' },
  expenseAlerts: { ar: 'تنبيهات المصروفات', en: 'Expense alerts', fr: 'Alertes dépenses' },
  investmentAlerts: { ar: 'تنبيهات الاستثمار', en: 'Investment alerts', fr: 'Alertes investissement' },
  aiAlerts: { ar: 'تنبيهات توصيات الذكاء الاصطناعي', en: 'AI recommendation alerts', fr: 'Alertes recommandations IA' },
  plan: { ar: 'خطة العضوية الحالية', en: 'Current membership plan', fr: 'Plan actuel' },
  startDate: { ar: 'تاريخ بداية الاشتراك', en: 'Subscription start', fr: 'Début de l’abonnement' },
  renewalDate: { ar: 'تاريخ التجديد', en: 'Renewal date', fr: 'Date de renouvellement' },
  manageSubscription: { ar: 'إدارة الاشتراك', en: 'Manage subscription', fr: "Gérer l'abonnement" },
  paymentNeeded: { ar: 'إدارة الاشتراك تحتاج ربط نظام الدفع.', en: 'Subscription management needs a payment system connection.', fr: 'La gestion de l’abonnement nécessite un système de paiement.' },
  exportData: { ar: 'تصدير نسخة من بياناتي قبل الحذف', en: 'Export my data before deletion', fr: 'Exporter mes données avant suppression' },
  deleteAccount: { ar: 'حذف الحساب', en: 'Delete account', fr: 'Supprimer le compte' },
  deleteHint: { ar: 'حذف الحساب يحتاج ربطه بنظام المصادقة وقاعدة البيانات.', en: 'Account deletion needs to be connected to auth and database systems.', fr: 'La suppression du compte doit être reliée à l’authentification et à la base de données.' },
  typeDelete: { ar: 'اكتب DELETE أو حذف لتفعيل زر الحذف النهائي', en: 'Type DELETE or حذف to enable final deletion', fr: 'Tapez DELETE ou حذف pour activer la suppression finale' },
  finalDelete: { ar: 'تأكيد الحذف النهائي', en: 'Confirm final deletion', fr: 'Confirmer la suppression finale' },
  cancel: { ar: 'إلغاء', en: 'Cancel', fr: 'Annuler' },
  close: { ar: 'إغلاق', en: 'Close', fr: 'Fermer' },
  open: { ar: 'فتح', en: 'Open', fr: 'Ouvrir' },
  enable: { ar: 'تفعيل', en: 'Enable', fr: 'Activer' },
  view: { ar: 'عرض', en: 'View', fr: 'Voir' },
  execute: { ar: 'تنفيذ', en: 'Run', fr: 'Exécuter' },
  updatedProfile: { ar: 'تم تحديث الملف الشخصي', en: 'Profile updated', fr: 'Profil mis à jour' },
  addedGoal: { ar: 'تم إضافة هدف مالي', en: 'Financial goal added', fr: 'Objectif financier ajouté' },
  addedInvestment: { ar: 'تم إضافة استثمار', en: 'Investment added', fr: 'Investissement ajouté' },
  changedLanguage: { ar: 'تم تغيير اللغة', en: 'Language changed', fr: 'Langue modifiée' },
  exportedReport: { ar: 'تم تصدير تقرير', en: 'Report exported', fr: 'Rapport exporté' },
  today: { ar: 'اليوم', en: 'Today', fr: "Aujourd'hui" },
  noActivity: { ar: 'لا يوجد نشاط حساب بعد', en: 'No account activity yet', fr: 'Aucune activité du compte' },
  advancedAi: { ar: 'تحليلات AI متقدمة', en: 'Advanced AI analytics', fr: 'Analyses IA avancées' },
  smartAdvice: { ar: 'توصيات مالية ذكية', en: 'Smart financial recommendations', fr: 'Recommandations financières intelligentes' },
  pdf: { ar: 'تصدير PDF', en: 'PDF export', fr: 'Export PDF' },
  protection: { ar: 'حماية متقدمة', en: 'Advanced protection', fr: 'Protection avancée' },
  sync: { ar: 'مزامنة البيانات', en: 'Data sync', fr: 'Synchronisation des données' },
  unlimitedGoals: { ar: 'أهداف مالية غير محدودة', en: 'Unlimited financial goals', fr: 'Objectifs illimités' },
  monthlyReports: { ar: 'تقارير شهرية', en: 'Monthly reports', fr: 'Rapports mensuels' },
  prioritySupport: { ar: 'دعم أولوية', en: 'Priority support', fr: 'Support prioritaire' },
};

const countries = ['Kuwait', 'Saudi Arabia', 'United Arab Emirates', 'Bahrain', 'Qatar', 'Oman', 'France', 'United States'];
const phoneCodes = ['+965', '+966', '+971', '+973', '+974', '+968', '+33', '+1'];
function T(key: keyof typeof txt, lang: Lang) {
  return txt[key][lang] || txt[key].ar;
}

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeStored<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { lang, setLang, dir } = useLanguage();
  const { setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const [profile, setProfile] = useState<ProfileState>({
    displayName: '',
    username: '',
    email: '',
    phoneCode: '+965',
    phone: '',
    age: '',
    gender: '',
    country: 'Kuwait',
    city: '',
    profession: '',
  });
  const [preferences, setPreferences] = useState<PreferencesState>({
    language: lang,
    theme: 'light',
    currency,
    cycleStart: new Date().toISOString().slice(0, 10),
    luxury: true,
    reports: true,
    expenses: true,
    investments: true,
    ai: true,
  });
  const [stats, setStats] = useState({ goals: 0, investments: 0, health: 78 });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [deleteWord, setDeleteWord] = useState('');

  const L = (key: keyof typeof txt) => T(key, lang);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, router, user]);

  useEffect(() => {
    const stored = readStored<Partial<PreferencesState>>(STORE_KEY, {});
    setPreferences(prev => ({
      ...prev,
      ...stored,
      language: lang,
      currency: stored.currency || currency,
      cycleStart: stored.cycleStart || prev.cycleStart,
    }));
  }, [currency, lang]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const extras = readStored<Record<string, Partial<ProfileState>>>(PROFILE_EXTRA_KEY, {});
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      const extra = extras[user.id] || {};
      setProfile({
        displayName: String(data?.display_name || user.user_metadata?.display_name || ''),
        username: String(data?.username || user.email?.split('@')[0] || ''),
        email: String(data?.email || user.email || ''),
        phoneCode: String(data?.phone_country_code || extra.phoneCode || '+965'),
        phone: String(data?.phone_number || extra.phone || ''),
        age: data?.age ? String(data.age) : String(extra.age || ''),
        gender: String(data?.gender || extra.gender || ''),
        profession: String(data?.profession || extra.profession || ''),
        country: String(extra.country || 'Kuwait'),
        city: String(extra.city || ''),
      });
      const [goalRes, investRes] = await Promise.all([
        supabase.from('financial_goals').select('id').eq('user_id', user.id),
        supabase.from('investment_items').select('id').eq('user_id', user.id),
      ]);
      setStats({
        goals: goalRes.data?.length || 0,
        investments: investRes.data?.length || 0,
        health: Math.min(100, 62 + (goalRes.data?.length || 0) * 3 + (investRes.data?.length || 0) * 4),
      });
    }
    void load();
  }, [user]);

  const completion = useMemo(() => {
    const fields = [profile.displayName, profile.username, profile.email, profile.phone, profile.age, profile.gender, profile.country, profile.city, profile.profession];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profile]);

  const initials = useMemo(() => {
    const base = profile.displayName || profile.username || 'SFM';
    return base.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  }, [profile.displayName, profile.username]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  function persistPreferences(next: PreferencesState) {
    setPreferences(next);
    setLang(next.language);
    setCurrency(next.currency);
    setTheme(next.theme);
    writeStored(STORE_KEY, next);
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('sfm-luxury', next.luxury);
    showToast(L('saved'));
  }

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: profile.displayName.trim(),
      username: profile.username.trim(),
      email: profile.email || user.email,
      age: profile.age ? Number(profile.age) : null,
      gender: profile.gender || null,
      profession: profile.profession || null,
      phone_country_code: profile.phoneCode,
      phone_number: profile.phone || null,
    }, { onConflict: 'id' });
    const extras = readStored<Record<string, Partial<ProfileState>>>(PROFILE_EXTRA_KEY, {});
    writeStored(PROFILE_EXTRA_KEY, { ...extras, [user.id]: { country: profile.country, city: profile.city } });
    setSaving(false);
    showToast(error ? L('saveError') : L('saved'));
  }

  async function changePassword() {
    if (!passwords.current) return showToast(L('currentPassword'));
    if (passwords.next.length < 8) return showToast(L('passwordShort'));
    if (passwords.next !== passwords.confirm) return showToast(L('passwordMismatch'));
    const { error } = await supabase.auth.updateUser({ password: passwords.next });
    if (error) showToast(error.message);
    else {
      setPasswords({ current: '', next: '', confirm: '' });
      setModal(null);
      showToast(L('passwordChanged'));
    }
  }

  async function signOutEverywhere() {
    await supabase.auth.signOut({ scope: 'global' });
    await signOut();
    router.push('/login');
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ profile, preferences, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'the-sfm-profile-data.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast(L('exportedReport'));
  }

  if (loading) {
    return <div className="profile-loading">...</div>;
  }

  return (
    <div className="profile-page" dir={dir}>
      <Sidebar />
      <main className="profile-main">
        <header className="profile-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Image src="/sfm-logo.png" alt="THE SFM" width={42} height={42} priority className="rounded-lg" />
            <div>
              <span>THE SFM</span>
              <h1>{L('title')}</h1>
              <p>{L('subtitle')}</p>
            </div>
          </div>
          <LanguageSwitcher variant="gold" compact />
        </header>

        <section className="profile-layout">
          <ProfileHeroCard
            initials={initials}
            name={profile.displayName || 'THE SFM'}
            username={profile.username}
            completion={completion}
            language={lang.toUpperCase()}
            labels={{ premium: L('premiumBadge'), elite: L('elite'), completion: L('completion'), lastActivity: L('lastActivity'), selectedLanguage: L('selectedLanguage'), editPhoto: L('editPhoto'), viewProfile: L('viewProfile') }}
            onEditPhoto={() => showToast(L('twoFactorHint'))}
            onView={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />
          <ProfileStatsCards
            labels={{ goals: L('goals'), investmentStatus: L('investmentStatus'), completion: L('completion'), health: L('health'), active: L('active'), inactive: L('inactive') }}
            stats={{ goals: stats.goals, investments: stats.investments, completion, health: stats.health }}
          />
        </section>

        <PersonalInfoForm lang={lang} profile={profile} setProfile={setProfile} preferences={preferences} setPreferences={next => persistPreferences(next)} saving={saving} labels={{
          title: L('personalInfo'), fullName: L('fullName'), username: L('username'), email: L('email'), phone: L('phone'), phoneCode: L('phoneCode'), age: L('age'), gender: L('gender'), male: L('male'), female: L('female'), country: L('country'), city: L('city'), profession: L('profession'), currency: L('preferredCurrency'), language: L('preferredLanguage'), save: L('savePersonal'),
        }} onSave={() => void saveProfile()} />

        <SecuritySettings labels={{ title: L('security'), changePassword: L('changePassword'), twoFactor: L('twoFactor'), devices: L('connectedDevices'), lastLogin: L('lastLogin'), signOutAll: L('signOutAll'), open: L('open'), enable: L('enable'), view: L('view'), execute: L('execute'), today: L('today') }} onModal={setModal} onSignOutAll={() => void signOutEverywhere()} />

        <PreferenceSettings lang={lang} preferences={preferences} onChange={persistPreferences} labels={{
          title: L('preferences'), language: L('language'), theme: L('theme'), light: L('light'), dark: L('dark'), system: L('system'), currency: L('currency'), cycleStart: L('cycleStart'), luxury: L('luxury'), notifications: L('notifications'), reports: L('reports'), expenseAlerts: L('expenseAlerts'), investmentAlerts: L('investmentAlerts'), aiAlerts: L('aiAlerts'),
        }} />

        <PremiumFeatures labels={{
          title: L('premium'), plan: L('plan'), premium: L('premiumBadge'), start: L('startDate'), renewal: L('renewalDate'), manage: L('manageSubscription'), advancedAi: L('advancedAi'), smartAdvice: L('smartAdvice'), pdf: L('pdf'), protection: L('protection'), sync: L('sync'), goals: L('unlimitedGoals'), reports: L('monthlyReports'), support: L('prioritySupport'),
        }} onManage={() => setModal('subscription')} />

        <AccountActivity labels={{ title: L('activity'), today: L('today'), noActivity: L('noActivity') }} items={[L('updatedProfile'), L('addedGoal'), L('addedInvestment'), L('changedLanguage'), L('exportedReport')]} />

        <DangerZone labels={{ title: L('danger'), exportData: L('exportData'), deleteAccount: L('deleteAccount'), deleteHint: L('deleteHint') }} onExport={exportData} onDelete={() => setModal('delete')} />

        {toast && <div className="profile-toast">{toast}</div>}
      </main>

      <ConfirmationModal open={modal === 'password'} title={L('changePassword')} onClose={() => setModal(null)}>
        <div className="modal-fields">
          <Field icon={<KeyRound size={16} />} label={L('currentPassword')}><input type="password" value={passwords.current} onChange={event => setPasswords(prev => ({ ...prev, current: event.target.value }))} /></Field>
          <Field icon={<Lock size={16} />} label={L('newPassword')}><input type="password" value={passwords.next} onChange={event => setPasswords(prev => ({ ...prev, next: event.target.value }))} /></Field>
          <Field icon={<ShieldCheck size={16} />} label={L('confirmPassword')}><input type="password" value={passwords.confirm} onChange={event => setPasswords(prev => ({ ...prev, confirm: event.target.value }))} /></Field>
          <button className="gold-btn" onClick={() => void changePassword()}><Save size={16} />{L('changePassword')}</button>
        </div>
      </ConfirmationModal>

      <ConfirmationModal open={modal === 'twoFactor'} title={L('twoFactor')} onClose={() => setModal(null)}>
        <InfoBox icon={<ShieldCheck />} text={L('twoFactorHint')} />
      </ConfirmationModal>

      <ConfirmationModal open={modal === 'devices'} title={L('connectedDevices')} onClose={() => setModal(null)}>
        <InfoBox icon={<Smartphone />} text={L('devicesHint')} />
      </ConfirmationModal>

      <ConfirmationModal open={modal === 'subscription'} title={L('manageSubscription')} onClose={() => setModal(null)}>
        <InfoBox icon={<Crown />} text={L('paymentNeeded')} />
      </ConfirmationModal>

      <ConfirmationModal open={modal === 'delete'} title={L('deleteAccount')} onClose={() => setModal(null)}>
        <div className="modal-fields">
          <InfoBox icon={<AlertTriangle />} text={L('deleteHint')} danger />
          <Field icon={<Trash2 size={16} />} label={L('typeDelete')}><input value={deleteWord} onChange={event => setDeleteWord(event.target.value)} /></Field>
          <button className="danger-btn" disabled={deleteWord !== 'DELETE' && deleteWord !== 'حذف'} onClick={() => showToast(L('deleteHint'))}>{L('finalDelete')}</button>
        </div>
      </ConfirmationModal>

      <style jsx global>{`
        .profile-page{min-height:100vh;background:var(--sfm-light-card);color:var(--sfm-deep-navy);display:flex;font-family:Tajawal,Arial,sans-serif}.profile-main{flex:1;width:100%;max-width:1280px;margin:0 auto;padding:24px;margin-inline-start:230px}.profile-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px}.profile-top span{color:var(--sfm-muted);font-size:12px;font-weight:900}.profile-top h1{font-size:30px;margin:4px 0 6px;font-weight:900}.profile-top p{margin:0;color:var(--sfm-muted);font-weight:700}
        .profile-card{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:24px;box-shadow:0 4px 22px rgba(3,18,37,.06);padding:20px}.profile-layout{display:grid;grid-template-columns:360px 1fr;gap:16px;margin-bottom:16px}.hero-card{background:linear-gradient(145deg,var(--sfm-deep-navy),var(--sfm-primary-dark));color:var(--sfm-card);border:1px solid rgba(167,243,240,.2);border-radius:26px;padding:24px;box-shadow:0 18px 55px rgba(3,18,37,.16)}.avatar{width:92px;height:92px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;font-size:28px;font-weight:900;border:4px solid rgba(255,255,255,.12)}.premium-pill{display:inline-flex;align-items:center;gap:7px;background:rgba(167,243,240,.12);color:var(--sfm-soft-cyan);border:1px solid rgba(167,243,240,.22);border-radius:999px;padding:7px 12px;font-size:12px;font-weight:900}.hero-actions,.section-actions{display:flex;gap:8px;flex-wrap:wrap}.ghost-btn,.gold-btn,.danger-btn{height:42px;border-radius:14px;border:0;padding:0 15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;text-decoration:none;transition:.2s}.gold-btn{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;box-shadow:0 10px 24px rgba(167,243,240,.2)}.ghost-btn{background:var(--sfm-light-card);color:var(--sfm-muted);border:1px solid rgba(167,243,240,.18)}.danger-btn{background:#B91C1C;color:#fff}.danger-btn:disabled{opacity:.45;cursor:not-allowed}.dark-ghost{background:rgba(255,255,255,.08);color:var(--sfm-card);border:1px solid rgba(255,255,255,.14)}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;height:100%}.stat-card{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:20px;padding:16px;display:grid;gap:9px;min-height:150px}.stat-icon{width:40px;height:40px;border-radius:14px;background:rgba(167,243,240,.12);color:var(--sfm-soft-cyan);display:grid;place-items:center}.stat-card span,.field label,.mini-label{font-size:12px;color:var(--sfm-muted);font-weight:900}.stat-card strong{font-size:22px}.section-head{display:flex;align-items:center;gap:10px;margin-bottom:16px}.section-head h2{margin:0;font-size:18px;font-weight:900}.form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.field{display:grid;gap:7px}.input-wrap{height:52px;border:1.5px solid rgba(167,243,240,.2);border-radius:15px;background:var(--sfm-light-card);display:flex;align-items:center;gap:9px;padding:0 12px;color:var(--sfm-muted)}.input-wrap input,.input-wrap select{border:0;outline:0;background:transparent;width:100%;height:100%;font:800 14px Tajawal,Arial,sans-serif;color:var(--sfm-foreground)}.input-wrap input[readonly]{opacity:.65}.profile-section{margin-bottom:16px}.setting-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 0;border-bottom:1px solid rgba(167,243,240,.1)}.setting-row:last-child{border-bottom:0}.setting-row p{margin:4px 0 0;color:var(--sfm-muted);font-size:12px;font-weight:700}.toggle{width:48px;height:28px;border-radius:999px;border:0;background:#D8C8AA;padding:3px;cursor:pointer}.toggle i{display:block;width:22px;height:22px;border-radius:50%;background:white;transition:.2s}.toggle.on{background:var(--sfm-soft-cyan)}.toggle.on i{transform:translateX(-20px)}[dir="ltr"] .toggle.on i{transform:translateX(20px)}
        .pref-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.segmented{display:flex;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14);border-radius:14px;padding:4px;gap:4px}.segmented button{flex:1;border:0;border-radius:11px;background:transparent;height:38px;font:900 12px Tajawal,Arial,sans-serif;color:var(--sfm-muted);cursor:pointer}.segmented button.active{background:var(--sfm-card);color:var(--sfm-foreground);box-shadow:0 3px 12px rgba(3,18,37,.08)}.premium-grid,.activity-list{display:grid;gap:10px}.premium-grid{grid-template-columns:repeat(4,1fr)}.feature-card{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:16px;padding:14px;font-weight:900;color:var(--sfm-muted);display:flex;align-items:center;gap:9px}.plan-card{background:linear-gradient(135deg,var(--sfm-foreground),var(--sfm-primary-dark));color:var(--sfm-card);border-radius:20px;padding:18px;display:grid;gap:8px}.activity-item{display:flex;align-items:center;gap:12px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.1);border-radius:15px;padding:12px}.activity-item svg{color:var(--sfm-soft-cyan)}.danger-zone{border-color:rgba(185,28,28,.18);background:linear-gradient(135deg,var(--sfm-card),#FFF7F4)}.profile-toast{position:fixed;z-index:100;inset-inline-end:22px;bottom:22px;background:var(--sfm-foreground);color:var(--sfm-soft-cyan);border:1px solid rgba(167,243,240,.28);border-radius:16px;padding:13px 16px;font-weight:900;box-shadow:0 18px 45px rgba(3,18,37,.2)}
        .modal-overlay{position:fixed;inset:0;z-index:90;background:rgba(17,17,17,.45);backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px}.modal-card{width:min(520px,100%);background:var(--sfm-card);border:1px solid rgba(167,243,240,.18);border-radius:24px;padding:22px;box-shadow:0 24px 80px rgba(3,18,37,.28)}.modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.modal-head h3{margin:0;font-size:19px}.modal-fields{display:grid;gap:12px}.info-box{display:flex;gap:10px;align-items:flex-start;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:16px;padding:14px;color:var(--sfm-muted);line-height:1.7;font-weight:800}.info-box.danger{background:#FEF2F2;border-color:#FCA5A5;color:#B91C1C}.profile-loading{min-height:100vh;display:grid;place-items:center;background:var(--sfm-light-card);color:var(--sfm-muted);font-size:34px}
        @media(max-width:1180px){.profile-main{margin-inline-start:0}.profile-layout{grid-template-columns:1fr}.stats-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:720px){.profile-main{padding:14px}.profile-top{display:grid}.stats-grid,.form-grid,.pref-grid,.premium-grid{grid-template-columns:1fr}.hero-actions .ghost-btn,.hero-actions .gold-btn,.section-actions .ghost-btn,.section-actions .gold-btn,.section-actions .danger-btn{width:100%}.setting-row{align-items:flex-start;flex-direction:column}}
      `}</style>
    </div>
  );
}

function ProfileHeroCard({ initials, name, username, completion, language, labels, onEditPhoto, onView }: { initials: string; name: string; username: string; completion: number; language: string; labels: Record<string, string>; onEditPhoto: () => void; onView: () => void }) {
  return (
    <aside className="hero-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
        <div className="avatar">{initials}</div>
        <span className="premium-pill"><Crown size={15} />{labels.premium}</span>
      </div>
      <h2 style={{ margin: '18px 0 4px', fontSize: 24 }}>{name}</h2>
      <p style={{ margin: 0, color: 'rgba(255,255,255,.62)', direction: 'ltr' }}>@{username || 'sfm-user'}</p>
      <div style={{ margin: '16px 0', display: 'grid', gap: 9 }}>
        <MiniInfo label={labels.elite} value={labels.lastActivity} />
        <MiniInfo label={labels.selectedLanguage} value={language} />
        <MiniInfo label={labels.completion} value={`${completion}%`} />
      </div>
      <div style={{ height: 9, background: 'rgba(255,255,255,.12)', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ width: `${completion}%`, height: '100%', background: 'linear-gradient(90deg,var(--sfm-primary),var(--sfm-accent))', borderRadius: 99 }} />
      </div>
      <div className="hero-actions">
        <button className="ghost-btn dark-ghost" onClick={onEditPhoto}><Camera size={16} />{labels.editPhoto}</button>
        <button className="gold-btn" onClick={onView}><Eye size={16} />{labels.viewProfile}</button>
      </div>
    </aside>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}><span style={{ color: 'var(--sfm-soft-cyan)', fontWeight: 900 }}>{label}</span><strong>{value}</strong></div>;
}

function ProfileStatsCards({ labels, stats }: { labels: Record<string, string>; stats: { goals: number; investments: number; completion: number; health: number } }) {
  const cards = [
    { icon: <CheckCircle2 size={20} />, label: labels.goals, value: String(stats.goals) },
    { icon: <WalletCards size={20} />, label: labels.investmentStatus, value: stats.investments > 0 ? labels.active : labels.inactive },
    { icon: <BadgeCheck size={20} />, label: labels.completion, value: `${stats.completion}%` },
    { icon: <Activity size={20} />, label: labels.health, value: `${stats.health} / 100` },
  ];
  return <section className="stats-grid">{cards.map(card => <div className="stat-card" key={card.label}><div className="stat-icon">{card.icon}</div><span>{card.label}</span><strong>{card.value}</strong></div>)}</section>;
}

function PersonalInfoForm({ lang, profile, setProfile, preferences, setPreferences, saving, labels, onSave }: { lang: Lang; profile: ProfileState; setProfile: (next: ProfileState) => void; preferences: PreferencesState; setPreferences: (next: PreferencesState) => void; saving: boolean; labels: Record<string, string>; onSave: () => void }) {
  const update = (key: keyof ProfileState, value: string) => setProfile({ ...profile, [key]: value });
  return (
    <Section title={labels.title} icon={<User size={19} />}>
      <div className="form-grid">
        <Field icon={<User size={16} />} label={labels.fullName}><input value={profile.displayName} onChange={event => update('displayName', event.target.value)} /></Field>
        <Field icon={<BadgeCheck size={16} />} label={labels.username}><input value={profile.username} onChange={event => update('username', event.target.value)} /></Field>
        <Field icon={<Mail size={16} />} label={labels.email}><input value={profile.email} readOnly /></Field>
        <Field icon={<Phone size={16} />} label={labels.phone}><input value={profile.phone} onChange={event => update('phone', event.target.value)} /></Field>
        <Field icon={<Globe2 size={16} />} label={labels.phoneCode}><select value={profile.phoneCode} onChange={event => update('phoneCode', event.target.value)}>{phoneCodes.map(code => <option key={code}>{code}</option>)}</select></Field>
        <Field icon={<CalendarDays size={16} />} label={labels.age}><input type="number" value={profile.age} onChange={event => update('age', event.target.value)} /></Field>
        <Field icon={<User size={16} />} label={labels.gender}><select value={profile.gender} onChange={event => update('gender', event.target.value)}><option value="" /><option value="male">{labels.male}</option><option value="female">{labels.female}</option></select></Field>
        <Field icon={<MapPin size={16} />} label={labels.country}><select value={profile.country} onChange={event => update('country', event.target.value)}>{countries.map(country => <option key={country}>{country}</option>)}</select></Field>
        <Field icon={<MapPin size={16} />} label={labels.city}><input value={profile.city} onChange={event => update('city', event.target.value)} /></Field>
        <Field icon={<WalletCards size={16} />} label={labels.profession}><input value={profile.profession} onChange={event => update('profession', event.target.value)} /></Field>
        <Field icon={<WalletCards size={16} />} label={labels.currency}><CurrencySelect value={preferences.currency} onChange={code => setPreferences({ ...preferences, currency: code })} lang={lang} ariaLabel={labels.currency} /></Field>
        <Field icon={<Languages size={16} />} label={labels.language}><select value={preferences.language} onChange={event => setPreferences({ ...preferences, language: event.target.value as Lang })}><option value="ar">العربية</option><option value="en">English</option><option value="fr">Français</option></select></Field>
      </div>
      <div style={{ marginTop: 16 }}><button className="gold-btn" onClick={onSave} disabled={saving}><Save size={16} />{saving ? '...' : labels.save}</button></div>
    </Section>
  );
}

function SecuritySettings({ labels, onModal, onSignOutAll }: { labels: Record<string, string>; onModal: (modal: ModalKind) => void; onSignOutAll: () => void }) {
  return (
    <Section title={labels.title} icon={<ShieldCheck size={19} />}>
      <SettingRow icon={<KeyRound />} title={labels.changePassword} action={labels.open} onClick={() => onModal('password')} />
      <SettingRow icon={<ShieldCheck />} title={labels.twoFactor} action={labels.enable} onClick={() => onModal('twoFactor')} />
      <SettingRow icon={<Smartphone />} title={labels.devices} action={labels.view} onClick={() => onModal('devices')} />
      <SettingRow icon={<Activity />} title={labels.lastLogin} subtitle={labels.today} action={labels.view} onClick={() => onModal('devices')} />
      <SettingRow icon={<LogOut />} title={labels.signOutAll} action={labels.execute} onClick={onSignOutAll} />
    </Section>
  );
}

function PreferenceSettings({ lang, preferences, onChange, labels }: { lang: Lang; preferences: PreferencesState; onChange: (next: PreferencesState) => void; labels: Record<string, string> }) {
  const set = (patch: Partial<PreferencesState>) => onChange({ ...preferences, ...patch });
  return (
    <Section title={labels.title} icon={<Palette size={19} />}>
      <div className="pref-grid">
        <Choice label={labels.language} value={preferences.language} options={[['ar', 'العربية'], ['en', 'English'], ['fr', 'Français']]} onChange={value => set({ language: value as Lang })} />
        <Choice label={labels.theme} value={preferences.theme} options={[['light', labels.light], ['dark', labels.dark], ['system', labels.system]]} onChange={value => set({ theme: value as ThemeMode })} />
        <div><div className="mini-label" style={{ marginBottom: 7 }}>{labels.currency}</div><CurrencySelect value={preferences.currency} onChange={value => set({ currency: value })} lang={lang} ariaLabel={labels.currency} /></div>
        <Field icon={<CalendarDays size={16} />} label={labels.cycleStart}><input type="date" value={preferences.cycleStart} onChange={event => set({ cycleStart: event.target.value })} /></Field>
      </div>
      <div style={{ marginTop: 12 }}>
        <ToggleRow label={labels.luxury} checked={preferences.luxury} onChange={value => set({ luxury: value })} />
        <ToggleRow label={labels.reports} checked={preferences.reports} onChange={value => set({ reports: value })} />
        <ToggleRow label={labels.expenseAlerts} checked={preferences.expenses} onChange={value => set({ expenses: value })} />
        <ToggleRow label={labels.investmentAlerts} checked={preferences.investments} onChange={value => set({ investments: value })} />
        <ToggleRow label={labels.aiAlerts} checked={preferences.ai} onChange={value => set({ ai: value })} />
      </div>
    </Section>
  );
}

function PremiumFeatures({ labels, onManage }: { labels: Record<string, string>; onManage: () => void }) {
  const features = [labels.advancedAi, labels.smartAdvice, labels.pdf, labels.protection, labels.sync, labels.goals, labels.reports, labels.support];
  return (
    <Section title={labels.title} icon={<Crown size={19} />}>
      <div className="profile-layout" style={{ gridTemplateColumns: '280px 1fr' }}>
        <div className="plan-card"><span>{labels.plan}</span><h3>{labels.premium}</h3><p>{labels.start}: 2026-05-01</p><p>{labels.renewal}: 2027-05-01</p><button className="gold-btn" onClick={onManage}>{labels.manage}</button></div>
        <div className="premium-grid">{features.map(feature => <div className="feature-card" key={feature}><Star size={16} />{feature}</div>)}</div>
      </div>
    </Section>
  );
}

function AccountActivity({ labels, items }: { labels: Record<string, string>; items: string[] }) {
  return (
    <Section title={labels.title} icon={<Activity size={19} />}>
      <div className="activity-list">{items.length === 0 ? <p>{labels.noActivity}</p> : items.map((item, index) => <div className="activity-item" key={item}><Activity size={16} /><div><strong>{item}</strong><p style={{ margin: '3px 0 0', color: 'var(--sfm-muted)', fontSize: 12 }}>{labels.today} · {10 + index}:00</p></div></div>)}</div>
    </Section>
  );
}

function DangerZone({ labels, onExport, onDelete }: { labels: Record<string, string>; onExport: () => void; onDelete: () => void }) {
  return <Section title={labels.title} icon={<AlertTriangle size={19} />} className="danger-zone"><div className="section-actions"><button className="ghost-btn" onClick={onExport}><Download size={16} />{labels.exportData}</button><button className="danger-btn" onClick={onDelete}><Trash2 size={16} />{labels.deleteAccount}</button></div><p style={{ margin: '12px 0 0', color: '#B91C1C', fontWeight: 800 }}>{labels.deleteHint}</p></Section>;
}

function Section({ title, icon, children, className = '' }: { title: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`profile-card profile-section ${className}`}><div className="section-head">{icon}<h2>{title}</h2></div>{children}</section>;
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span><div className="input-wrap">{icon}{children}</div></label>;
}

function SettingRow({ icon, title, subtitle, action, onClick }: { icon: ReactNode; title: string; subtitle?: string; action: string; onClick: () => void }) {
  return <div className="setting-row"><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="stat-icon">{icon}</span><div><strong>{title}</strong>{subtitle && <p>{subtitle}</p>}</div></div><button className="ghost-btn" onClick={onClick}>{action}</button></div>;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="setting-row"><strong>{label}</strong><button className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><i /></button></div>;
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return <div><div className="mini-label" style={{ marginBottom: 7 }}>{label}</div><div className="segmented">{options.map(([id, name]) => <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{name}</button>)}</div></div>;
}

function ConfirmationModal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return <div className="modal-overlay"><div className="modal-card"><div className="modal-head"><h3>{title}</h3><button className="ghost-btn" onClick={onClose}>×</button></div>{children}</div></div>;
}

function InfoBox({ icon, text, danger }: { icon: ReactNode; text: string; danger?: boolean }) {
  return <div className={`info-box ${danger ? 'danger' : ''}`}>{icon}<p style={{ margin: 0 }}>{text}</p></div>;
}
