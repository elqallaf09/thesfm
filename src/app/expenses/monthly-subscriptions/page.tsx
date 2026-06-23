'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Edit3,
  Film,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Printer,
  ReceiptText,
  Sparkles,
  Trash2,
  Wifi,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { CurrencySelect } from '@/components/CurrencySelect';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { convertCurrencyAmount, approximateFxRate, fxKey, normalizeMoneyCurrencyCode } from '@/lib/currencyConversion';
import { formatMoney } from '@/lib/formatMoney';
import { useCurrency } from '@/lib/useCurrency';

type Lang = 'ar' | 'en' | 'fr';
type SubscriptionType = 'entertainment' | 'ai' | 'social' | 'telecom' | 'other';
type BillingFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

type Text = {
  title: string;
  subtitle: string;
  eyebrow: string;
  add: string;
  update: string;
  cancel: string;
  save: string;
  saving: string;
  backToExpenses: string;
  formTitle: string;
  formSubtitle: string;
  subscriptionType: string;
  service: string;
  customService: string;
  date: string;
  amount: string;
  currency: string;
  frequency: string;
  notes: string;
  monthlyImpact: string;
  yearlyImpact: string;
  totalMonthly: string;
  totalYearly: string;
  activeCount: string;
  highest: string;
  listTitle: string;
  listSubtitle: string;
  emptyTitle: string;
  emptyBody: string;
  saved: string;
  deleted: string;
  error: string;
  authRequired: string;
  nameRequired: string;
  amountRequired: string;
  dateRequired: string;
  deleteConfirm: string;
  expenseNote: string;
  examplesTitle: string;
  examplesSubtitle: string;
  showExamples: string;
  hideExamples: string;
  category: Record<SubscriptionType, string>;
  frequencyLabel: Record<BillingFrequency, string>;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency?: string | null;
  category?: string | null;
  date?: string | null;
  notes?: string | null;
  payment_method?: string | null;
  source?: string | null;
  enhanced?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FxRateResponse = {
  from?: string;
  to?: string;
  rate?: number | null;
  available?: boolean;
};

type FormState = {
  id?: string;
  type: SubscriptionType;
  service: string;
  customService: string;
  startedAt: string;
  amount: string;
  currency: string;
  frequency: BillingFrequency;
  notes: string;
};

const TEXT: Record<Lang, Text> = {
  ar: {
    title: 'الاشتراكات الشهرية',
    subtitle: 'سجّل اشتراكاتك المتكررة واحسب أثرها الشهري داخل المصاريف.',
    eyebrow: 'THE SFM / المصاريف',
    add: 'إضافة اشتراك',
    update: 'تحديث الاشتراك',
    cancel: 'إلغاء',
    save: 'حفظ الاشتراك',
    saving: 'جارٍ الحفظ...',
    backToExpenses: 'العودة إلى المصاريف',
    formTitle: 'بيانات الاشتراك',
    formSubtitle: 'اختر نوع الاشتراك والخدمة والتكرار ليتم احتسابه كمصروف اشتراك.',
    subscriptionType: 'نوع الاشتراك',
    service: 'الخدمة',
    customService: 'اسم الاشتراك',
    date: 'تاريخ الاشتراك',
    amount: 'مبلغ الاشتراك',
    currency: 'العملة',
    frequency: 'تكرار الدفع',
    notes: 'ملاحظات',
    monthlyImpact: 'الأثر الشهري',
    yearlyImpact: 'الأثر السنوي',
    totalMonthly: 'إجمالي الاشتراكات الشهرية',
    totalYearly: 'التكلفة السنوية المتوقعة',
    activeCount: 'عدد الاشتراكات',
    highest: 'أعلى اشتراك شهري',
    listTitle: 'قائمة الاشتراكات',
    listSubtitle: 'هذه السجلات محفوظة أيضاً ضمن المصاريف بتصنيف الاشتراكات.',
    emptyTitle: 'لا توجد اشتراكات بعد',
    emptyBody: 'أضف أول اشتراك مثل Netflix أو ChatGPT أو باقة الإنترنت لمعرفة أثره الشهري.',
    saved: 'تم حفظ الاشتراك وإضافته إلى المصاريف.',
    deleted: 'تم حذف الاشتراك من المصاريف.',
    error: 'تعذر تنفيذ العملية. يرجى المحاولة مرة أخرى.',
    authRequired: 'يجب تسجيل الدخول لإدارة الاشتراكات.',
    nameRequired: 'يرجى اختيار أو إدخال اسم الاشتراك.',
    amountRequired: 'يرجى إدخال مبلغ صحيح.',
    dateRequired: 'يرجى اختيار تاريخ الاشتراك.',
    deleteConfirm: 'هل تريد حذف هذا الاشتراك من المصاريف؟',
    expenseNote: 'يتم حفظ القيمة كأثر شهري داخل المصاريف مع حفظ مبلغ الدفع الأصلي داخل التفاصيل.',
    examplesTitle: 'أمثلة حسب نوع الاشتراك',
    examplesSubtitle: 'اختيار النوع يغيّر قائمة الخدمات المقترحة في الخانة التالية.',
    showExamples: 'عرض الأمثلة',
    hideExamples: 'إخفاء الأمثلة',
    category: {
      entertainment: 'وسائل الترفيه',
      ai: 'الذكاء الاصطناعي',
      social: 'وسائل التواصل الاجتماعي',
      telecom: 'اتصالات أو إنترنت',
      other: 'أخرى',
    },
    frequencyLabel: {
      daily: 'يومي',
      weekly: 'أسبوعي',
      monthly: 'شهري',
      yearly: 'سنوي',
    },
  },
  en: {
    title: 'Monthly Subscriptions',
    subtitle: 'Track recurring subscriptions and include their monthly impact in expenses.',
    eyebrow: 'THE SFM / Expenses',
    add: 'Add subscription',
    update: 'Update subscription',
    cancel: 'Cancel',
    save: 'Save subscription',
    saving: 'Saving...',
    backToExpenses: 'Back to expenses',
    formTitle: 'Subscription details',
    formSubtitle: 'Choose the type, service, and billing cycle to count it as a subscription expense.',
    subscriptionType: 'Subscription type',
    service: 'Service',
    customService: 'Subscription name',
    date: 'Subscription date',
    amount: 'Subscription amount',
    currency: 'Currency',
    frequency: 'Billing cycle',
    notes: 'Notes',
    monthlyImpact: 'Monthly impact',
    yearlyImpact: 'Yearly impact',
    totalMonthly: 'Total monthly subscriptions',
    totalYearly: 'Expected yearly cost',
    activeCount: 'Subscriptions count',
    highest: 'Highest monthly subscription',
    listTitle: 'Subscriptions list',
    listSubtitle: 'These records are also saved under expenses as subscriptions.',
    emptyTitle: 'No subscriptions yet',
    emptyBody: 'Add Netflix, ChatGPT, internet, or any recurring service to see its monthly impact.',
    saved: 'Subscription saved and added to expenses.',
    deleted: 'Subscription removed from expenses.',
    error: 'Could not complete the action. Please try again.',
    authRequired: 'Please sign in to manage subscriptions.',
    nameRequired: 'Please choose or enter a subscription name.',
    amountRequired: 'Please enter a valid amount.',
    dateRequired: 'Please choose the subscription date.',
    deleteConfirm: 'Delete this subscription from expenses?',
    expenseNote: 'The value is saved as a monthly expense impact while the original billing amount stays in the details.',
    examplesTitle: 'Examples by subscription type',
    examplesSubtitle: 'Changing the type updates the suggested services in the next field.',
    showExamples: 'Show examples',
    hideExamples: 'Hide examples',
    category: {
      entertainment: 'Entertainment',
      ai: 'Artificial intelligence',
      social: 'Social media',
      telecom: 'Telecom or internet',
      other: 'Other',
    },
    frequencyLabel: {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    },
  },
  fr: {
    title: 'Abonnements mensuels',
    subtitle: 'Suivez les abonnements récurrents et ajoutez leur impact mensuel aux dépenses.',
    eyebrow: 'THE SFM / Dépenses',
    add: 'Ajouter un abonnement',
    update: 'Mettre à jour',
    cancel: 'Annuler',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    backToExpenses: 'Retour aux dépenses',
    formTitle: 'Détails de l’abonnement',
    formSubtitle: 'Choisissez le type, le service et le cycle pour l’ajouter aux dépenses.',
    subscriptionType: 'Type d’abonnement',
    service: 'Service',
    customService: 'Nom de l’abonnement',
    date: 'Date d’abonnement',
    amount: 'Montant',
    currency: 'Devise',
    frequency: 'Cycle',
    notes: 'Notes',
    monthlyImpact: 'Impact mensuel',
    yearlyImpact: 'Impact annuel',
    totalMonthly: 'Total mensuel',
    totalYearly: 'Coût annuel prévu',
    activeCount: 'Nombre d’abonnements',
    highest: 'Abonnement mensuel le plus élevé',
    listTitle: 'Liste des abonnements',
    listSubtitle: 'Ces enregistrements sont aussi sauvegardés dans les dépenses.',
    emptyTitle: 'Aucun abonnement',
    emptyBody: 'Ajoutez Netflix, ChatGPT, internet ou un autre service récurrent.',
    saved: 'Abonnement enregistré dans les dépenses.',
    deleted: 'Abonnement supprimé des dépenses.',
    error: 'Action impossible. Veuillez réessayer.',
    authRequired: 'Connectez-vous pour gérer les abonnements.',
    nameRequired: 'Choisissez ou saisissez un nom.',
    amountRequired: 'Saisissez un montant valide.',
    dateRequired: 'Choisissez une date.',
    deleteConfirm: 'Supprimer cet abonnement des dépenses ?',
    expenseNote: 'La valeur est enregistrée comme impact mensuel, avec le montant original dans les détails.',
    examplesTitle: 'Exemples par type',
    examplesSubtitle: 'Le type choisi met à jour les services suggérés.',
    showExamples: 'Afficher les exemples',
    hideExamples: 'Masquer les exemples',
    category: {
      entertainment: 'Divertissement',
      ai: 'Intelligence artificielle',
      social: 'Réseaux sociaux',
      telecom: 'Télécom ou internet',
      other: 'Autre',
    },
    frequencyLabel: {
      daily: 'Quotidien',
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      yearly: 'Annuel',
    },
  },
};

type ServiceOption = { id: string; label: string };
type ServiceGroup = { label: string; options: ServiceOption[] };

const TELECOM_SERVICE_GROUPS: ServiceGroup[] = [
  {
    label: 'Gulf / الخليج',
    options: [
      { id: 'kw-zain', label: 'Zain Kuwait' },
      { id: 'kw-stc', label: 'stc Kuwait' },
      { id: 'kw-ooredoo', label: 'Ooredoo Kuwait' },
      { id: 'sa-stc', label: 'stc Saudi Arabia' },
      { id: 'sa-mobily', label: 'Mobily' },
      { id: 'sa-zain', label: 'Zain Saudi Arabia' },
      { id: 'sa-salam', label: 'Salam' },
      { id: 'sa-virgin', label: 'Virgin Mobile KSA' },
      { id: 'sa-lebara', label: 'Lebara KSA' },
      { id: 'ae-etisalat', label: 'e& UAE / Etisalat' },
      { id: 'ae-du', label: 'du UAE' },
      { id: 'ae-virgin', label: 'Virgin Mobile UAE' },
      { id: 'qa-ooredoo', label: 'Ooredoo Qatar' },
      { id: 'qa-vodafone', label: 'Vodafone Qatar' },
      { id: 'bh-batelco', label: 'Batelco Bahrain' },
      { id: 'bh-stc', label: 'stc Bahrain' },
      { id: 'bh-zain', label: 'Zain Bahrain' },
      { id: 'om-omantel', label: 'Omantel' },
      { id: 'om-ooredoo', label: 'Ooredoo Oman' },
      { id: 'om-vodafone', label: 'Vodafone Oman' },
      { id: 'om-awa', label: 'Awasr Oman' },
    ],
  },
  {
    label: 'Arab countries / الدول العربية',
    options: [
      { id: 'eg-vodafone', label: 'Vodafone Egypt' },
      { id: 'eg-orange', label: 'Orange Egypt' },
      { id: 'eg-etisalat', label: 'Etisalat Egypt' },
      { id: 'eg-we', label: 'WE / Telecom Egypt' },
      { id: 'jo-zain', label: 'Zain Jordan' },
      { id: 'jo-orange', label: 'Orange Jordan' },
      { id: 'jo-umniah', label: 'Umniah Jordan' },
      { id: 'lb-alfa', label: 'Alfa Lebanon' },
      { id: 'lb-touch', label: 'Touch Lebanon' },
      { id: 'ps-jawwal', label: 'Jawwal Palestine' },
      { id: 'ps-paltel', label: 'Paltel' },
      { id: 'ma-maroc-telecom', label: 'Maroc Telecom' },
      { id: 'ma-orange', label: 'Orange Morocco' },
      { id: 'ma-inwi', label: 'inwi Morocco' },
      { id: 'tn-tunisie-telecom', label: 'Tunisie Telecom' },
      { id: 'tn-ooredoo', label: 'Ooredoo Tunisia' },
      { id: 'tn-orange', label: 'Orange Tunisia' },
      { id: 'dz-mobilis', label: 'Mobilis Algeria' },
      { id: 'dz-djezzy', label: 'Djezzy Algeria' },
      { id: 'dz-ooredoo', label: 'Ooredoo Algeria' },
      { id: 'dz-algerie-telecom', label: 'Algerie Telecom' },
      { id: 'iq-asiacell', label: 'Asiacell Iraq' },
      { id: 'iq-zain', label: 'Zain Iraq' },
      { id: 'iq-korek', label: 'Korek Telecom' },
      { id: 'iq-earthlink', label: 'EarthLink Iraq' },
      { id: 'ly-libyana', label: 'Libyana' },
      { id: 'ly-almadar', label: 'Almadar' },
      { id: 'sd-zain', label: 'Zain Sudan' },
      { id: 'sd-sudani', label: 'Sudani' },
      { id: 'sd-mtn', label: 'MTN Sudan' },
      { id: 'sd-canar', label: 'Canar Telecom' },
      { id: 'sy-syriatel', label: 'Syriatel' },
      { id: 'sy-mtn', label: 'MTN Syria' },
      { id: 'ye-yemen-mobile', label: 'Yemen Mobile' },
      { id: 'ye-sabafon', label: 'Sabafon' },
      { id: 'ye-mtn', label: 'MTN Yemen' },
      { id: 'ye-y-telecom', label: 'Y Telecom' },
      { id: 'mr-mauritel', label: 'Mauritel' },
      { id: 'mr-chinguitel', label: 'Chinguitel' },
    ],
  },
  {
    label: 'Global / عالمي',
    options: [
      { id: 'us-att', label: 'AT&T' },
      { id: 'us-verizon', label: 'Verizon' },
      { id: 'us-tmobile', label: 'T-Mobile' },
      { id: 'us-xfinity', label: 'Xfinity Internet' },
      { id: 'us-spectrum', label: 'Spectrum' },
      { id: 'us-cox', label: 'Cox Communications' },
      { id: 'ca-rogers', label: 'Rogers Canada' },
      { id: 'ca-bell', label: 'Bell Canada' },
      { id: 'ca-telus', label: 'TELUS' },
      { id: 'au-telstra', label: 'Telstra' },
      { id: 'au-optus', label: 'Optus' },
      { id: 'au-tpg', label: 'TPG Telecom' },
      { id: 'global-vodafone', label: 'Vodafone' },
      { id: 'global-orange', label: 'Orange' },
      { id: 'global-mtn', label: 'MTN Group' },
      { id: 'global-airtel', label: 'Airtel' },
      { id: 'global-jio', label: 'Jio' },
      { id: 'global-telefonica', label: 'Telefonica / Movistar' },
      { id: 'global-deutsche-telekom', label: 'Deutsche Telekom / T-Mobile' },
    ],
  },
  {
    label: 'Asia / آسيا',
    options: [
      { id: 'jp-docomo', label: 'NTT Docomo' },
      { id: 'jp-kddi', label: 'KDDI au' },
      { id: 'jp-softbank', label: 'SoftBank Japan' },
      { id: 'jp-rakuten', label: 'Rakuten Mobile' },
      { id: 'kr-sk', label: 'SK Telecom' },
      { id: 'kr-kt', label: 'KT' },
      { id: 'kr-lgu', label: 'LG U+' },
      { id: 'cn-mobile', label: 'China Mobile' },
      { id: 'cn-unicom', label: 'China Unicom' },
      { id: 'cn-telecom', label: 'China Telecom' },
      { id: 'tw-chunghwa', label: 'Chunghwa Telecom' },
      { id: 'tw-taiwan-mobile', label: 'Taiwan Mobile' },
      { id: 'tw-fareastone', label: 'Far EasTone' },
      { id: 'sg-singtel', label: 'Singtel' },
      { id: 'sg-starhub', label: 'StarHub' },
      { id: 'sg-m1', label: 'M1 Singapore' },
      { id: 'my-maxis', label: 'Maxis Malaysia' },
      { id: 'my-celcomdigi', label: 'CelcomDigi' },
      { id: 'my-u-mobile', label: 'U Mobile' },
      { id: 'my-unifi', label: 'Unifi / Telekom Malaysia' },
      { id: 'th-ais', label: 'AIS Thailand' },
      { id: 'th-true', label: 'True Thailand' },
      { id: 'th-dtac', label: 'dtac Thailand' },
      { id: 'id-telkomsel', label: 'Telkomsel' },
      { id: 'id-indosat', label: 'Indosat Ooredoo Hutchison' },
      { id: 'id-xl', label: 'XL Axiata' },
      { id: 'ph-globe', label: 'Globe Telecom' },
      { id: 'ph-smart', label: 'Smart Communications' },
      { id: 'ph-pldt', label: 'PLDT' },
      { id: 'ph-converge', label: 'Converge ICT' },
      { id: 'vn-viettel', label: 'Viettel' },
      { id: 'vn-vinaphone', label: 'Vinaphone' },
      { id: 'vn-mobifone', label: 'MobiFone' },
      { id: 'vn-fpt', label: 'FPT Telecom' },
      { id: 'in-jio', label: 'Jio India' },
      { id: 'in-airtel', label: 'Airtel India' },
      { id: 'in-vi', label: 'Vi / Vodafone Idea' },
      { id: 'in-bsnl', label: 'BSNL' },
      { id: 'pk-jazz', label: 'Jazz Pakistan' },
      { id: 'pk-zong', label: 'Zong Pakistan' },
      { id: 'pk-telenor', label: 'Telenor Pakistan' },
      { id: 'pk-ptcl', label: 'PTCL' },
      { id: 'bd-grameenphone', label: 'Grameenphone' },
      { id: 'bd-robi', label: 'Robi' },
      { id: 'bd-banglalink', label: 'Banglalink' },
      { id: 'lk-dialog', label: 'Dialog Sri Lanka' },
      { id: 'lk-slt', label: 'SLT-Mobitel' },
      { id: 'np-ntc', label: 'Nepal Telecom' },
      { id: 'np-ncell', label: 'Ncell' },
    ],
  },
  {
    label: 'Europe / أوروبا',
    options: [
      { id: 'uk-bt', label: 'BT' },
      { id: 'uk-ee', label: 'EE' },
      { id: 'uk-vodafone', label: 'Vodafone UK' },
      { id: 'uk-o2', label: 'O2 UK' },
      { id: 'uk-three', label: 'Three UK' },
      { id: 'uk-virgin-media', label: 'Virgin Media O2' },
      { id: 'fr-orange', label: 'Orange France' },
      { id: 'fr-sfr', label: 'SFR' },
      { id: 'fr-bouygues', label: 'Bouygues Telecom' },
      { id: 'fr-free', label: 'Free Mobile' },
      { id: 'de-telekom', label: 'Telekom Germany' },
      { id: 'de-vodafone', label: 'Vodafone Germany' },
      { id: 'de-o2', label: 'O2 Germany' },
      { id: 'es-movistar', label: 'Movistar Spain' },
      { id: 'es-orange', label: 'Orange Spain' },
      { id: 'es-vodafone', label: 'Vodafone Spain' },
      { id: 'es-masmovil', label: 'MasMovil / Yoigo' },
      { id: 'it-tim', label: 'TIM Italy' },
      { id: 'it-vodafone', label: 'Vodafone Italy' },
      { id: 'it-windtre', label: 'WindTre' },
      { id: 'it-iliad', label: 'Iliad Italy' },
      { id: 'nl-kpn', label: 'KPN Netherlands' },
      { id: 'nl-vodafoneziggo', label: 'VodafoneZiggo' },
      { id: 'be-proximus', label: 'Proximus Belgium' },
      { id: 'be-orange', label: 'Orange Belgium' },
      { id: 'ch-swisscom', label: 'Swisscom' },
      { id: 'ch-sunrise', label: 'Sunrise Switzerland' },
      { id: 'at-a1', label: 'A1 Telekom Austria' },
      { id: 'at-magenta', label: 'Magenta Telekom Austria' },
      { id: 'pt-meo', label: 'MEO / Altice Portugal' },
      { id: 'pt-nos', label: 'NOS Portugal' },
      { id: 'se-telia', label: 'Telia Sweden' },
      { id: 'se-tele2', label: 'Tele2 Sweden' },
      { id: 'no-telenor', label: 'Telenor Norway' },
      { id: 'dk-tdc', label: 'TDC Denmark' },
      { id: 'fi-elisa', label: 'Elisa Finland' },
      { id: 'fi-dna', label: 'DNA Finland' },
      { id: 'tr-turkcell', label: 'Turkcell' },
      { id: 'tr-turktelekom', label: 'Turk Telekom' },
      { id: 'tr-vodafone', label: 'Vodafone Turkey' },
    ],
  },
  {
    label: 'Other / أخرى',
    options: [
      { id: 'home-internet', label: 'Home Internet' },
      { id: 'fiber', label: 'Fiber Internet' },
      { id: 'mobile-data', label: 'Mobile Data' },
      { id: 'other', label: 'Other provider' },
    ],
  },
];

const SERVICE_OPTIONS: Record<SubscriptionType, ServiceOption[]> = {
  entertainment: [
    { id: 'netflix', label: 'Netflix' },
    { id: 'shahid', label: 'Shahid' },
    { id: 'osn', label: 'OSN+' },
    { id: 'disney', label: 'Disney+' },
    { id: 'youtube', label: 'YouTube Premium' },
    { id: 'spotify', label: 'Spotify' },
    { id: 'anghami', label: 'Anghami' },
    { id: 'apple-tv', label: 'Apple TV+' },
    { id: 'other', label: 'Other' },
  ],
  ai: [
    { id: 'chatgpt', label: 'ChatGPT' },
    { id: 'claude', label: 'Claude' },
    { id: 'gemini', label: 'Gemini' },
    { id: 'perplexity', label: 'Perplexity' },
    { id: 'midjourney', label: 'Midjourney' },
    { id: 'canva-ai', label: 'Canva AI' },
    { id: 'cursor', label: 'Cursor' },
    { id: 'github-copilot', label: 'GitHub Copilot' },
    { id: 'other', label: 'Other' },
  ],
  social: [
    { id: 'x-premium', label: 'X Premium' },
    { id: 'snapchat-plus', label: 'Snapchat+' },
    { id: 'meta-verified', label: 'Meta Verified' },
    { id: 'linkedin-premium', label: 'LinkedIn Premium' },
    { id: 'telegram-premium', label: 'Telegram Premium' },
    { id: 'other', label: 'Other' },
  ],
  telecom: TELECOM_SERVICE_GROUPS.flatMap(group => group.options),
  other: [
    { id: 'gym', label: 'Gym' },
    { id: 'icloud', label: 'iCloud' },
    { id: 'google-one', label: 'Google One' },
    { id: 'microsoft-365', label: 'Microsoft 365' },
    { id: 'adobe', label: 'Adobe' },
    { id: 'domain-hosting', label: 'Domain / Hosting' },
    { id: 'other', label: 'Other' },
  ],
};

const TYPE_ICONS: Record<SubscriptionType, LucideIcon> = {
  entertainment: Film,
  ai: Bot,
  social: MessageCircle,
  telecom: Wifi,
  other: MoreHorizontal,
};

const OPTIONAL_EXPENSE_COLUMNS = [
  'currency',
  'category',
  'date',
  'payment_method',
  'notes',
  'source',
  'enhanced',
  'is_recurring',
  'frequency',
  'start_date',
  'end_date',
  'updated_at',
] as const;

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function cleanNumber(value: string) {
  return value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 1000) / 1000;
}

