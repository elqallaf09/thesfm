'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  Calculator,
  Coins,
  FileText,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { PageTabPanel, PageTabs } from '@/components/layout/PageTabs';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUrlTabState } from '@/hooks/useUrlTabState';
import { supabase } from '@/integrations/supabase/client';
import { loadUserDataTables } from '@/lib/data/financeData';
import { normalizeDigits, toLatinNumberLocale } from '@/lib/locale';
import { formatMoney } from '@/lib/formatMoney';
import { zakatImportCandidates } from '@/lib/data/zakatData';

type Lang = 'ar' | 'en' | 'fr';
type AssetType = 'cash' | 'savings' | 'investment' | 'gold' | 'silver' | 'non_zakat';
type NisabMethod = 'gold' | 'silver' | 'conservative';
const ZAKAT_TAB_IDS = ['calculator', 'assets', 'history', 'reminders', 'reports'] as const;
type ZakatTab = typeof ZAKAT_TAB_IDS[number];
const ZAKAT_TABS_ID = 'zakat-workspace';

type MetalsPriceResponse = {
  success: boolean;
  source?: 'api' | 'mock' | 'cache';
  gold?: { price: number; currency: string; unit: 'gram'; lastUpdated: string };
  silver?: { price: number; currency: string; unit: 'gram'; lastUpdated: string };
  error?: string;
  message?: string;
};

const METALS_CACHE_KEY = 'sfm_zakat_metals_cache_v1';

type ZakatAsset = {
  id: string;
  asset_name: string;
  asset_type: AssetType;
  amount: number;
  currency: string;
  ownership_date: string | null;
  zakat_due_date: string | null;
  is_zakatable: boolean;
  notes: string | null;
};

type ZakatCalculation = {
  id: string;
  calculation_date: string | null;
  currency: string;
  cash_amount: number;
  investment_amount: number;
  gold_value: number;
  silver_value: number;
  deductible_debts: number;
  net_zakat_base: number;
  nisab_method: string;
  gold_nisab_value: number;
  silver_nisab_value: number;
  selected_nisab_value: number;
  zakat_due: number;
  price_source: string | null;
  notes: string | null;
};

