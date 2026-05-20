'use client';
/**
 * SFM Global Language Context & Hook
 * Provides multi-language support across all pages.
 * Persists language choice in localStorage.
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export type Lang = 'ar' | 'en' | 'fr';

export interface Translations {
  // Navigation
  home: string;
  profile: string;
  expenses: string;
  income: string;
  investments: string;
  savings: string;
  charity: string;
  projects: string;
  goals: string;
  reports: string;
  settings: string;
  notifications: string;
  ai: string;
  logout: string;

  // Profile Page
  personalInfo: string;
  password: string;
  incomeSources: string;
  financialGoals: string;
  investment: string;
  charitableWork: string;
  aiAnalytics: string;

  // Profile Fields
  fullName: string;
  username: string;
  age: string;
  gender: string;
  countryCode: string;
  phone: string;
  profession: string;
  email: string;
  male: string;
  female: string;
  saveChanges: string;
  backToDashboard: string;

  // Password
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  changePassword: string;

  // Income
  monthlyIncomeSources: string;
  totalIncome: string;

  // Dashboard
  welcome: string;
  financialOverview: string;
  totalIncomeLabel: string;
  totalExpenses: string;
  totalSavings: string;
  totalInvestment: string;
  netWealth: string;
  financialHealth: string;
  monthlyReport: string;

  // Actions
  add: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  confirm: string;
  close: string;

  // Messages
  saved: string;
  error: string;
  success: string;
  loading: string;

  // Footer
  allRightsReserved: string;
}

// ─────────────────────────────────────────────────────────
// Translation Data
// ─────────────────────────────────────────────────────────
const translations: Record<Lang, Translations> = {
  ar: {
    // Navigation
    home: 'الرئيسية',
    profile: 'الملف الشخصي',
    expenses: 'المصاريف',
    income: 'الدخل',
    investments: 'الاستثمارات',
    savings: 'الإدخار',
    charity: 'الأعمال الخيرية',
    projects: 'مشاريعي',
    goals: 'الأهداف المالية',
    reports: 'التقارير',
    settings: 'الإعدادات',
    notifications: 'الإشعارات',
    ai: 'تحليلات الذكاء',
    logout: 'تسجيل الخروج',

    // Profile Page
    personalInfo: 'المعلومات الشخصية',
    password: 'كلمة المرور',
    incomeSources: 'مصادر الدخل',
    financialGoals: 'الأهداف المالية',
    investment: 'الاستثمار',
    charitableWork: 'الأعمال الخيرية',
    aiAnalytics: 'AI التحليلات',

    // Profile Fields
    fullName: 'الاسم الكامل',
    username: 'اسم المستخدم',
    age: 'العمر',
    gender: 'الجنس',
    countryCode: 'رمز الدولة',
    phone: 'رقم الهاتف',
    profession: 'المهنة',
    email: 'البريد الإلكتروني',
    male: 'ذكر',
    female: 'أنثى',
    saveChanges: 'حفظ التغييرات',
    backToDashboard: 'لوحة التحكم',

    // Password
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة',
    confirmNewPassword: 'تأكيد كلمة المرور الجديدة',
    changePassword: 'تغيير كلمة المرور',

    // Income
    monthlyIncomeSources: 'مصادر الدخل الشهري',
    totalIncome: 'إجمالي الدخل',

    // Dashboard
    welcome: 'مرحباً',
    financialOverview: 'نظرة عامة على وضعك المالي',
    totalIncomeLabel: 'إجمالي الدخل',
    totalExpenses: 'إجمالي المصروفات',
    totalSavings: 'إجمالي الإدخار',
    totalInvestment: 'إجمالي الاستثمار',
    netWealth: 'صافي الثروة',
    financialHealth: 'الصحة المالية',
    monthlyReport: 'تقرير شهري',

    // Actions
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    close: 'إغلاق',

    // Messages
    saved: 'تم الحفظ بنجاح',
    error: 'حدث خطأ',
    success: 'تم بنجاح',
    loading: 'جارٍ التحميل...',

    // Footer
    allRightsReserved: 'جميع الحقوق محفوظة',
  },

  en: {
    // Navigation
    home: 'Home',
    profile: 'Profile',
    expenses: 'Expenses',
    income: 'Income',
    investments: 'Investments',
    savings: 'Savings',
    charity: 'Charity',
    projects: 'My Projects',
    goals: 'Financial Goals',
    reports: 'Reports',
    settings: 'Settings',
    notifications: 'Notifications',
    ai: 'AI Analytics',
    logout: 'Logout',

    // Profile Page
    personalInfo: 'Personal Info',
    password: 'Password',
    incomeSources: 'Income Sources',
    financialGoals: 'Financial Goals',
    investment: 'Investment',
    charitableWork: 'Charitable Work',
    aiAnalytics: 'AI Analytics',

    // Profile Fields
    fullName: 'Full Name',
    username: 'Username',
    age: 'Age',
    gender: 'Gender',
    countryCode: 'Country Code',
    phone: 'Phone Number',
    profession: 'Profession',
    email: 'Email',
    male: 'Male',
    female: 'Female',
    saveChanges: 'Save Changes',
    backToDashboard: 'Dashboard',

    // Password
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    changePassword: 'Change Password',

    // Income
    monthlyIncomeSources: 'Monthly Income Sources',
    totalIncome: 'Total Income',

    // Dashboard
    welcome: 'Welcome',
    financialOverview: 'Your Financial Overview',
    totalIncomeLabel: 'Total Income',
    totalExpenses: 'Total Expenses',
    totalSavings: 'Total Savings',
    totalInvestment: 'Total Investment',
    netWealth: 'Net Wealth',
    financialHealth: 'Financial Health',
    monthlyReport: 'Monthly Report',

    // Actions
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',

    // Messages
    saved: 'Saved successfully',
    error: 'An error occurred',
    success: 'Success',
    loading: 'Loading...',

    // Footer
    allRightsReserved: 'All rights reserved',
  },

  fr: {
    // Navigation
    home: 'Accueil',
    profile: 'Profil',
    expenses: 'Dépenses',
    income: 'Revenus',
    investments: 'Investissements',
    savings: 'Épargne',
    charity: 'Charité',
    projects: 'Mes Projets',
    goals: 'Objectifs Financiers',
    reports: 'Rapports',
    settings: 'Paramètres',
    notifications: 'Notifications',
    ai: 'Analyse IA',
    logout: 'Déconnexion',

    // Profile Page
    personalInfo: 'Informations Personnelles',
    password: 'Mot de Passe',
    incomeSources: 'Sources de Revenus',
    financialGoals: 'Objectifs Financiers',
    investment: 'Investissement',
    charitableWork: 'Actions Caritatives',
    aiAnalytics: 'Analyse IA',

    // Profile Fields
    fullName: 'Nom Complet',
    username: "Nom d'utilisateur",
    age: 'Âge',
    gender: 'Genre',
    countryCode: 'Indicatif',
    phone: 'Téléphone',
    profession: 'Profession',
    email: 'Email',
    male: 'Homme',
    female: 'Femme',
    saveChanges: 'Enregistrer',
    backToDashboard: 'Tableau de Bord',

    // Password
    currentPassword: 'Mot de Passe Actuel',
    newPassword: 'Nouveau Mot de Passe',
    confirmNewPassword: 'Confirmer le Mot de Passe',
    changePassword: 'Changer le Mot de Passe',

    // Income
    monthlyIncomeSources: 'Sources de Revenus Mensuels',
    totalIncome: 'Revenu Total',

    // Dashboard
    welcome: 'Bienvenue',
    financialOverview: 'Aperçu de Votre Situation Financière',
    totalIncomeLabel: 'Revenu Total',
    totalExpenses: 'Dépenses Totales',
    totalSavings: 'Épargne Totale',
    totalInvestment: 'Investissement Total',
    netWealth: 'Patrimoine Net',
    financialHealth: 'Santé Financière',
    monthlyReport: 'Rapport Mensuel',

    // Actions
    add: 'Ajouter',
    edit: 'Modifier',
    delete: 'Supprimer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    close: 'Fermer',

    // Messages
    saved: 'Enregistré avec succès',
    error: 'Une erreur est survenue',
    success: 'Succès',
    loading: 'Chargement...',

    // Footer
    allRightsReserved: 'Tous droits réservés',
  },
};

// ─────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────
interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  isAr: boolean;
  isEn: boolean;
  isFr: boolean;
  dir: 'rtl' | 'ltr';
  t: (key: keyof Translations) => string;
  t3: (ar: string, en: string, fr: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'sfm_lang';

// ─────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────
interface LanguageProviderProps {
  children: ReactNode;
  initialLang?: Lang;
}

export function LanguageProvider({ children, initialLang = 'ar' }: LanguageProviderProps) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && ['ar', 'en', 'fr'].includes(stored)) {
      setLangState(stored);
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    setLang,
    isAr: lang === 'ar',
    isEn: lang === 'en',
    isFr: lang === 'fr',
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    t: (key: keyof Translations) => translations[lang][key] || key,
    t3: (ar: string, en: string, fr: string) => {
      if (lang === 'ar') return ar;
      if (lang === 'fr') return fr;
      return en;
    },
  }), [lang, setLang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback for components not wrapped in provider
    return {
      lang: 'ar' as Lang,
      setLang: () => {},
      isAr: true,
      isEn: false,
      isFr: false,
      dir: 'rtl' as const,
      t: (key: keyof Translations) => translations.ar[key] || key,
      t3: (ar: string) => ar,
    };
  }
  return context;
}

// Legacy export for backwards compatibility
export { useLanguage as useLanguageLegacy };