function monthlyAmount(amount: number, frequency: BillingFrequency) {
  if (frequency === 'daily') return amount * 30.4375;
  if (frequency === 'weekly') return amount * 52 / 12;
  if (frequency === 'yearly') return amount / 12;
  return amount;
}

function missingColumnFromError(message: string) {
  const match = message.match(/column\s+["']?(?:\w+\.)?(\w+)["']?\s+(?:does not exist|not found)/i)
    ?? message.match(/could not find the ['"]?(\w+)['"]? column/i);
  return match?.[1];
}

function isSchemaColumnError(error: unknown) {
  const message = typeof error === 'object' && error && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : String(error ?? '');
  return /column|schema cache|pgrst204|does not exist|could not find/i.test(message);
}

function metadata(row: SubscriptionRow) {
  return row.enhanced && typeof row.enhanced === 'object' ? row.enhanced : {};
}

function safeType(value: unknown): SubscriptionType {
  return value === 'entertainment' || value === 'ai' || value === 'social' || value === 'telecom' || value === 'other'
    ? value
    : 'other';
}

function safeFrequency(value: unknown): BillingFrequency {
  return value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'yearly'
    ? value
    : 'monthly';
}

function serviceLabel(type: SubscriptionType, serviceId: string, custom = '') {
  if (custom.trim()) return custom.trim();
  return SERVICE_OPTIONS[type].find(item => item.id === serviceId)?.label ?? serviceId;
}

function emptyForm(currency = 'KWD'): FormState {
  return {
    type: 'entertainment',
    service: SERVICE_OPTIONS.entertainment[0].id,
    customService: '',
    startedAt: todayInputDate(),
    amount: '',
    currency,
    frequency: 'monthly',
    notes: '',
  };
}

export default function MonthlySubscriptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale: Lang = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const copy = TEXT[locale];
  const { currency: userCurrency } = useCurrency();
  const baseCurrency = normalizeMoneyCurrencyCode(userCurrency, 'KWD');
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [form, setForm] = useState<FormState>(() => emptyForm(baseCurrency));
  const [formOpen, setFormOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [fxRates, setFxRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const currency = normalizeMoneyCurrencyCode(form.currency, baseCurrency);
  const billingAmount = toNumber(form.amount);
  const projectedMonthly = roundMoney(monthlyAmount(billingAmount, form.frequency));
  const projectedYearly = roundMoney(projectedMonthly * 12);

  const loadData = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const db = supabase as any;
    try {
      const { data, error: queryError } = await db
        .from('expense_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', 'subscriptions')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (queryError) throw queryError;
      setRows((data ?? []) as SubscriptionRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.error);
    } finally {
      setLoading(false);
    }
  }, [copy.error, user]);

  useEffect(() => {
    if (!authLoading) void loadData();
  }, [authLoading, loadData]);

  useEffect(() => {
    if (!formOpen && !form.id) setForm(current => ({ ...current, currency: current.currency || baseCurrency }));
  }, [baseCurrency, form.id, formOpen]);

  useEffect(() => {
    const sourceCurrencies = Array.from(new Set(
      rows
        .map(row => normalizeMoneyCurrencyCode(row.currency, baseCurrency))
        .filter(code => code !== baseCurrency),
    ));

    if (!sourceCurrencies.length) return;

    let cancelled = false;

    const fallbackRates = sourceCurrencies.reduce<Record<string, number>>((next, from) => {
      const rate = approximateFxRate(from, baseCurrency);
      if (rate) next[fxKey(from, baseCurrency)] = rate;
      return next;
    }, {});
    if (Object.keys(fallbackRates).length) {
      setFxRates(current => ({ ...current, ...fallbackRates }));
    }

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/market/fx/batch', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pairs: sourceCurrencies.map(from => ({ from, to: baseCurrency })),
          }),
        });
        const payload = await response.json() as { rates?: FxRateResponse[] };
        if (cancelled) return;
        const liveRates = (payload.rates ?? []).reduce<Record<string, number>>((next, item) => {
          const from = normalizeMoneyCurrencyCode(item.from, '');
          const to = normalizeMoneyCurrencyCode(item.to, '');
          const rate = Number(item.rate);
          if (item.available && from && to && Number.isFinite(rate) && rate > 0) {
            next[fxKey(from, to)] = rate;
          }
          return next;
        }, {});
        if (Object.keys(liveRates).length) {
          setFxRates(current => ({ ...current, ...liveRates }));
        }
      } catch {
        // Keep the local fallback conversion so mixed-currency totals are not summed as raw numbers.
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [baseCurrency, rows]);

  const totals = useMemo(() => {
    const convertedRows = rows.map(row => {
      const rowCurrency = normalizeMoneyCurrencyCode(row.currency, baseCurrency);
      const monthlyNative = toNumber(row.amount);
      return {
        row,
        monthlyNative,
        convertedMonthly: convertCurrencyAmount(monthlyNative, rowCurrency, baseCurrency, fxRates),
      };
    });
    const monthly = convertedRows.reduce((sum, item) => sum + (item.convertedMonthly ?? 0), 0);
    const highest = convertedRows.reduce<typeof convertedRows[number] | null>((current, item) => {
      if (item.convertedMonthly === null) return current;
      if (!current || item.convertedMonthly > (current.convertedMonthly ?? 0)) return item;
      return current;
    }, null);
    return { monthly: roundMoney(monthly), yearly: roundMoney(monthly * 12), highest: highest?.row ?? null };
  }, [baseCurrency, fxRates, rows]);

  function changeType(type: SubscriptionType) {
    setForm(current => ({
      ...current,
      type,
      service: SERVICE_OPTIONS[type][0].id,
      customService: '',
    }));
  }

  function editRow(row: SubscriptionRow) {
    const meta = metadata(row);
    const type = safeType(meta.subscription_type);
    const storedService = String(meta.subscription_service ?? '');
    const serviceExists = SERVICE_OPTIONS[type].some(item => item.id === storedService);
    const label = String(meta.service_label ?? row.name ?? '');
    setForm({
      id: row.id,
      type,
      service: serviceExists ? storedService : 'other',
      customService: serviceExists ? '' : label,
      startedAt: String(meta.subscription_start_date ?? row.date ?? todayInputDate()).slice(0, 10),
      amount: String(meta.billing_amount ?? row.amount ?? ''),
      currency: row.currency || userCurrency || 'KWD',
      frequency: safeFrequency(meta.billing_frequency),
      notes: row.notes || '',
    });
    setFormOpen(true);
    setNotice('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openNewForm() {
    setForm(emptyForm(baseCurrency));
    setFormOpen(true);
    setNotice('');
    setError('');
  }

  function resetForm() {
    setForm(emptyForm(baseCurrency));
    setFormOpen(false);
    setNotice('');
    setError('');
  }

  async function writeExpense(payload: Record<string, unknown>, id?: string) {
    const db = supabase as any;
    let nextPayload = { ...payload };
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= OPTIONAL_EXPENSE_COLUMNS.length; attempt += 1) {
      const request = id
        ? db.from('expense_items').update(nextPayload).eq('id', id).eq('user_id', user?.id).select('*').maybeSingle()
        : db.from('expense_items').insert(nextPayload).select('*').single();
      const { data, error: saveError } = await request;
      if (!saveError) return data as SubscriptionRow;
      lastError = saveError;
      const missingColumn = missingColumnFromError(String(saveError.message ?? ''));
      if (
        !isSchemaColumnError(saveError) ||
        !missingColumn ||
        !OPTIONAL_EXPENSE_COLUMNS.includes(missingColumn as typeof OPTIONAL_EXPENSE_COLUMNS[number]) ||
        !(missingColumn in nextPayload)
      ) {
        throw saveError;
      }
      const { [missingColumn]: _removed, ...remainingPayload } = nextPayload;
      nextPayload = remainingPayload;
    }

    throw lastError instanceof Error ? lastError : new Error(copy.error);
  }

  async function saveSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setNotice('');
    setError('');
    if (!user) {
      setError(copy.authRequired);
      return;
    }
    const name = serviceLabel(form.type, form.service, form.customService);
    if (!name || name === 'other') {
      setError(copy.nameRequired);
      return;
    }
    if (!billingAmount || billingAmount <= 0 || !projectedMonthly) {
      setError(copy.amountRequired);
      return;
    }
    if (!form.startedAt) {
      setError(copy.dateRequired);
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const payload = {
      user_id: user.id,
      name,
      amount: projectedMonthly,
      currency,
      category: 'subscriptions',
      date: form.startedAt,
      payment_method: 'card',
      notes: form.notes || null,
      source: 'subscription',
      is_recurring: true,
      frequency: 'monthly',
      start_date: form.startedAt,
      end_date: null,
      enhanced: {
        source: 'subscription',
        subscription_type: form.type,
        subscription_service: form.service,
        service_label: name,
        billing_frequency: form.frequency,
        billing_amount: billingAmount,
        billing_currency: currency,
        monthly_amount: projectedMonthly,
        yearly_amount: projectedYearly,
        subscription_start_date: form.startedAt,
        created_from: 'monthly_subscriptions_page',
      },
      updated_at: now,
    };

    try {
      await writeExpense(payload, form.id);
      await loadData();
      setForm(emptyForm(baseCurrency));
      setFormOpen(false);
      setNotice(copy.saved);
    } catch (err) {
      console.error('Monthly subscription save failed:', err);
      setError(copy.error);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(row: SubscriptionRow) {
    if (!user) return;
    if (!window.confirm(copy.deleteConfirm)) return;
    setNotice('');
    setError('');
    const db = supabase as any;
    const { error: deleteError } = await db
      .from('expense_items')
      .delete()
      .eq('id', row.id)
      .eq('user_id', user.id);
    if (deleteError) {
      setError(copy.error);
      return;
    }
    setRows(current => current.filter(item => item.id !== row.id));
    setNotice(copy.deleted);
  }

  function printSubscriptionsReport() {
    window.setTimeout(() => window.print(), 80);
  }

  const pageError = error || supabaseConfigError;

  return (
    <div className="subscriptions-shell" dir={dir}>
      <Sidebar />
      <main className="subscriptions-main">
        <section className="subscriptions-hero">
          <div>
            <span className="subscriptions-eyebrow"><CreditCard size={16} /> {copy.eyebrow}</span>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>
          <div className="subscriptions-hero-actions">
            <Link href="/expenses" className="subscriptions-secondary">
              {copy.backToExpenses}
            </Link>
            <button type="button" className="subscriptions-secondary" onClick={printSubscriptionsReport}>
              <Printer size={18} />
              {locale === 'ar' ? 'تصدير PDF' : locale === 'fr' ? 'Exporter PDF' : 'Export PDF'}
            </button>
            <button type="button" className="subscriptions-primary" onClick={openNewForm}>
              <Plus size={18} />
              {copy.add}
            </button>
          </div>
        </section>

        {(notice || pageError) && (
          <section className={`subscriptions-notice ${pageError ? 'error' : 'success'}`}>
            {pageError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{pageError || notice}</span>
          </section>
        )}

        <section className="subscriptions-summary-grid">
          <article>
            <span><ReceiptText size={18} /></span>
            <small>{copy.totalMonthly}</small>
            <strong dir="ltr">{formatMoney(totals.monthly, baseCurrency, locale)}</strong>
          </article>
          <article>
            <span><CalendarDays size={18} /></span>
            <small>{copy.totalYearly}</small>
            <strong dir="ltr">{formatMoney(totals.yearly, baseCurrency, locale)}</strong>
          </article>
          <article>
            <span><CreditCard size={18} /></span>
            <small>{copy.activeCount}</small>
            <strong dir="ltr">{rows.length}</strong>
          </article>
          <article>
            <span><Sparkles size={18} /></span>
            <small>{copy.highest}</small>
            <strong dir="auto">{totals.highest ? `${totals.highest.name} · ${formatMoney(toNumber(totals.highest.amount), totals.highest.currency || currency, locale)}` : '-'}</strong>
          </article>
        </section>

        {formOpen && (
        <section className="subscriptions-form-wrap">
          <form className="subscriptions-form-card" onSubmit={saveSubscription}>
            <div className="subscriptions-section-head">
              <div>
                <span>{form.id ? copy.update : copy.add}</span>
                <h2>{copy.formTitle}</h2>
                <p>{copy.formSubtitle}</p>
              </div>
            </div>

            <div className="subscriptions-type-grid">
              {(Object.keys(copy.category) as SubscriptionType[]).map(type => {
                const Icon = TYPE_ICONS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    className={form.type === type ? 'active' : ''}
                    onClick={() => changeType(type)}
                  >
                    <Icon size={18} />
                    <span>{copy.category[type]}</span>
                  </button>
                );
              })}
            </div>

            <div className="subscriptions-form-grid">
              <label>
                <span>{copy.service}</span>
                <select value={form.service} onChange={event => setForm(current => ({ ...current, service: event.target.value }))}>
                  {form.type === 'telecom' ? TELECOM_SERVICE_GROUPS.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map(option => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </optgroup>
                  )) : SERVICE_OPTIONS[form.type].map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>

              {(form.service === 'other' || form.type === 'other') && (
                <label>
                  <span>{copy.customService}</span>
                  <input value={form.customService} onChange={event => setForm(current => ({ ...current, customService: event.target.value }))} placeholder="Netflix, ChatGPT..." />
                </label>
              )}

              <label>
                <span>{copy.date}</span>
                <input type="date" value={form.startedAt} onChange={event => setForm(current => ({ ...current, startedAt: event.target.value }))} />
              </label>

              <label>
                <span>{copy.amount}</span>
                <input inputMode="decimal" dir="ltr" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: cleanNumber(event.target.value) }))} />
              </label>

              <label>
                <span>{copy.currency}</span>
                <CurrencySelect value={currency} onChange={code => setForm(current => ({ ...current, currency: code }))} lang={locale} ariaLabel={copy.currency} />
              </label>

              <label>
                <span>{copy.frequency}</span>
                <select value={form.frequency} onChange={event => setForm(current => ({ ...current, frequency: event.target.value as BillingFrequency }))}>
                  {(Object.keys(copy.frequencyLabel) as BillingFrequency[]).map(key => (
                    <option key={key} value={key}>{copy.frequencyLabel[key]}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="subscriptions-notes-field">
              <span>{copy.notes}</span>
              <textarea value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} />
            </label>

            <div className="subscriptions-impact-card">
              <div>
                <span>{copy.monthlyImpact}</span>
                <strong dir="ltr">{formatMoney(projectedMonthly, currency, locale)}</strong>
              </div>
              <div>
                <span>{copy.yearlyImpact}</span>
                <strong dir="ltr">{formatMoney(projectedYearly, currency, locale)}</strong>
              </div>
              <p>{copy.expenseNote}</p>
            </div>

            <div className="subscriptions-form-actions">
              {form.id && <button type="button" className="subscriptions-secondary" onClick={resetForm}>{copy.cancel}</button>}
              <button type="submit" className="subscriptions-primary" disabled={saving || authLoading || loading}>
                {saving ? copy.saving : form.id ? copy.update : copy.save}
              </button>
            </div>
          </form>
        </section>
        )}

        <section className="subscriptions-examples-card subscriptions-examples-card--wide">
            <div className="subscriptions-section-head subscriptions-section-head--interactive">
              <div>
                <span>THE SFM</span>
                <h2>{copy.examplesTitle}</h2>
                <p>{copy.examplesSubtitle}</p>
              </div>
              <button
                type="button"
                className="subscriptions-examples-toggle"
                aria-expanded={examplesOpen}
                aria-controls="subscription-examples-list"
                onClick={() => setExamplesOpen(current => !current)}
              >
                {examplesOpen ? copy.hideExamples : copy.showExamples}
                <ChevronDown size={16} className={examplesOpen ? 'open' : ''} />
              </button>
            </div>
            {examplesOpen && (
            <div id="subscription-examples-list" className="subscriptions-examples-list">
              {(Object.keys(SERVICE_OPTIONS) as SubscriptionType[]).map(type => {
                const Icon = TYPE_ICONS[type];
                return (
                  <article key={type} className={type === 'telecom' ? 'telecom-example' : undefined}>
                    <strong><Icon size={16} /> {copy.category[type]}</strong>
                    {type === 'telecom' ? (
                      <div className="subscriptions-provider-groups">
                        {TELECOM_SERVICE_GROUPS.map(group => (
                          <p key={group.label}>
                            <b>{group.label}</b>
                            <span>{group.options.map(item => item.label).join(' · ')}</span>
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p>{SERVICE_OPTIONS[type].map(item => item.label).join(' · ')}</p>
                    )}
                  </article>
                );
              })}
            </div>
            )}
        </section>

        <section className="subscriptions-list-card">
          <div className="subscriptions-section-head">
            <div>
              <span>{copy.listSubtitle}</span>
              <h2>{copy.listTitle}</h2>
            </div>
          </div>

          {authLoading || loading ? (
            <div className="subscriptions-empty">{copy.saving}</div>
          ) : !user ? (
            <div className="subscriptions-empty">
              <AlertTriangle size={28} />
              <h3>{copy.authRequired}</h3>
            </div>
          ) : rows.length === 0 ? (
            <div className="subscriptions-empty">
              <CreditCard size={30} />
              <h3>{copy.emptyTitle}</h3>
              <p>{copy.emptyBody}</p>
            </div>
          ) : (
            <div className="subscriptions-table">
              {rows.map(row => {
                const meta = metadata(row);
                const type = safeType(meta.subscription_type);
                const frequency = safeFrequency(meta.billing_frequency);
                const Icon = TYPE_ICONS[type];
                const originalAmount = toNumber(meta.billing_amount ?? row.amount);
                return (
                  <article key={row.id} className="subscription-row-card">
                    <div className="subscription-row-main">
                      <span className="subscription-row-icon"><Icon size={18} /></span>
                      <div>
                        <h3>{row.name}</h3>
                        <p>{copy.category[type]} · {copy.frequencyLabel[frequency]}</p>
                      </div>
                    </div>
                    <div className="subscription-row-metrics">
                      <div>
                        <span>{copy.amount}</span>
                        <b dir="ltr">{formatMoney(originalAmount, row.currency || currency, locale)}</b>
                      </div>
                      <div>
                        <span>{copy.monthlyImpact}</span>
                        <b dir="ltr">{formatMoney(toNumber(row.amount), row.currency || currency, locale)}</b>
                      </div>
                      <div>
                        <span>{copy.date}</span>
                        <b>{row.date || '-'}</b>
                      </div>
                    </div>
                    <div className="subscription-row-actions">
                      <button type="button" onClick={() => editRow(row)}><Edit3 size={15} />{copy.update}</button>
                      <button type="button" className="danger" onClick={() => void deleteRow(row)}><Trash2 size={15} />{locale === 'ar' ? 'حذف' : locale === 'fr' ? 'Supprimer' : 'Delete'}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="subscriptions-print-report" aria-hidden="true">
          <header>
            <span>THE SFM</span>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </header>
          <div className="subscriptions-print-summary">
            <article>
              <small>{copy.totalMonthly}</small>
              <strong dir="ltr">{formatMoney(totals.monthly, baseCurrency, locale)}</strong>
            </article>
            <article>
              <small>{copy.totalYearly}</small>
              <strong dir="ltr">{formatMoney(totals.yearly, baseCurrency, locale)}</strong>
            </article>
            <article>
              <small>{copy.activeCount}</small>
              <strong>{rows.length}</strong>
            </article>
            <article>
              <small>{copy.highest}</small>
              <strong>{totals.highest ? totals.highest.name : '-'}</strong>
            </article>
          </div>
          <div className="subscriptions-print-table">
            <div className="subscriptions-print-head">
              <span>{copy.service}</span>
              <span>{copy.frequency}</span>
              <span>{copy.amount}</span>
              <span>{copy.monthlyImpact}</span>
              <span>{copy.date}</span>
            </div>
            {rows.length ? rows.map(row => {
              const meta = metadata(row);
              const type = safeType(meta.subscription_type);
              const frequency = safeFrequency(meta.billing_frequency);
              const originalAmount = toNumber(meta.billing_amount ?? row.amount);
              return (
                <div key={row.id} className="subscriptions-print-row">
                  <span>{row.name} · {copy.category[type]}</span>
                  <span>{copy.frequencyLabel[frequency]}</span>
                  <span dir="ltr">{formatMoney(originalAmount, row.currency || currency, locale)}</span>
                  <span dir="ltr">{formatMoney(toNumber(row.amount), row.currency || currency, locale)}</span>
                  <span>{row.date || '-'}</span>
                </div>
              );
            }) : (
              <div className="subscriptions-print-empty">{copy.emptyTitle}</div>
            )}
          </div>
          <footer>{new Date().toLocaleDateString(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US')}</footer>
        </section>
      </main>

      <style jsx global>{`
        .subscriptions-shell{min-height:100vh;background:var(--sfm-page-gradient);color:var(--sfm-foreground);font-family:Tajawal,Arial,sans-serif}
        .subscriptions-main{width:100%;max-width:100%;min-height:100vh;margin:0;padding:28px clamp(18px,3vw,38px) 70px;display:grid;gap:18px;min-width:0;overflow-x:hidden;box-sizing:border-box}
        .subscriptions-main>*{width:100%;max-width:1400px;min-width:0;margin-inline:auto;box-sizing:border-box}
        .subscriptions-shell[dir="rtl"] .subscriptions-main{padding-inline-start:calc(var(--sidebar-w,230px) + clamp(18px,3vw,38px));padding-inline-end:clamp(18px,3vw,38px)}
        .subscriptions-shell[dir="ltr"] .subscriptions-main{padding-inline-start:calc(var(--sidebar-w,230px) + clamp(18px,3vw,38px));padding-inline-end:clamp(18px,3vw,38px)}
        .subscriptions-hero,.subscriptions-form-card,.subscriptions-examples-card,.subscriptions-list-card,.subscriptions-summary-grid article{border:1px solid rgba(29,140,255,.12);background:linear-gradient(180deg,#fff,#f8fbff);border-radius:26px;box-shadow:0 18px 46px rgba(3,18,37,.08)}
        .subscriptions-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;padding:26px;background:radial-gradient(circle at 12% 10%,rgba(47,214,192,.18),transparent 30%),linear-gradient(135deg,#071427,#10294c 60%,#0b5a75);color:#fff}
        .subscriptions-eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(167,243,240,.22);background:rgba(255,255,255,.09);border-radius:999px;padding:8px 12px;color:#a7f3f0;font-weight:950;font-size:12px}
        .subscriptions-hero h1{margin:14px 0 8px;font-size:clamp(34px,5vw,58px);line-height:1.1;color:#fff;font-weight:950;letter-spacing:0}
        .subscriptions-hero p{margin:0;max-width:760px;color:#d7e8f7;font-weight:850;line-height:1.8}
        .subscriptions-hero-actions,.subscriptions-form-actions,.subscription-row-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .subscriptions-primary,.subscriptions-secondary,.subscription-row-actions button{min-height:44px;border-radius:15px;border:1px solid transparent;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:950 13px Tajawal,Arial,sans-serif;text-decoration:none;cursor:pointer;transition:.18s ease}
        .subscriptions-primary{background:linear-gradient(135deg,#1D8CFF,#18D4D4);color:#fff;box-shadow:0 14px 32px rgba(29,140,255,.22)}
        .subscriptions-primary:disabled{opacity:.58;cursor:not-allowed}
        .subscriptions-secondary,.subscription-row-actions button{background:rgba(255,255,255,.08);color:#eaf6ff;border-color:rgba(255,255,255,.20)}
        .subscriptions-notice{border-radius:18px;padding:13px 15px;display:flex;align-items:center;gap:10px;font-weight:900;border:1px solid rgba(16,185,129,.22);background:rgba(16,185,129,.10);color:#047857}
        .subscriptions-notice.error{border-color:rgba(239,68,68,.24);background:rgba(239,68,68,.10);color:#b91c1c}
        .subscriptions-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .subscriptions-summary-grid article{padding:16px;display:grid;gap:8px}
        .subscriptions-summary-grid article>span{width:38px;height:38px;border-radius:14px;display:grid;place-items:center;color:#0f766e;background:#ccfbf1;border:1px solid rgba(15,118,110,.18)}
        .subscriptions-summary-grid small,.subscriptions-section-head span,.subscriptions-form-card label span,.subscriptions-impact-card span,.subscription-row-metrics span{color:#64748b;font-weight:950;font-size:12px}
        .subscriptions-summary-grid strong{color:#061a2e;font-size:20px;font-weight:950;line-height:1.25;overflow-wrap:anywhere}
        .subscriptions-layout,.subscriptions-form-wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:start}
        .subscriptions-form-card,.subscriptions-examples-card,.subscriptions-list-card{padding:20px;display:grid;gap:16px}
        .subscriptions-section-head--interactive{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center}
        .subscriptions-section-head h2{margin:4px 0 0;color:#061a2e;font-size:28px;font-weight:950}
        .subscriptions-section-head p{margin:6px 0 0;color:#64748b;font-weight:800;line-height:1.75}
        .subscriptions-examples-toggle{min-height:42px;border:1px solid rgba(29,140,255,.16);border-radius:15px;background:#f8fbff;color:#0f1d31;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:950 13px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap;transition:.18s ease}
        .subscriptions-examples-toggle:hover{border-color:rgba(47,214,192,.46);box-shadow:0 0 0 4px rgba(47,214,192,.10)}
        .subscriptions-examples-toggle svg{transition:transform .18s ease}
        .subscriptions-examples-toggle svg.open{transform:rotate(180deg)}
        .subscriptions-type-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}
        .subscriptions-type-grid button{min-height:74px;border:1px solid rgba(29,140,255,.14);border-radius:18px;background:#f8fbff;color:#0f1d31;display:grid;place-items:center;gap:7px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}
        .subscriptions-type-grid button.active{background:linear-gradient(135deg,rgba(29,140,255,.15),rgba(47,214,192,.18));border-color:rgba(47,214,192,.42);color:#0f766e;box-shadow:0 12px 28px rgba(29,140,255,.12)}
        .subscriptions-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .subscriptions-form-card label,.subscriptions-notes-field{display:grid;gap:7px}
        .subscriptions-form-card input,.subscriptions-form-card select,.subscriptions-form-card textarea,.subscriptions-form-card .currency-trigger{width:100%;min-height:46px;border:1px solid rgba(29,140,255,.16);border-radius:15px;background:#f8fbff;color:#061a2e;padding:0 12px;font:900 14px Tajawal,Arial,sans-serif;outline:0}
        .subscriptions-form-card textarea{min-height:92px;padding:12px;resize:vertical}
        .subscriptions-form-card input:focus,.subscriptions-form-card select:focus,.subscriptions-form-card textarea:focus{border-color:rgba(47,214,192,.58);box-shadow:0 0 0 4px rgba(47,214,192,.12)}
        .subscriptions-impact-card{border:1px solid rgba(47,214,192,.18);background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.10));border-radius:20px;padding:14px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .subscriptions-impact-card div{border-radius:15px;background:rgba(255,255,255,.72);border:1px solid rgba(29,140,255,.10);padding:12px}
        .subscriptions-impact-card strong{display:block;margin-top:5px;color:#061a2e;font-size:22px;font-weight:950}
        .subscriptions-impact-card p{grid-column:1/-1;margin:0;color:#475569;font-weight:850;line-height:1.7}
        .subscriptions-form-actions{justify-content:flex-end}
        .subscriptions-form-actions .subscriptions-secondary{background:#f8fbff;color:#0f1d31;border-color:rgba(29,140,255,.16)}
        .subscriptions-examples-list{display:grid;gap:10px}
        .subscriptions-examples-card--wide .subscriptions-examples-list{grid-template-columns:repeat(2,minmax(0,1fr))}
        .subscriptions-examples-list article{border:1px solid rgba(29,140,255,.12);background:#f8fbff;border-radius:18px;padding:13px}
        .subscriptions-examples-list article.telecom-example{grid-column:1/-1}
        .subscriptions-examples-list strong{display:flex;align-items:center;gap:8px;color:#061a2e;font-weight:950}
        .subscriptions-examples-list p{margin:8px 0 0;color:#64748b;font-weight:800;line-height:1.7}
        .subscriptions-provider-groups{display:grid;gap:8px;margin-top:10px}
        .subscriptions-provider-groups p{margin:0;border:1px solid rgba(29,140,255,.10);border-radius:14px;background:#fff;padding:10px;display:grid;gap:5px}
        .subscriptions-provider-groups b{color:#0f766e;font-size:12px;font-weight:950;line-height:1.35}
        .subscriptions-provider-groups span{color:#64748b;font-size:12px;font-weight:850;line-height:1.7;overflow-wrap:anywhere}
        .subscriptions-table{display:grid;gap:10px}
        .subscription-row-card{display:grid;grid-template-columns:minmax(240px,1fr) minmax(0,1.4fr) auto;gap:12px;align-items:center;border:1px solid rgba(29,140,255,.12);background:#f8fbff;border-radius:20px;padding:14px}
        .subscription-row-main{display:flex;align-items:center;gap:12px;min-width:0}
        .subscription-row-icon{width:44px;height:44px;border-radius:16px;display:grid;place-items:center;color:#0f766e;background:#ccfbf1;border:1px solid rgba(15,118,110,.18);flex:0 0 auto}
        .subscription-row-main h3{margin:0;color:#061a2e;font-size:18px;font-weight:950}
        .subscription-row-main p{margin:4px 0 0;color:#64748b;font-weight:850}
        .subscription-row-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
        .subscription-row-metrics div{border:1px solid rgba(29,140,255,.10);background:#fff;border-radius:14px;padding:10px}
        .subscription-row-metrics b{display:block;margin-top:4px;color:#061a2e;font-weight:950;overflow-wrap:anywhere}
        .subscription-row-actions{justify-content:flex-end}
        .subscription-row-actions button{background:#fff;color:#0f1d31;border-color:rgba(29,140,255,.16)}
        .subscription-row-actions button.danger{color:#b91c1c;border-color:rgba(239,68,68,.18);background:#fff7f7}
        .subscriptions-empty{min-height:180px;border:1px dashed rgba(29,140,255,.22);border-radius:22px;display:grid;place-items:center;text-align:center;gap:8px;color:#64748b;font-weight:900;padding:24px}
        .subscriptions-empty h3{margin:0;color:#061a2e;font-size:24px}
        .subscriptions-empty p{margin:0;max-width:520px;line-height:1.8}
        .subscriptions-print-report{display:none}
        .dark .subscriptions-shell{background:radial-gradient(circle at 14% 8%,rgba(47,214,192,.12),transparent 30%),linear-gradient(160deg,#0a1422 0%,#0b1728 56%,#08111f 100%);color:#e8eef6}
        .dark .subscriptions-form-card,.dark .subscriptions-examples-card,.dark .subscriptions-list-card,.dark .subscriptions-summary-grid article{background:linear-gradient(180deg,#0f1d31,#0b1728);border-color:#1d3050;box-shadow:0 18px 46px rgba(0,0,0,.28);color:#e8eef6}
        .dark .subscriptions-section-head h2,.dark .subscriptions-summary-grid strong,.dark .subscriptions-examples-list strong,.dark .subscription-row-main h3,.dark .subscription-row-metrics b,.dark .subscriptions-impact-card strong,.dark .subscriptions-empty h3{color:#e8eef6}
        .dark .subscriptions-section-head p,.dark .subscriptions-summary-grid small,.dark .subscriptions-section-head span,.dark .subscriptions-form-card label span,.dark .subscriptions-impact-card span,.dark .subscriptions-impact-card p,.dark .subscription-row-main p,.dark .subscription-row-metrics span,.dark .subscriptions-examples-list p,.dark .subscriptions-empty{color:#b8c7d9}
        .dark .subscriptions-type-grid button,.dark .subscriptions-form-card input,.dark .subscriptions-form-card select,.dark .subscriptions-form-card textarea,.dark .subscriptions-form-card .currency-trigger,.dark .subscriptions-examples-toggle,.dark .subscriptions-examples-list article,.dark .subscriptions-provider-groups p,.dark .subscription-row-card,.dark .subscription-row-metrics div,.dark .subscriptions-impact-card div,.dark .subscriptions-form-actions .subscriptions-secondary,.dark .subscription-row-actions button{background:#13243a!important;border-color:#1d3050!important;color:#e8eef6!important}
        .dark .subscriptions-provider-groups b{color:#7ddbd3}
        .dark .subscriptions-provider-groups span{color:#b8c7d9}
        .dark .subscriptions-type-grid button.active{background:linear-gradient(135deg,rgba(29,140,255,.22),rgba(47,214,192,.18))!important;border-color:rgba(47,214,192,.48)!important;color:#7ddbd3!important}
        .dark .subscriptions-secondary{background:#13243a;color:#e8eef6;border-color:#1d3050}
        .dark .subscription-row-actions button.danger{background:rgba(127,29,29,.22)!important;color:#fecaca!important;border-color:rgba(248,113,113,.28)!important}
        .dark .subscriptions-notice.error{color:#fecaca;background:rgba(127,29,29,.20);border-color:rgba(248,113,113,.28)}
        .dark .subscriptions-notice.success{color:#86efac;background:rgba(16,185,129,.14);border-color:rgba(16,185,129,.28)}
        @media(max-width:1180px){.subscriptions-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.subscriptions-layout,.subscriptions-examples-card--wide .subscriptions-examples-list,.subscription-row-card{grid-template-columns:1fr}.subscription-row-actions{justify-content:stretch}.subscription-row-actions button{flex:1}}
        @media(max-width:1024px){.subscriptions-main{margin-inline:0;padding:18px 14px 46px}.subscriptions-main>*{max-width:100%}.subscriptions-hero{margin-top:0}}
        @media(max-width:720px){.subscriptions-hero{grid-template-columns:1fr;padding:22px;border-radius:24px}.subscriptions-hero-actions,.subscriptions-form-actions{display:grid;grid-template-columns:1fr}.subscriptions-primary,.subscriptions-secondary{width:100%}.subscriptions-summary-grid,.subscriptions-form-grid,.subscriptions-type-grid,.subscriptions-impact-card,.subscription-row-metrics,.subscriptions-section-head--interactive{grid-template-columns:1fr}.subscriptions-examples-toggle{width:100%}.subscriptions-form-card,.subscriptions-examples-card,.subscriptions-list-card{padding:15px;border-radius:22px}.subscriptions-section-head h2{font-size:24px}.subscriptions-hero h1{font-size:36px}}
        @media print{@page{size:A4;margin:12mm}body *{visibility:hidden!important}.subscriptions-print-report,.subscriptions-print-report *{visibility:visible!important}.subscriptions-print-report{display:block!important;position:absolute;inset:0;width:100%;min-height:100%;padding:0;background:#fff;color:#061a2e;font-family:Tajawal,Arial,sans-serif}.subscriptions-print-report header{border-radius:18px;background:linear-gradient(135deg,#071427,#10294c 62%,#0b5a75);color:#fff;padding:24px;margin-bottom:18px}.subscriptions-print-report header span{color:#a7f3f0;font-weight:950}.subscriptions-print-report h1{margin:8px 0 6px;font-size:30px}.subscriptions-print-report p{margin:0;color:#d7e8f7;font-weight:800}.subscriptions-print-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}.subscriptions-print-summary article{border:1px solid #d8e8f5;border-radius:14px;padding:12px;background:#f8fbff}.subscriptions-print-summary small,.subscriptions-print-head{display:block;color:#64748b;font-weight:900;font-size:11px}.subscriptions-print-summary strong{display:block;margin-top:7px;color:#061a2e;font-size:17px;overflow-wrap:anywhere}.subscriptions-print-table{border:1px solid #d8e8f5;border-radius:16px;overflow:hidden}.subscriptions-print-head,.subscriptions-print-row{display:grid;grid-template-columns:1.5fr .75fr .9fr .9fr .8fr;gap:8px;align-items:center;padding:10px 12px}.subscriptions-print-head{background:#eef8fb;color:#0f1d31}.subscriptions-print-row{border-top:1px solid #d8e8f5;font-weight:850;color:#0f1d31}.subscriptions-print-empty{padding:18px;text-align:center;color:#64748b;font-weight:900}.subscriptions-print-report footer{margin-top:14px;color:#64748b;font-weight:900;text-align:center}}
      `}</style>
    </div>
  );
}