const RAW_TEXT = {
  ar: {
    title: 'الزكاة',
    subtitle: 'احسب زكاتك، تابع الحول، واربط أصولك ومدخراتك بحساب ذكي ومنظم.',
    breadcrumb: 'THE SFM / الزكاة',
    calculator: 'حاسبة الزكاة',
    hawlTracking: 'تتبع الحول',
    saveCalculation: 'حفظ الحساب',
    estimatedZakat: 'الزكاة التقديرية',
    netZakatBase: 'صافي الوعاء الزكوي',
    selectedNisab: 'النصاب المستخدم',
    nextHawlDate: 'أقرب موعد حول',
    lastSaved: 'آخر حساب محفوظ',
    noDueDate: 'لا يوجد موعد',
    noSavedCalculation: 'لا يوجد حساب محفوظ',
    zakatInputs: 'بيانات الزكاة',
    zakatSummary: 'ملخص الزكاة',
    guidance: 'التوضيح الشرعي والتنظيمي',
    cash: 'النقد والمدخرات',
    investments: 'الاستثمارات القابلة للزكاة',
    debts: 'الديون المستحقة',
    gold: 'الذهب',
    goldWeight: 'وزن الذهب بالغرام',
    goldKarat: 'عيار الذهب',
    directGoldValue: 'أو أدخل القيمة مباشرة',
    silver: 'الفضة',
    silverWeight: 'وزن الفضة بالغرام',
    directSilverValue: 'أو أدخل القيمة مباشرة',
    nonZakatableAssets: 'أصول غير خاضعة للزكاة',
    nonZakatHelper: 'استبعد الأصول غير الخاضعة للزكاة مثل السكن الشخصي والسيارة الخاصة والأثاث المستخدم.',
    personalHome: 'السكن الشخصي',
    personalCar: 'سيارة خاصة',
    householdFurniture: 'أثاث المنزل',
    personalTools: 'أدوات شخصية',
    residentialLand: 'أرض للسكن',
    personalUseAssets: 'أصول للاستخدام الشخصي',
    other: 'أخرى',
    otherNonZakatAsset: 'وصف الأصل غير الخاضع للزكاة',
    goldPriceToday: 'سعر الذهب اليوم',
    silverPriceToday: 'سعر الفضة اليوم',
    lastUpdated: 'آخر تحديث',
    source: 'المصدر',
    refreshPrices: 'تحديث الأسعار',
    updating: 'جاري التحديث...',
    live: 'مباشر',
    apiSource: 'API',
    mockSource: 'تجريبي',
    cachedSource: 'آخر سعر محفوظ',
    manual: 'يدوي',
    failed: 'تعذر التحديث',
    apiNotConfigured: 'واجهة أسعار المعادن غير مفعلة.',
    manualFallback: 'تعذر تحميل أسعار الذهب والفضة. يمكنك إدخال السعر يدوياً مؤقتاً.',
    goldPrice: 'سعر غرام الذهب',
    silverPrice: 'سعر غرام الفضة',
    nisabMethod: 'طريقة حساب النصاب',
    goldBased: 'حسب الذهب',
    silverBased: 'حسب الفضة',
    conservative: 'الأكثر احتياطاً',
    goldNisab: 'النصاب حسب الذهب',
    silverNisab: 'النصاب حسب الفضة',
    reachedQuestion: 'هل بلغت النصاب؟',
    reached: 'بلغت النصاب',
    notReached: 'لم تبلغ النصاب بعد',
    zakatDue: 'قيمة الزكاة التقديرية',
    zakatRate: 'نسبة الزكاة 2.5%',
    difference: 'الفرق عن النصاب',
    completeData: 'أكمل بيانات الأسعار أو الأصول لحساب الزكاة بدقة.',
    dueSummary: 'بلغت النصاب، والزكاة التقديرية المستحقة هي:',
    notDueSummary: 'لم تبلغ النصاب حسب البيانات المدخلة حالياً.',
    closeToNisab: 'أنت قريب من النصاب. راقب المدخرات والاستثمارات خلال الفترة القادمة.',
    aboveNisab: 'الزكاة التقديرية ظاهرة بناءً على البيانات المدخلة. راجع الحالات الخاصة مع جهة مختصة.',
    missingPrices: 'تعذر حساب النصاب تلقائياً بسبب عدم توفر أسعار الذهب والفضة.',
    highDebts: 'الديون المستحقة أثرت على صافي الوعاء الزكوي.',
    disclaimer: 'هذه الحاسبة تقديرية لأغراض التنظيم والمتابعة، ولا تعتبر فتوى شرعية. للحالات الخاصة، راجع جهة شرعية مختصة.',
    metalsDisclaimer: 'أسعار الذهب والفضة تقديرية وقد تختلف حسب العيار والمصدر وسعر السوق المحلي. استخدم الأسعار كمرجع، وراجع جهة مختصة للحالات الشرعية الخاصة.',
    saveZakatCalculation: 'حفظ حساب الزكاة',
    calculationSaved: 'تم حفظ حساب الزكاة.',
    calculationDeleted: 'تم حذف حساب الزكاة.',
    zakatHistory: 'سجل حسابات الزكاة',
    noHistory: 'لا توجد حسابات زكاة محفوظة حتى الآن.',
    assetName: 'اسم الأصل',
    assetType: 'نوع الأصل',
    amount: 'القيمة',
    ownershipDate: 'تاريخ التملك',
    dueDate: 'تاريخ استحقاق الزكاة',
    reminder30: 'تذكير قبل 30 يوماً',
    addAsset: 'حفظ أصل الزكاة',
    completedHawl: 'اكتمل الحول',
    upcomingHawl: 'الحول قادم',
    missingOwnershipDate: 'تاريخ التملك غير مكتمل',
    hijriEstimated: 'التاريخ الهجري تقديري',
    saved: 'تم الحفظ بنجاح.',
    error: 'تعذر تنفيذ العملية حالياً.',
    openCharityProjects: 'المشاريع الخيرية',
    openReportsCenter: 'فتح مركز التقارير',
    importedDataTitle: 'قيم مالية من حسابك',
    importedDataHint: 'يمكنك إدخال هذه القيم في حساب الزكاة بعد موافقتك فقط.',
    foundSavings: 'تم العثور على مدخرات بقيمة {amount}. هل تريد إضافتها لحساب الزكاة؟',
    foundInvestments: 'تم العثور على استثمارات بقيمة {amount}. هل تريد إضافتها لحساب الزكاة؟',
    includeInZakat: 'إضافتها للحساب',
    alreadyIncluded: 'تمت الإضافة',
  },
  en: {
    title: 'Zakat',
    subtitle: 'Calculate your zakat, track hawl, and connect your assets and savings in an organized way.',
    breadcrumb: 'THE SFM / Zakat',
    calculator: 'Zakat Calculator',
    hawlTracking: 'Hawl Tracking',
    saveCalculation: 'Save Calculation',
    estimatedZakat: 'Estimated Zakat',
    netZakatBase: 'Net Zakat Base',
    selectedNisab: 'Selected Nisab',
    nextHawlDate: 'Next Hawl Date',
    lastSaved: 'Last Saved Calculation',
    noDueDate: 'No due date',
    noSavedCalculation: 'No saved calculation',
    zakatInputs: 'Zakat Inputs',
    zakatSummary: 'Zakat Summary',
    guidance: 'Religious & Planning Notes',
    cash: 'Cash / savings',
    investments: 'Zakatable investments',
    debts: 'Deductible debts',
    gold: 'Gold',
    goldWeight: 'Gold weight in grams',
    goldKarat: 'Gold karat',
    directGoldValue: 'Or enter value directly',
    silver: 'Silver',
    silverWeight: 'Silver weight in grams',
    directSilverValue: 'Or enter value directly',
    nonZakatableAssets: 'Non-zakatable assets',
    nonZakatHelper: 'Exclude non-zakatable assets such as personal home, private car, and household furniture.',
    personalHome: 'Personal home',
    personalCar: 'Personal car',
    householdFurniture: 'Household furniture',
    personalTools: 'Personal tools',
    residentialLand: 'Residential land',
    personalUseAssets: 'Personal-use assets',
    other: 'Other',
    otherNonZakatAsset: 'Describe other non-zakatable asset',
    goldPriceToday: 'Gold price today',
    silverPriceToday: 'Silver price today',
    lastUpdated: 'Last updated',
    source: 'Source',
    refreshPrices: 'Refresh prices',
    updating: 'Updating...',
    live: 'Live',
    apiSource: 'API',
    mockSource: 'Mock',
    cachedSource: 'Last saved price',
    manual: 'Manual',
    failed: 'Update failed',
    apiNotConfigured: 'Metals price API is not configured.',
    manualFallback: 'Could not load gold and silver prices. You can enter prices manually for now.',
    goldPrice: 'Gold price per gram',
    silverPrice: 'Silver price per gram',
    nisabMethod: 'Nisab calculation method',
    goldBased: 'Gold-based',
    silverBased: 'Silver-based',
    conservative: 'More conservative',
    goldNisab: 'Gold-based Nisab',
    silverNisab: 'Silver-based Nisab',
    reachedQuestion: 'Have you reached Nisab?',
    reached: 'You have reached Nisab',
    notReached: 'You have not reached Nisab yet',
    zakatDue: 'Estimated zakat due',
    zakatRate: 'Zakat rate 2.5%',
    difference: 'Difference from Nisab',
    completeData: 'Complete price or asset data to calculate zakat accurately.',
    dueSummary: 'You have reached Nisab. The estimated zakat due is:',
    notDueSummary: 'You have not reached Nisab based on the current inputs.',
    closeToNisab: 'You are close to Nisab. Keep an eye on savings and investments.',
    aboveNisab: 'The estimated zakat is based on your inputs. Consult a qualified authority for special cases.',
    missingPrices: 'Nisab cannot be calculated automatically because gold and silver prices are unavailable.',
    highDebts: 'Deductible debts affected the net zakat base.',
    disclaimer: 'This calculator is an estimate for planning and tracking. It is not a religious ruling. For special cases, consult a qualified authority.',
    metalsDisclaimer: 'Gold and silver prices are estimates and may vary by purity, source, and local market price. Use them as a reference and consult a qualified authority for specific religious cases.',
    saveZakatCalculation: 'Save Zakat Calculation',
    calculationSaved: 'Zakat calculation saved.',
    calculationDeleted: 'Zakat calculation deleted.',
    zakatHistory: 'Zakat History',
    noHistory: 'No saved zakat calculations yet.',
    assetName: 'Asset name',
    assetType: 'Asset type',
    amount: 'Amount',
    ownershipDate: 'Ownership date',
    dueDate: 'Zakat due date',
    reminder30: 'Reminder 30 days before',
    addAsset: 'Save zakat asset',
    completedHawl: 'Hawl completed',
    upcomingHawl: 'Hawl upcoming',
    missingOwnershipDate: 'Ownership date incomplete',
    hijriEstimated: 'Hijri date is estimated',
    saved: 'Saved successfully.',
    error: 'Could not complete this action right now.',
    openCharityProjects: 'Charity Projects',
    openReportsCenter: 'Open Reports Center',
    importedDataTitle: 'Financial values from your account',
    importedDataHint: 'You can include these values in zakat only after you confirm.',
    foundSavings: 'Savings of {amount} were found. Do you want to include them in zakat calculation?',
    foundInvestments: 'Investments of {amount} were found. Do you want to include them in zakat calculation?',
    includeInZakat: 'Include in calculation',
    alreadyIncluded: 'Included',
  },
  fr: {
    title: 'Zakat',
    subtitle: 'Calculez votre zakat, suivez le hawl et reliez vos actifs et votre épargne de manière organisée.',
    breadcrumb: 'THE SFM / Zakat',
    calculator: 'Calculateur de zakat',
    hawlTracking: 'Suivi du hawl',
    saveCalculation: 'Enregistrer le calcul',
    estimatedZakat: 'Zakat estimée',
    netZakatBase: 'Base nette de zakat',
    selectedNisab: 'Nisab sélectionné',
    nextHawlDate: 'Prochaine date du hawl',
    lastSaved: 'Dernier calcul enregistré',
    noDueDate: 'Aucune échéance',
    noSavedCalculation: 'Aucun calcul enregistré',
    zakatInputs: 'Données de zakat',
    zakatSummary: 'Résumé de la zakat',
    guidance: 'Notes religieuses et d’organisation',
    cash: 'Espèces / épargne',
    investments: 'Investissements soumis à la zakat',
    debts: 'Dettes déductibles',
    gold: 'Or',
    goldWeight: 'Poids de l’or en grammes',
    goldKarat: 'Carat de l’or',
    directGoldValue: 'Ou saisir la valeur directement',
    silver: 'Argent',
    silverWeight: 'Poids de l’argent en grammes',
    directSilverValue: 'Ou saisir la valeur directement',
    nonZakatableAssets: 'Actifs non soumis à la zakat',
    nonZakatHelper: 'Excluez les actifs non soumis à la zakat comme la résidence personnelle, la voiture privée et le mobilier utilisé.',
    personalHome: 'Résidence personnelle',
    personalCar: 'Voiture personnelle',
    householdFurniture: 'Mobilier du foyer',
    personalTools: 'Objets personnels',
    residentialLand: 'Terrain résidentiel',
    personalUseAssets: 'Actifs à usage personnel',
    other: 'Autre',
    otherNonZakatAsset: 'Décrire un autre actif non soumis à la zakat',
    goldPriceToday: 'Prix de l’or aujourd’hui',
    silverPriceToday: 'Prix de l’argent aujourd’hui',
    lastUpdated: 'Dernière mise à jour',
    source: 'Source',
    refreshPrices: 'Actualiser les prix',
    updating: 'Mise à jour...',
    live: 'Direct',
    apiSource: 'API',
    mockSource: 'Mock',
    cachedSource: 'Dernier prix enregistré',
    manual: 'Manuel',
    failed: 'Échec de mise à jour',
    apiNotConfigured: 'L’API des prix des métaux n’est pas configurée.',
    manualFallback: 'Impossible de charger les prix de l’or et de l’argent. Vous pouvez saisir les prix manuellement pour le moment.',
    goldPrice: 'Prix du gramme d’or',
    silverPrice: 'Prix du gramme d’argent',
    nisabMethod: 'Méthode de calcul du nisab',
    goldBased: 'Basé sur l’or',
    silverBased: 'Basé sur l’argent',
    conservative: 'Plus prudent',
    goldNisab: 'Nisab basé sur l’or',
    silverNisab: 'Nisab basé sur l’argent',
    reachedQuestion: 'Avez-vous atteint le nisab ?',
    reached: 'Vous avez atteint le nisab',
    notReached: 'Vous n’avez pas encore atteint le nisab',
    zakatDue: 'Zakat estimée due',
    zakatRate: 'Taux de zakat 2,5 %',
    difference: 'Écart par rapport au nisab',
    completeData: 'Complétez les prix ou les actifs pour calculer la zakat avec précision.',
    dueSummary: 'Vous avez atteint le nisab. La zakat estimée due est :',
    notDueSummary: 'Vous n’avez pas atteint le nisab selon les données actuelles.',
    closeToNisab: 'Vous êtes proche du nisab. Surveillez l’épargne et les investissements prochainement.',
    aboveNisab: 'La zakat estimée est basée sur vos données. Consultez une autorité qualifiée pour les cas particuliers.',
    missingPrices: 'Le nisab ne peut pas être calculé automatiquement car les prix de l’or et de l’argent sont indisponibles.',
    highDebts: 'Les dettes déductibles ont affecté la base nette de zakat.',
    disclaimer: 'Ce calculateur fournit une estimation à des fins d’organisation et de suivi. Il ne constitue pas un avis religieux. Pour les cas particuliers, consultez une autorité qualifiée.',
    metalsDisclaimer: 'Les prix de l’or et de l’argent sont estimatifs et peuvent varier selon la pureté, la source et le marché local. Utilisez-les comme référence et consultez une autorité qualifiée pour les cas religieux spécifiques.',
    saveZakatCalculation: 'Enregistrer le calcul de zakat',
    calculationSaved: 'Calcul de zakat enregistré.',
    calculationDeleted: 'Calcul de zakat supprimé.',
    zakatHistory: 'Historique des calculs de zakat',
    noHistory: 'Aucun calcul de zakat enregistré pour le moment.',
    assetName: 'Nom de l’actif',
    assetType: 'Type d’actif',
    amount: 'Montant',
    ownershipDate: 'Date d’acquisition',
    dueDate: 'Date d’échéance de zakat',
    reminder30: 'Rappel 30 jours avant',
    addAsset: 'Enregistrer l’actif de zakat',
    completedHawl: 'Hawl terminé',
    upcomingHawl: 'Hawl à venir',
    missingOwnershipDate: 'Date d’acquisition incomplète',
    hijriEstimated: 'La date hijri est estimée',
    saved: 'Enregistré avec succès.',
    error: 'Impossible d’effectuer cette action pour le moment.',
    openCharityProjects: 'Projets caritatifs',
    openReportsCenter: 'Ouvrir le centre des rapports',
    importedDataTitle: 'Valeurs financières de votre compte',
    importedDataHint: 'Vous pouvez inclure ces valeurs dans la zakat uniquement après confirmation.',
    foundSavings: 'Une épargne de {amount} a été trouvée. Voulez-vous l’inclure dans le calcul de la zakat ?',
    foundInvestments: 'Des investissements de {amount} ont été trouvés. Voulez-vous les inclure dans le calcul de la zakat ?',
    includeInZakat: 'Inclure dans le calcul',
    alreadyIncluded: 'Inclus',
  },
} as const;

const WINDOWS_1252_REVERSE: Record<string, number> = {
  '€': 0x80,
  '‚': 0x82,
  'ƒ': 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  'ˆ': 0x88,
  '‰': 0x89,
  'Š': 0x8a,
  '‹': 0x8b,
  'Œ': 0x8c,
  'Ž': 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  'š': 0x9a,
  '›': 0x9b,
  'œ': 0x9c,
  'ž': 0x9e,
  'Ÿ': 0x9f,
};

function repairMojibakeText(value: string) {
  if (!/[ÃÂØÙ]/.test(value)) return value;

  const bytes = Array.from(value, char => {
    const code = char.codePointAt(0) ?? 0;
    return WINDOWS_1252_REVERSE[char] ?? (code <= 0xff ? code : null);
  });

  if (bytes.some(byte => byte === null)) return value;

  try {
    const repaired = new TextDecoder('utf-8').decode(new Uint8Array(bytes as number[]));
    return /[\u0600-\u06ffÀ-ÿ]/.test(repaired) ? repaired : value;
  } catch {
    return value;
  }
}

function repairTextDictionary<T>(value: T): T {
  if (typeof value === 'string') return repairMojibakeText(value) as T;
  if (Array.isArray(value)) return value.map(item => repairTextDictionary(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, repairTextDictionary(item)]),
    ) as T;
  }
  return value;
}

const ZAKAT_ARABIC_OVERRIDES = {
  title: 'الزكاة',
  subtitle: 'احسب الزكاة، وتتبع الحول، ونظم الأموال النقدية والذهب والفضة والاستثمارات والديون.',
  breadcrumb: 'THE SFM / الزكاة',
  calculator: 'حاسبة الزكاة',
  zakatInputs: 'الأموال النقدية',
  cash: 'الأموال النقدية',
  gold: 'الذهب والفضة',
  silver: 'الفضة',
  investments: 'الاستثمارات',
  debts: 'الديون',
  zakatSummary: 'الملخص',
  guidance: 'التذكيرات والتنبيهات',
  saveCalculation: 'حفظ الحساب',
  saveZakatCalculation: 'حفظ حساب الزكاة',
  disclaimer: 'هذه الحاسبة تقديرية ولا تُعد فتوى شرعية.',
  metalsDisclaimer: 'هذه الحاسبة تقديرية ولا تُعد فتوى شرعية. راجع جهة شرعية مختصة للحالات الخاصة.',
  openCharityProjects: 'المشاريع الخيرية',
  openReportsCenter: 'فتح مركز التقارير',
  noHistory: 'لا توجد حسابات زكاة محفوظة حتى الآن.',
  noDueDate: 'غير متاح',
  noSavedCalculation: 'غير متاح',
  estimatedZakat: 'الزكاة التقديرية',
  netZakatBase: 'صافي الوعاء الزكوي',
  selectedNisab: 'النصاب المستخدم',
  nextHawlDate: 'أقرب موعد حول',
  lastSaved: 'آخر حساب محفوظ',
} as const;

const REPAIRED_TEXT = repairTextDictionary(RAW_TEXT);
const TEXT = {
  ...REPAIRED_TEXT,
  ar: {
    ...REPAIRED_TEXT.ar,
    ...ZAKAT_ARABIC_OVERRIDES,
  },
} as const;

const goldKarats = ['24', '22', '21', '18'] as const;
const assetTypes: AssetType[] = ['cash', 'savings', 'investment', 'gold', 'silver', 'non_zakat'];
const nonZakatOptions = ['personalHome', 'personalCar', 'householdFurniture', 'personalTools', 'residentialLand', 'personalUseAssets', 'other'] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addYear(date: string) {
  const d = date ? new Date(`${date}T00:00:00`) : new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function daysUntil(date: string) {
  const start = new Date(`${today()}T00:00:00`).getTime();
  const end = new Date(`${date}T00:00:00`).getTime();
  return Math.round((end - start) / 86400000);
}

function toNum(value: string | number | null | undefined) {
  return Number(normalizeDigits(value).replace(/[^\d.-]/g, '')) || 0;
}

function estimatedHijriDate(date?: string | null, lang: Lang = 'ar') {
  if (!date) return '';
  try {
    const locale = toLatinNumberLocale(lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : lang === 'fr' ? 'fr-FR-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura');
    return normalizeDigits(new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      numberingSystem: 'latn',
    }).format(new Date(`${date}T00:00:00`)));
  } catch {
    return '';
  }
}

export default function ZakatPage() {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const tr = TEXT[lang as Lang] ?? TEXT.ar;
  const db = supabase as any;

  const [assets, setAssets] = useState<ZakatAsset[]>([]);
  const [history, setHistory] = useState<ZakatCalculation[]>([]);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useUrlTabState<ZakatTab>({
    param: 'tab',
    values: ZAKAT_TAB_IDS,
    defaultValue: 'calculator',
    omitDefault: true,
  });
  const [saving, setSaving] = useState(false);
  const [loadingMetals, setLoadingMetals] = useState(false);
  const [priceMode, setPriceMode] = useState<'automatic' | 'manual'>('manual');
  const [metalsPrice, setMetalsPrice] = useState<MetalsPriceResponse | null>(null);
  const fetchingMetalsRef = useRef(false);
  const [nisabMethod, setNisabMethod] = useState<NisabMethod>('conservative');
  const [importedFinance, setImportedFinance] = useState({ savingsTotal: 0, investmentTotal: 0 });
  const [includedImports, setIncludedImports] = useState({ savings: false, investments: false });
  const [zakat, setZakat] = useState({
    cash: '',
    investments: '',
    goldGrams: '',
    goldKarat: '24',
    goldDirectValue: '',
    silverGrams: '',
    silverDirectValue: '',
    debts: '',
    goldPrice: '',
    silverPrice: '',
    nonZakatAssets: [] as string[],
    nonZakatOther: '',
  });
  const [assetForm, setAssetForm] = useState({
    asset_name: '',
    asset_type: 'cash' as AssetType,
    amount: '',
    ownership_date: today(),
    zakat_due_date: addYear(today()),
    is_zakatable: true,
    notes: '',
  });

  const money = useCallback((amount: unknown, currency = 'KWD') => {
    const validAmount = Number(amount);
    if (!Number.isFinite(validAmount)) {
      return lang === 'ar' ? 'غير متاح' : lang === 'fr' ? 'Non disponible' : 'Unavailable';
    }
    return formatMoney(validAmount, currency, lang);
  }, [lang]);
  const dateLabel = useCallback((date?: string | null) => date ? normalizeDigits(new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString(toLatinNumberLocale(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US'), { numberingSystem: 'latn' })) : '-', [lang]);
  const timeLabel = useCallback((date?: string | null) => date ? normalizeDigits(new Intl.DateTimeFormat(toLatinNumberLocale(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US'), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    numberingSystem: 'latn',
  }).format(new Date(date))) : '-', [lang]);

  const applyMetalsPrice = useCallback((data: MetalsPriceResponse, cacheSuccessful: boolean) => {
    const goldPrice = toNum(data.gold?.price);
    const silverPrice = toNum(data.silver?.price);
    if (goldPrice <= 0 || silverPrice <= 0) return false;

    setMetalsPrice(data);
    setPriceMode('automatic');
    setZakat(prev => ({
      ...prev,
      goldPrice: String(goldPrice),
      silverPrice: String(silverPrice),
    }));

    if (cacheSuccessful && typeof window !== 'undefined') {
      window.localStorage.setItem(METALS_CACHE_KEY, JSON.stringify(data));
      window.localStorage.setItem('sfm_zakat_gold_price_kwd', String(goldPrice));
      window.localStorage.setItem('sfm_zakat_silver_price_kwd', String(silverPrice));
      window.localStorage.setItem('sfm_zakat_metals_cached_at', data.gold?.lastUpdated ?? data.silver?.lastUpdated ?? new Date().toISOString());
    }
    return true;
  }, []);

  const readCachedMetalsPrice = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = window.localStorage.getItem(METALS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as MetalsPriceResponse;
        if (toNum(parsed.gold?.price) > 0 && toNum(parsed.silver?.price) > 0) return parsed;
      }
      const savedGold = window.localStorage.getItem('sfm_zakat_gold_price_kwd') ?? window.localStorage.getItem('sfm_charity_gold_price_kwd') ?? '';
      const savedSilver = window.localStorage.getItem('sfm_zakat_silver_price_kwd') ?? window.localStorage.getItem('sfm_charity_silver_price_kwd') ?? '';
      if (toNum(savedGold) > 0 && toNum(savedSilver) > 0) {
        const lastUpdated = window.localStorage.getItem('sfm_zakat_metals_cached_at') ?? new Date().toISOString();
        return {
          success: true,
          source: 'cache',
          gold: { price: toNum(savedGold), currency: 'KWD', unit: 'gram', lastUpdated },
          silver: { price: toNum(savedSilver), currency: 'KWD', unit: 'gram', lastUpdated },
        } satisfies MetalsPriceResponse;
      }
    } catch {
      return null;
    }
    return null;
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [assetRes, historyRes, financeRes] = await Promise.all([
      db.from('zakat_assets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      db.from('zakat_calculations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(12),
      loadUserDataTables(db, user.id, [
        { key: 'savings', table: 'savings_items' },
        { key: 'investments', table: 'investment_items' },
      ]),
    ]);
    if (!assetRes.error) setAssets((assetRes.data ?? []) as ZakatAsset[]);
    if (!historyRes.error) setHistory((historyRes.data ?? []) as ZakatCalculation[]);
    setImportedFinance(zakatImportCandidates(financeRes.records.savings, financeRes.records.investments));
  }, [db, user]);

  const loadMetalsPrices = useCallback(async () => {
    if (fetchingMetalsRef.current) return;
    fetchingMetalsRef.current = true;
    setLoadingMetals(true);
    try {
      const response = await fetch('/api/market/metals?currency=KWD', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Metals API failed: ${response.status}`);
      const data = await response.json() as MetalsPriceResponse;
      if (!data.success || !applyMetalsPrice(data, data.source === 'api' || data.source === 'mock')) throw new Error(data.error || tr.manualFallback);
    } catch (error) {
      const cached = readCachedMetalsPrice();
      if (cached && applyMetalsPrice({ ...cached, success: false, source: 'cache', message: tr.cachedSource }, false)) {
        setMetalsPrice(prev => prev ? { ...prev, success: false, source: 'cache', message: tr.cachedSource } : null);
      } else {
        setPriceMode('manual');
        setMetalsPrice({
          success: false,
          error: error instanceof Error ? error.message : tr.apiNotConfigured,
          message: tr.apiNotConfigured,
        });
      }
    } finally {
      fetchingMetalsRef.current = false;
      setLoadingMetals(false);
    }
  }, [applyMetalsPrice, readCachedMetalsPrice, tr.apiNotConfigured, tr.cachedSource, tr.manualFallback]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const cached = readCachedMetalsPrice();
    if (cached) applyMetalsPrice({ ...cached, source: 'cache' }, false);

    const savedMethod = window.localStorage.getItem('sfm_zakat_nisab_method') ?? window.localStorage.getItem('sfm_charity_nisab_method');
    if (savedMethod && ['gold', 'silver', 'conservative'].includes(savedMethod)) setNisabMethod(savedMethod as NisabMethod);

    loadMetalsPrices();
    const interval = window.setInterval(() => {
      loadMetalsPrices();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [applyMetalsPrice, loadMetalsPrices, readCachedMetalsPrice]);

  useEffect(() => {
    window.localStorage.setItem('sfm_zakat_gold_price_kwd', zakat.goldPrice);
    window.localStorage.setItem('sfm_zakat_silver_price_kwd', zakat.silverPrice);
  }, [zakat.goldPrice, zakat.silverPrice]);

  useEffect(() => {
    window.localStorage.setItem('sfm_zakat_nisab_method', nisabMethod);
  }, [nisabMethod]);

  const goldPricesByKarat = useMemo(() => ({
    '24': toNum(zakat.goldPrice),
    '22': toNum(zakat.goldPrice) * (22 / 24),
    '21': toNum(zakat.goldPrice) * (21 / 24),
    '18': toNum(zakat.goldPrice) * (18 / 24),
  }), [zakat.goldPrice]);

  const selectedGoldGramPrice = goldPricesByKarat[zakat.goldKarat as keyof typeof goldPricesByKarat] || 0;
  const zakatableGoldValue = toNum(zakat.goldDirectValue) > 0 ? toNum(zakat.goldDirectValue) : toNum(zakat.goldGrams) * selectedGoldGramPrice;
  const zakatableSilverValue = toNum(zakat.silverDirectValue) > 0 ? toNum(zakat.silverDirectValue) : toNum(zakat.silverGrams) * toNum(zakat.silverPrice);
  const netZakatBase = Math.max(0, toNum(zakat.cash) + toNum(zakat.investments) + zakatableGoldValue + zakatableSilverValue - toNum(zakat.debts));
  const goldNisabValue = toNum(zakat.goldPrice) * 85;
  const silverNisabValue = toNum(zakat.silverPrice) * 595;
  const availableNisabValues = [goldNisabValue, silverNisabValue].filter(value => value > 0);
  const selectedNisabValue = nisabMethod === 'gold'
    ? goldNisabValue
    : nisabMethod === 'silver'
      ? silverNisabValue
      : availableNisabValues.length ? Math.min(...availableNisabValues) : 0;
  const hasCriticalPriceData = goldNisabValue > 0 && silverNisabValue > 0;
  const reachedNisab = selectedNisabValue > 0 && netZakatBase >= selectedNisabValue;
  const zakatDue = reachedNisab ? netZakatBase * 0.025 : 0;
  const nisabDifference = selectedNisabValue > 0 ? netZakatBase - selectedNisabValue : 0;
  const closeToNisab = selectedNisabValue > 0 && !reachedNisab && netZakatBase >= selectedNisabValue * 0.85;
  const nextHawl = assets.map(asset => asset.zakat_due_date).filter(Boolean).sort()[0];
  const lastSaved = history[0];
  const priceSourceLabel = metalsPrice?.source === 'api'
    ? tr.apiSource
    : metalsPrice?.source === 'mock'
      ? tr.mockSource
      : metalsPrice?.source === 'cache'
        ? tr.cachedSource
        : tr.manual;
  const priceStatusLabel = loadingMetals ? tr.updating : metalsPrice?.success ? tr.live : metalsPrice?.source === 'cache' ? tr.cachedSource : tr.failed;
  const goldPriceLastUpdated = metalsPrice?.gold?.lastUpdated || metalsPrice?.silver?.lastUpdated || null;
  const silverPriceLastUpdated = metalsPrice?.silver?.lastUpdated || metalsPrice?.gold?.lastUpdated || null;

  function includeImportedAmount(kind: 'savings' | 'investments') {
    const amount = kind === 'savings' ? importedFinance.savingsTotal : importedFinance.investmentTotal;
    if (amount <= 0) return;
    setZakat(prev => ({ ...prev, [kind === 'savings' ? 'cash' : 'investments']: String(amount) }));
    setIncludedImports(prev => ({ ...prev, [kind]: true }));
  }

  const unavailable = lang === 'ar' ? 'غير متاح' : lang === 'fr' ? 'Non disponible' : 'Unavailable';
  const unavailableHelper = lang === 'ar' ? 'سيظهر هذا الرقم بعد إدخال البيانات.' : lang === 'fr' ? 'Ce chiffre apparaitra apres la saisie des donnees.' : 'This figure will appear after data is entered.';
  const summaryCards = [
    {
      icon: Coins,
      label: tr.estimatedZakat,
      value: hasCriticalPriceData ? money(zakatDue) : unavailable,
      unavailable: !hasCriticalPriceData,
    },
    { icon: Calculator, label: tr.netZakatBase, value: money(netZakatBase), unavailable: false },
    {
      icon: ShieldCheck,
      label: tr.selectedNisab,
      value: selectedNisabValue > 0 ? money(selectedNisabValue) : unavailable,
      unavailable: selectedNisabValue <= 0,
    },
    {
      icon: CalendarDays,
      label: tr.nextHawlDate,
      value: nextHawl ? dateLabel(nextHawl) : unavailable,
      unavailable: !nextHawl,
    },
    {
      icon: FileText,
      label: tr.lastSaved,
      value: lastSaved ? money(toNum(lastSaved.zakat_due), lastSaved.currency) : unavailable,
      unavailable: !lastSaved,
    },
  ];
  const zakatTabs = [
    { id: 'calculator', label: lang === 'ar' ? 'الزكاة' : lang === 'fr' ? 'Calculateur' : 'Calculator' },
    { id: 'assets', label: lang === 'ar' ? 'الأصول والحول' : lang === 'fr' ? 'Actifs et hawl' : 'Assets & Hawl', count: assets.length },
    { id: 'history', label: lang === 'ar' ? 'السجل' : lang === 'fr' ? 'Historique' : 'History', count: history.length },
    { id: 'reminders', label: lang === 'ar' ? 'التذكيرات' : lang === 'fr' ? 'Rappels' : 'Reminders', count: assets.length },
    { id: 'reports', label: lang === 'ar' ? 'التقارير' : lang === 'fr' ? 'Rapports' : 'Reports' },
  ];

  const tValue = (key: string, fallback = key) => (tr as Record<string, string>)[key] ?? fallback;
  const nisabMethodLabel = (method: string) => method === 'gold' ? tr.goldBased : method === 'silver' ? tr.silverBased : tr.conservative;
  const assetTypeLabel = (type: AssetType) => {
    if (type === 'savings') return tr.cash;
    if (type === 'investment') return tr.investments;
    if (type === 'non_zakat') return tr.nonZakatableAssets;
    return tValue(type, tr.other);
  };

  const toggleNonZakatAsset = (asset: string) => {
    setZakat(prev => ({
      ...prev,
      nonZakatAssets: prev.nonZakatAssets.includes(asset)
        ? prev.nonZakatAssets.filter(item => item !== asset)
        : [...prev.nonZakatAssets, asset],
    }));
  };

  const saveZakatCalculation = async () => {
    if (!user) return;
    setSaving(true);
    const notes = [
      zakat.nonZakatAssets.length > 0 ? `${tr.nonZakatableAssets}: ${zakat.nonZakatAssets.map(asset => tValue(asset, asset)).join(', ')}` : '',
      zakat.nonZakatOther ? `${tr.other}: ${zakat.nonZakatOther}` : '',
    ].filter(Boolean).join(' | ');
    const { error } = await db.from('zakat_calculations').insert({
      user_id: user.id,
      currency: 'KWD',
      cash_amount: toNum(zakat.cash),
      investment_amount: toNum(zakat.investments),
      gold_value: zakatableGoldValue,
      silver_value: zakatableSilverValue,
      deductible_debts: toNum(zakat.debts),
      net_zakat_base: netZakatBase,
      nisab_method: nisabMethod,
      gold_nisab_value: goldNisabValue,
      silver_nisab_value: silverNisabValue,
      selected_nisab_value: selectedNisabValue,
      zakat_due: zakatDue,
      price_source: metalsPrice?.source ?? 'manual',
      notes: notes || null,
    });
    setSaving(false);
    if (error) {
      setMessage(tr.error);
      return;
    }
    setMessage(tr.calculationSaved);
    loadData();
  };

  const saveAsset = async () => {
    if (!user || !assetForm.asset_name.trim()) return;
    const { error } = await db.from('zakat_assets').insert({
      user_id: user.id,
      ...assetForm,
      amount: toNum(assetForm.amount),
      zakat_due_date: assetForm.zakat_due_date || addYear(assetForm.ownership_date),
      notes: assetForm.notes || null,
    });
    if (error) {
      setMessage(tr.error);
      return;
    }
    setMessage(tr.saved);
    setAssetForm({ asset_name: '', asset_type: 'cash', amount: '', ownership_date: today(), zakat_due_date: addYear(today()), is_zakatable: true, notes: '' });
    loadData();
  };

  const deleteCalculation = async (calculation: ZakatCalculation) => {
    if (!user) return;
    const { error } = await db.from('zakat_calculations').delete().eq('id', calculation.id).eq('user_id', user.id);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.calculationDeleted);
      loadData();
    }
  };

  return (
    <div className="zakat-page" dir={dir}>
      <Sidebar />
      <DashboardPageShell contentClassName="zakat-content">
        <section className="zakat-hero">
          <div>
            <span>{tr.breadcrumb}</span>
            <h1>{tr.title}</h1>
            <p>{tr.subtitle}</p>
          </div>
          <div className="hero-actions">
            <button className="gold-btn" type="button" onClick={() => setActiveTab('calculator')}><Calculator size={17} /> {tr.calculator}</button>
            <button className="dark-btn" type="button" onClick={() => setActiveTab('assets')}><CalendarDays size={17} /> {tr.hawlTracking}</button>
            <button className="dark-btn" type="button" onClick={saveZakatCalculation} disabled={!user || saving}>
              <Save size={17} /> {tr.saveCalculation}
            </button>
            <LanguageSwitcher variant="dark" compact />
          </div>
        </section>

        {message && <div className="notice">{message}</div>}

        <section className="zakat-summary-grid">
          {summaryCards.map(card => {
            const Icon = card.icon;
            return (
              <article className={`warm-card summary-card ${card.unavailable ? 'unavailable' : ''}`} key={card.label}>
                <span><Icon size={18} /></span>
                <small>{card.label}</small>
                <strong dir={card.unavailable ? dir : 'ltr'}>{card.value}</strong>
                {card.unavailable && <em>{unavailableHelper}</em>}
              </article>
            );
          })}
        </section>

        <PageTabs
          tabs={zakatTabs}
          active={activeTab}
          onChange={id => setActiveTab(id as ZakatTab)}
          ariaLabel={tr.title}
          idBase={ZAKAT_TABS_ID}
          sticky
          mobileMode="scroll"
        />

        <PageTabPanel idBase={ZAKAT_TABS_ID} value="calculator" active={activeTab === 'calculator'}>
        <section id="zakat-calculator" className="zakat-main-grid">
          <article className="warm-card input-panel">
            <div className="section-head"><h2>{tr.zakatInputs}</h2><Coins size={22} /></div>
            {(importedFinance.savingsTotal > 0 || importedFinance.investmentTotal > 0) && (
              <div className="import-box">
                <strong>{tr.importedDataTitle}</strong>
                <p>{tr.importedDataHint}</p>
                {importedFinance.savingsTotal > 0 && (
                  <div>
                    <span>{tr.foundSavings.replace('{amount}', money(importedFinance.savingsTotal))}</span>
                    <button type="button" onClick={() => includeImportedAmount('savings')} disabled={includedImports.savings}>
                      {includedImports.savings ? tr.alreadyIncluded : tr.includeInZakat}
                    </button>
                  </div>
                )}
                {importedFinance.investmentTotal > 0 && (
                  <div>
                    <span>{tr.foundInvestments.replace('{amount}', money(importedFinance.investmentTotal))}</span>
                    <button type="button" onClick={() => includeImportedAmount('investments')} disabled={includedImports.investments}>
                      {includedImports.investments ? tr.alreadyIncluded : tr.includeInZakat}
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="form-grid">
              <label><span>{tr.cash}</span><input inputMode="decimal" value={zakat.cash} onChange={e => setZakat(prev => ({ ...prev, cash: e.target.value }))} placeholder="0.000" /></label>
              <label><span>{tr.investments}</span><input inputMode="decimal" value={zakat.investments} onChange={e => setZakat(prev => ({ ...prev, investments: e.target.value }))} placeholder="0.000" /></label>
              <label><span>{tr.debts}</span><input inputMode="decimal" value={zakat.debts} onChange={e => setZakat(prev => ({ ...prev, debts: e.target.value }))} placeholder="0.000" /></label>
              <label><span>{tr.nisabMethod}</span><select value={nisabMethod} onChange={e => setNisabMethod(e.target.value as NisabMethod)}><option value="gold">{tr.goldBased}</option><option value="silver">{tr.silverBased}</option><option value="conservative">{tr.conservative}</option></select></label>
            </div>

            <div className="asset-box">
              <strong>{tr.gold}</strong>
              <div className="form-grid">
                <label><span>{tr.goldWeight}</span><input inputMode="decimal" value={zakat.goldGrams} onChange={e => setZakat(prev => ({ ...prev, goldGrams: e.target.value }))} placeholder="0" /></label>
                <label><span>{tr.goldKarat}</span><select value={zakat.goldKarat} onChange={e => setZakat(prev => ({ ...prev, goldKarat: e.target.value }))}>{goldKarats.map(karat => <option key={karat} value={karat}>{karat}K</option>)}</select></label>
                <label className="wide"><span>{tr.directGoldValue}</span><input inputMode="decimal" value={zakat.goldDirectValue} onChange={e => setZakat(prev => ({ ...prev, goldDirectValue: e.target.value }))} placeholder="0.000" /></label>
              </div>
            </div>

            <div className="asset-box">
              <strong>{tr.silver}</strong>
              <div className="form-grid">
                <label><span>{tr.silverWeight}</span><input inputMode="decimal" value={zakat.silverGrams} onChange={e => setZakat(prev => ({ ...prev, silverGrams: e.target.value }))} placeholder="0" /></label>
                <label><span>{tr.directSilverValue}</span><input inputMode="decimal" value={zakat.silverDirectValue} onChange={e => setZakat(prev => ({ ...prev, silverDirectValue: e.target.value }))} placeholder="0.000" /></label>
              </div>
            </div>

            <div className="asset-box">
              <strong>{tr.nonZakatableAssets}</strong>
              <p>{tr.nonZakatHelper}</p>
              <div className="chip-grid" role="group" aria-label={tr.nonZakatableAssets}>
                {nonZakatOptions.map(option => (
                  <button key={option} type="button" className={zakat.nonZakatAssets.includes(option) ? 'chip active' : 'chip'} onClick={() => toggleNonZakatAsset(option)} aria-pressed={zakat.nonZakatAssets.includes(option)}>
                    {option === 'other' ? tr.other : tValue(option)}
                  </button>
                ))}
              </div>
              {zakat.nonZakatAssets.includes('other') && (
                <label><span>{tr.otherNonZakatAsset}</span><input value={zakat.nonZakatOther} onChange={e => setZakat(prev => ({ ...prev, nonZakatOther: e.target.value }))} /></label>
              )}
            </div>
          </article>

          <article className="warm-card summary-panel">
            <div className="section-head"><h2>{tr.zakatSummary}</h2><ShieldCheck size={22} /></div>
            <div className="price-grid">
              <div className="price-card">
                <small>{tr.goldPriceToday}</small>
                <strong>{toNum(zakat.goldPrice) > 0 ? `${money(toNum(zakat.goldPrice))} / ${lang === 'ar' ? 'غرام' : lang === 'fr' ? 'gramme' : 'gram'}` : tr.updating}</strong>
                <span>{priceStatusLabel}</span>
                <em>{tr.lastUpdated}: {goldPriceLastUpdated ? timeLabel(goldPriceLastUpdated) : tr.updating}</em>
              </div>
              <div className="price-card">
                <small>{tr.silverPriceToday}</small>
                <strong>{toNum(zakat.silverPrice) > 0 ? `${money(toNum(zakat.silverPrice))} / ${lang === 'ar' ? 'غرام' : lang === 'fr' ? 'gramme' : 'gram'}` : tr.updating}</strong>
                <span>{priceStatusLabel}</span>
                <em>{tr.lastUpdated}: {silverPriceLastUpdated ? timeLabel(silverPriceLastUpdated) : tr.updating}</em>
              </div>
            </div>
            <div className="price-meta">
              <span>{tr.source}: {priceSourceLabel}</span>
              <span>{tr.lastUpdated}: {goldPriceLastUpdated ? timeLabel(goldPriceLastUpdated) : tr.updating}</span>
              {metalsPrice?.source === 'cache' && <span>{tr.cachedSource}</span>}
              {!metalsPrice?.success && metalsPrice?.message && <span>{metalsPrice.message}</span>}
            </div>
            <button className="primary-wide" type="button" onClick={loadMetalsPrices} disabled={loadingMetals} aria-label={tr.refreshPrices}>
              <RefreshCw size={16} /> {loadingMetals ? tr.updating : tr.refreshPrices}
            </button>
            {(!metalsPrice?.success || priceMode === 'manual') && (
              <div className="manual-box">
                <p>{tr.manualFallback}</p>
                <div className="form-grid">
                  <label><span>{tr.goldPrice}</span><input inputMode="decimal" value={zakat.goldPrice} onChange={e => setZakat(prev => ({ ...prev, goldPrice: e.target.value }))} placeholder="0.000" /></label>
                  <label><span>{tr.silverPrice}</span><input inputMode="decimal" value={zakat.silverPrice} onChange={e => setZakat(prev => ({ ...prev, silverPrice: e.target.value }))} placeholder="0.000" /></label>
                </div>
              </div>
            )}

            <div className="result-grid">
              <div><small>{tr.netZakatBase}</small><strong>{money(netZakatBase)}</strong></div>
              <div><small>{tr.goldNisab}</small><strong>{goldNisabValue > 0 ? money(goldNisabValue) : '-'}</strong></div>
              <div><small>{tr.silverNisab}</small><strong>{silverNisabValue > 0 ? money(silverNisabValue) : '-'}</strong></div>
              <div><small>{tr.selectedNisab}</small><strong>{selectedNisabValue > 0 ? money(selectedNisabValue) : '-'}</strong></div>
              <div><small>{tr.difference}</small><strong>{selectedNisabValue > 0 ? money(Math.abs(nisabDifference)) : '-'}</strong></div>
              <div><small>{tr.zakatRate}</small><strong>2.5%</strong></div>
              <div className={reachedNisab ? 'nisab-reached' : 'nisab-missing'}><small>{tr.reachedQuestion}</small><strong>{hasCriticalPriceData ? (reachedNisab ? tr.reached : tr.notReached) : tr.completeData}</strong></div>
              <div><small>{tr.zakatDue}</small><strong>{hasCriticalPriceData ? money(zakatDue) : '-'}</strong></div>
            </div>
            <p className="outcome">{hasCriticalPriceData ? (reachedNisab ? `${tr.dueSummary} ${money(zakatDue)}` : tr.notDueSummary) : tr.completeData}</p>
          </article>

          <article className="warm-card guidance-panel">
            <div className="section-head"><h2>{tr.guidance}</h2><Sparkles size={22} /></div>
            <div className="guidance-list">
              {!hasCriticalPriceData && <p><AlertTriangle size={16} /> {tr.missingPrices}</p>}
              {reachedNisab && <p><ShieldCheck size={16} /> {tr.aboveNisab}</p>}
              {closeToNisab && <p><Sparkles size={16} /> {tr.closeToNisab}</p>}
              {toNum(zakat.debts) > 0 && <p><Coins size={16} /> {tr.highDebts}</p>}
              <p><FileText size={16} /> {tr.disclaimer}</p>
            </div>
            <button className="primary-wide" type="button" disabled={saving || !user} onClick={saveZakatCalculation}>
              <Save size={16} /> {tr.saveZakatCalculation}
            </button>
            <p className="disclaimer">{tr.metalsDisclaimer}</p>
          </article>
        </section>
        </PageTabPanel>

        <PageTabPanel idBase={ZAKAT_TABS_ID} value="assets" active={activeTab === 'assets'}>
        <section id="hawl-tracking">
          <article className="warm-card">
            <div className="section-head"><h2>{tr.hawlTracking}</h2><CalendarDays size={22} /></div>
            <div className="form-grid one">
              <label><span>{tr.assetName}</span><input value={assetForm.asset_name} onChange={e => setAssetForm(prev => ({ ...prev, asset_name: e.target.value }))} /></label>
              <label><span>{tr.assetType}</span><select value={assetForm.asset_type} onChange={e => setAssetForm(prev => ({ ...prev, asset_type: e.target.value as AssetType, is_zakatable: e.target.value !== 'non_zakat' }))}>{assetTypes.map(type => <option key={type} value={type}>{assetTypeLabel(type)}</option>)}</select></label>
              <label><span>{tr.amount}</span><input inputMode="decimal" value={assetForm.amount} onChange={e => setAssetForm(prev => ({ ...prev, amount: e.target.value }))} /></label>
              <label><span>{tr.ownershipDate}</span><input type="date" value={assetForm.ownership_date} onChange={e => setAssetForm(prev => ({ ...prev, ownership_date: e.target.value, zakat_due_date: addYear(e.target.value) }))} /></label>
              <label><span>{tr.dueDate}</span><input type="date" value={assetForm.zakat_due_date} onChange={e => setAssetForm(prev => ({ ...prev, zakat_due_date: e.target.value }))} /></label>
              <label className="check-row"><input type="checkbox" checked={assetForm.is_zakatable} onChange={e => setAssetForm(prev => ({ ...prev, is_zakatable: e.target.checked }))} /><span>{tr.reminder30}</span></label>
              <button className="primary-wide" type="button" onClick={saveAsset}><Save size={16} /> {tr.addAsset}</button>
            </div>
          </article>
        </section>
        </PageTabPanel>

        <PageTabPanel idBase={ZAKAT_TABS_ID} value="reminders" active={activeTab === 'reminders'}>
        <section>
          <article className="warm-card">
            <div className="section-head"><h2>{tr.hawlTracking}</h2><ShieldCheck size={22} /></div>
            {assets.length === 0 ? <p className="muted">{tr.noDueDate}</p> : (
              <div className="asset-list">
                {assets.map(asset => {
                  const dueDays = asset.zakat_due_date ? daysUntil(asset.zakat_due_date) : null;
                  const status = !asset.ownership_date ? tr.missingOwnershipDate : dueDays !== null && dueDays <= 0 ? tr.completedHawl : tr.upcomingHawl;
                  return (
                    <article key={asset.id}>
                      <div><strong>{asset.asset_name}</strong><span>{assetTypeLabel(asset.asset_type)} • {money(toNum(asset.amount), asset.currency)}</span></div>
                      <b>{status}</b>
                      <small>{dateLabel(asset.zakat_due_date || asset.ownership_date)} • {estimatedHijriDate(asset.zakat_due_date || asset.ownership_date, lang as Lang)} • {tr.hijriEstimated}</small>
                    </article>
                  );
                })}
              </div>
            )}
          </article>
        </section>
        </PageTabPanel>

        <PageTabPanel idBase={ZAKAT_TABS_ID} value="history" active={activeTab === 'history'}>
        <section className="warm-card">
          <div className="section-head">
            <h2>{tr.zakatHistory}</h2>
            <Link className="secondary-link" href="/charity-projects">{tr.openCharityProjects}</Link>
          </div>
          {history.length === 0 ? <p className="muted">{tr.noHistory}</p> : (
            <div className="history-list">
              {history.map(item => (
                <article key={item.id}>
                  <span>{dateLabel(item.calculation_date)}</span>
                  <span>{money(toNum(item.net_zakat_base), item.currency)}</span>
                  <span>{nisabMethodLabel(item.nisab_method)}</span>
                  <strong>{money(toNum(item.zakat_due), item.currency)}</strong>
                  <small>{item.price_source || '-'}</small>
                  <button type="button" onClick={() => deleteCalculation(item)} aria-label={tr.calculationDeleted}><Trash2 size={15} /></button>
                </article>
              ))}
            </div>
          )}
        </section>
        </PageTabPanel>

        <PageTabPanel idBase={ZAKAT_TABS_ID} value="reports" active={activeTab === 'reports'}>
          <section className="warm-card">
            <div className="section-head">
              <h2>{zakatTabs.find(tab => tab.id === 'reports')?.label}</h2>
              <Link className="secondary-link" href="/reports-center">{tr.openReportsCenter}</Link>
            </div>
            <p className="muted">{tr.zakatHistory}: {history.length}</p>
          </section>
        </PageTabPanel>
      </DashboardPageShell>

      <style jsx>{`
        .zakat-page{min-height:100vh;background:var(--sfm-background);color:var(--sfm-primary-dark);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}.zakat-content{display:grid;gap:18px}.zakat-hero{position:relative;overflow:hidden;border-radius:24px;padding:28px;background:radial-gradient(circle at 14% 10%,rgba(167,243,240,.28),transparent 30%),linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 48%,var(--sfm-card-dark) 135%);color:var(--sfm-card);display:flex;align-items:center;justify-content:space-between;gap:20px;box-shadow:0 22px 55px rgba(3,18,37,.18)}.zakat-hero span{color:var(--sfm-soft-cyan);font-size:12px;font-weight:900}.zakat-hero h1{margin:10px 0 8px;font-size:42px;line-height:1.05;font-weight:950}.zakat-hero p{margin:0;color:rgba(234,246,255,.76);max-width:720px;line-height:1.75}.hero-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}.gold-btn,.dark-btn,.primary-wide,.secondary-link{min-height:44px;border-radius:14px;border:1px solid rgba(167,243,240,.28);display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;font-weight:900;text-decoration:none;cursor:pointer;font-family:inherit}.gold-btn,.primary-wide{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;box-shadow:0 10px 24px rgba(24,212,212,.2)}.dark-btn{background:rgba(255,255,255,.10);color:var(--sfm-card)}.dark-btn:disabled,.primary-wide:disabled{opacity:.55;cursor:not-allowed}.secondary-link{background:var(--sfm-card);color:var(--sfm-midnight);border-color:rgba(29,140,255,.18)}.notice{border:1px solid rgba(29,140,255,.18);background:var(--sfm-light-card);color:var(--sfm-primary-hover);border-radius:16px;padding:12px 14px;font-weight:900}.zakat-summary-grid{display:grid;grid-template-columns:repeat(5,minmax(170px,1fr));gap:16px;align-items:stretch;margin-top:4px}.warm-card{background:var(--sfm-card);border:1px solid rgba(29,140,255,.16);border-radius:20px;box-shadow:0 14px 34px rgba(3,18,37,.07);padding:18px;min-width:0}.summary-card{display:grid;gap:8px}.summary-card span{width:36px;height:36px;border-radius:13px;background:rgba(29,140,255,.10);color:#B45309;display:grid;place-items:center}.summary-card small{color:var(--sfm-muted);font-weight:900}.summary-card strong{font-size:20px;color:var(--sfm-primary-dark);overflow-wrap:anywhere}.zakat-summary-grid .summary-card{min-height:136px;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto 1fr auto;align-items:start;gap:7px 12px;padding:18px 16px;border-radius:18px}.zakat-summary-grid .summary-card span{grid-row:1 / span 2;width:42px;height:42px;border-radius:14px;color:var(--sfm-primary)}.zakat-summary-grid .summary-card small{font-size:12.5px;line-height:1.45;font-weight:950}.zakat-summary-grid .summary-card strong{align-self:end;font-size:clamp(18px,1.35vw,23px);line-height:1.25;overflow-wrap:normal;word-break:keep-all;unicode-bidi:isolate}.zakat-summary-grid .summary-card em{grid-column:2;font-style:normal;color:var(--sfm-muted);font-size:11.5px;font-weight:800;line-height:1.45}.zakat-summary-grid .summary-card.unavailable strong{font-size:16px;white-space:normal}.zakat-main-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr) minmax(280px,.78fr);gap:16px;align-items:start}.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.section-head h2{margin:0;font-size:19px;color:var(--sfm-midnight)}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.form-grid.one{grid-template-columns:1fr}.form-grid label,.asset-box label{display:grid;gap:7px;color:var(--sfm-midnight);font-size:13px;font-weight:900;min-width:0}.form-grid span,.asset-box span{min-width:0}.form-grid input,.form-grid select,.asset-box input{width:100%;min-height:44px;border:1px solid rgba(29,140,255,.18);border-radius:13px;background:var(--sfm-card);color:var(--sfm-deep-navy);padding:0 12px;outline:none;font-family:inherit}.form-grid input:focus,.form-grid select:focus,.asset-box input:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.16)}.wide{grid-column:1 / -1}.asset-box,.manual-box,.import-box{margin-top:12px;border:1px solid rgba(29,140,255,.13);background:var(--sfm-light-card);border-radius:16px;padding:14px;display:grid;gap:10px;min-width:0}.asset-box strong,.import-box strong{color:var(--sfm-midnight)}.asset-box p,.manual-box p,.import-box p,.muted,.disclaimer{margin:0;color:var(--sfm-muted);line-height:1.7;font-size:13px}.import-box div{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;border:1px solid rgba(29,140,255,.12);background:var(--sfm-card);border-radius:14px;padding:10px}.import-box span{color:var(--sfm-midnight);font-weight:900;line-height:1.6}.import-box button{min-height:36px;border-radius:12px;border:1px solid rgba(29,140,255,.2);background:var(--sfm-midnight);color:var(--sfm-card);padding:0 12px;font-weight:900;font-family:inherit;cursor:pointer}.import-box button:disabled{background:#ECFDF5;color:#047857;cursor:default}.chip-grid{display:flex;flex-wrap:wrap;gap:8px}.chip{border:1px solid rgba(29,140,255,.2);background:var(--sfm-light-card);color:var(--sfm-midnight);border-radius:999px;min-height:36px;padding:0 12px;font-weight:900;cursor:pointer}.chip.active{background:var(--sfm-midnight);color:var(--sfm-card);border-color:var(--sfm-midnight)}.price-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.price-card{background:#061A2E;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:15px;color:#F8FAFC;min-width:0;box-shadow:0 16px 34px rgba(3,18,37,.22)}.price-card small,.price-card span,.price-card em{display:block;font-style:normal;font-weight:900}.price-card small{color:#22D3EE;text-align:start}.price-card strong{display:block;margin:7px 0 5px;color:#F8FAFC;font-size:clamp(20px,4.8vw,25px);line-height:1.25;overflow-wrap:anywhere}.price-card span{color:#CBD5E1}.price-card em{margin-top:6px;color:#94A3B8;font-size:12px}.price-meta{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;color:var(--sfm-primary-hover);font-size:12px;font-weight:900}.price-meta span{border-radius:999px;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.16);color:var(--sfm-midnight);padding:6px 10px}.dark .price-meta span{color:#CBD5E1}.result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.result-grid div{border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:14px;padding:11px;min-width:0}.result-grid small{display:block;color:var(--sfm-muted);font-weight:900}.result-grid strong{display:block;color:var(--sfm-primary-dark);font-size:16px;margin-top:4px;overflow-wrap:anywhere}.result-grid .nisab-reached{background:#ECFDF5}.result-grid .nisab-reached strong{color:#047857}.result-grid .nisab-missing{background:#FFF7ED}.outcome{margin:12px 0 0;border-radius:15px;background:#ECFDF5;color:#047857;padding:12px;font-weight:900;line-height:1.7}.guidance-list{display:grid;gap:9px}.guidance-list p{margin:0;display:flex;gap:8px;align-items:flex-start;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:14px;padding:11px;color:var(--sfm-midnight);line-height:1.65}.guidance-list svg{color:var(--sfm-primary);flex:0 0 auto;margin-top:2px}.guidance-panel .primary-wide{width:100%;margin:14px 0}.split-grid{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:16px}.check-row{display:flex!important;align-items:center;gap:9px}.check-row input{width:auto;min-height:auto}.asset-list,.history-list{display:grid;gap:10px}.asset-list article,.history-list article{border:1px solid rgba(29,140,255,.13);background:var(--sfm-light-card);border-radius:15px;padding:12px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}.asset-list span,.asset-list small,.history-list span,.history-list small{color:var(--sfm-muted);overflow-wrap:anywhere}.asset-list strong,.history-list strong{color:var(--sfm-primary-dark);overflow-wrap:anywhere}.asset-list b{color:var(--sfm-primary-hover)}.history-list article{grid-template-columns:1fr 1fr 1fr 1fr .7fr auto}.history-list button{width:36px;height:36px;border:1px solid rgba(121,31,31,.14);border-radius:11px;background:#FEF2F2;color:#B91C1C;display:grid;place-items:center;cursor:pointer}@media(max-width:1180px){.zakat-summary-grid{grid-template-columns:repeat(3,minmax(180px,1fr))}.zakat-main-grid{grid-template-columns:1fr 1fr}.guidance-panel{grid-column:1 / -1}}@media(max-width:760px){.zakat-hero{display:grid;padding:22px}.zakat-hero h1{font-size:34px}.hero-actions{display:grid;grid-template-columns:1fr;width:100%}.zakat-summary-grid,.zakat-main-grid,.split-grid,.form-grid,.price-grid,.result-grid,.import-box div{grid-template-columns:1fr}.history-list article,.asset-list article{grid-template-columns:1fr}.warm-card{padding:16px}.gold-btn,.dark-btn,.primary-wide,.secondary-link,.import-box button{width:100%}}

        /* Zakat route production polish for the Charity Projects module. */
        .zakat-page{--zakat-radius-xl:26px;--zakat-radius-lg:20px;--zakat-border:rgba(29,140,255,.15);--zakat-shadow:0 18px 44px rgba(3,18,37,.075);background:radial-gradient(circle at 8% 0%,rgba(47,214,192,.10),transparent 30%),var(--sfm-page-gradient);overflow-x:clip}
        .zakat-page .sfm-dashboard-page-content.zakat-content{width:min(100%,1280px);max-inline-size:min(1280px,calc(100vw - 32px));margin-inline:auto;gap:clamp(16px,1.8vw,24px);min-width:0}
        .zakat-page .sfm-dashboard-page-content.zakat-content > *{inline-size:100%;min-width:0}
        .zakat-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,max-content);align-items:center;border-radius:var(--zakat-radius-xl);min-height:0}
        .zakat-hero h1{font-size:clamp(32px,3.2vw,46px);letter-spacing:0;text-wrap:balance}.zakat-hero p{font-size:15.5px;max-width:780px}.hero-actions{min-width:0}.hero-actions > *{flex:0 1 auto}
        .zakat-page :is(.gold-btn,.dark-btn,.primary-wide,.secondary-link){border-radius:14px;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.zakat-page :is(.gold-btn,.dark-btn,.primary-wide,.secondary-link):hover:not(:disabled){transform:translateY(-1px)}.zakat-page :is(button,a,input,select):focus-visible{outline:3px solid rgba(47,214,192,.34);outline-offset:2px}
        .zakat-page .page-section-tabs{display:flex;align-items:stretch;gap:8px;min-height:62px;padding:8px;border:1px solid rgba(29,140,255,.13);border-radius:22px;background:linear-gradient(135deg,rgba(255,255,255,.94),rgba(234,246,255,.84));box-shadow:0 14px 34px rgba(3,18,37,.07);overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch}.zakat-page .page-section-tabs::-webkit-scrollbar{display:none}.zakat-page .page-section-tabs button{flex:1 0 auto;min-width:max-content;min-height:48px;border-radius:15px;white-space:nowrap}.zakat-page .page-section-tabs button.active{background:var(--sfm-midnight);color:#fff;border-color:rgba(167,243,240,.32);box-shadow:0 12px 24px rgba(3,18,37,.18)}
        .zakat-page .warm-card{border-radius:var(--zakat-radius-xl);border:1px solid var(--zakat-border);box-shadow:var(--zakat-shadow);background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(246,251,255,.94));min-width:0}.zakat-summary-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.zakat-summary-grid .summary-card{height:100%;min-height:124px}.zakat-summary-grid .summary-card strong,.result-grid strong,.price-card strong,.history-list strong,.asset-list strong{direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums}
        .zakat-main-grid{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) minmax(300px,.8fr);gap:16px;align-items:start}.split-grid{grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);gap:16px}.section-head{align-items:center}.section-head h2{letter-spacing:0;text-wrap:balance}.form-grid{gap:14px}.form-grid label,.asset-box label{line-height:1.45}.form-grid input,.form-grid select,.asset-box input{min-height:46px;border-radius:13px}.asset-box,.manual-box,.import-box,.guidance-list p,.result-grid div,.asset-list article,.history-list article{border-radius:18px}.guidance-panel,.summary-panel,.input-panel{height:fit-content}.history-list article,.asset-list article{min-width:0}.history-list span,.history-list small,.asset-list span,.asset-list small{overflow-wrap:anywhere}.muted{border-radius:18px;background:rgba(234,246,255,.55);padding:14px;border:1px dashed rgba(29,140,255,.18)}
        .dark .zakat-page{--zakat-border:rgba(167,243,240,.14);--zakat-shadow:0 18px 44px rgba(0,0,0,.22);background:radial-gradient(circle at 8% 0%,rgba(47,214,192,.10),transparent 30%),var(--sfm-page-gradient)}.dark .zakat-page .warm-card{background:linear-gradient(180deg,rgba(16,47,82,.88),rgba(8,24,42,.92));border-color:var(--zakat-border);box-shadow:var(--zakat-shadow)}.dark .zakat-page .page-section-tabs{background:linear-gradient(135deg,rgba(8,24,42,.94),rgba(16,47,82,.86));border-color:rgba(167,243,240,.14)}.dark .zakat-page .page-section-tabs button{background:rgba(10,20,34,.72);border-color:rgba(167,243,240,.12);color:var(--sfm-body)}.dark .zakat-page .page-section-tabs button.active{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-primary-dark));color:#fff}.dark .zakat-page :is(.asset-box,.manual-box,.import-box,.guidance-list p,.result-grid div,.asset-list article,.history-list article,.muted){background:rgba(10,20,34,.58);border-color:rgba(167,243,240,.12)}.dark .zakat-page :is(.form-grid input,.form-grid select,.asset-box input){background:#081827;border-color:rgba(167,243,240,.18);color:var(--sfm-heading)}.dark .zakat-page :is(.section-head h2,.asset-box strong,.import-box strong,.guidance-list p,.result-grid strong,.asset-list strong,.history-list strong){color:var(--sfm-heading)}.dark .zakat-page :is(.muted,.disclaimer,.asset-box p,.manual-box p,.import-box p,.asset-list span,.asset-list small,.history-list span,.history-list small){color:var(--sfm-body)}
        @media(max-width:1260px){.zakat-hero{grid-template-columns:1fr}.zakat-summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.zakat-main-grid{grid-template-columns:1fr 1fr}.guidance-panel{grid-column:1 / -1}.hero-actions{justify-content:flex-start}}
        @media(max-width:920px){.zakat-page .sfm-dashboard-page-content.zakat-content{max-inline-size:min(100%,calc(100vw - 24px))}.zakat-summary-grid,.zakat-main-grid,.split-grid{grid-template-columns:1fr}.zakat-page .page-section-tabs button{flex:0 0 auto;min-width:142px}.history-list article{grid-template-columns:1fr}}
        @media(max-width:560px){.zakat-page .sfm-dashboard-page-content.zakat-content{max-inline-size:min(100%,calc(100vw - 18px));gap:14px}.zakat-hero{padding:18px;border-radius:22px}.hero-actions{display:grid;grid-template-columns:1fr;width:100%}.zakat-summary-grid,.form-grid,.price-grid,.result-grid{grid-template-columns:1fr}.warm-card{border-radius:22px;padding:16px}.zakat-page .page-section-tabs button{min-width:132px}.section-head{display:grid}.section-head svg{order:-1}.gold-btn,.dark-btn,.primary-wide,.secondary-link{width:100%}}

      `}</style>
    </div>
  );
}
