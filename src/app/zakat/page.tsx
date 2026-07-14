'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  Calculator,
  Coins,
  CreditCard,
  Download,
  FileText,
  History,
  Info,
  Landmark,
  ReceiptText,
  RefreshCw,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { PageTabPanel, PageTabs } from '@/components/layout/PageTabs';
import { EmptyState } from '@/components/layout/EmptyState';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
const ZAKAT_TAB_IDS = ['overview', 'assets', 'liabilities', 'calculation', 'payment', 'history', 'reports', 'documents'] as const;
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

const WORKFLOW_TEXT = {
  ar: {
    tabsOverview: 'نظرة عامة', tabsAssets: 'الأصول', tabsLiabilities: 'الالتزامات', tabsCalculation: 'الحساب', tabsPayment: 'السداد', tabsHistory: 'السجل', tabsReports: 'التقارير', tabsDocuments: 'المستندات',
    actionCenter: 'مركز الإجراءات', actionCalculate: 'احسب', actionPay: 'سجّل السداد', actionPdf: 'تصدير PDF', actionShare: 'مشاركة', actionHistory: 'السجل', actionReminder: 'تذكير الحول',
    overviewTitle: 'حالة الزكاة الحالية', overviewDescription: 'ملخص واضح للمستحق، والنصاب، ومصدر الأسعار، والخطوة التالية.', currentStatus: 'الحالة الحالية', calculationMethod: 'طريقة الحساب', evidence: 'الأدلة والمصادر', evidenceDescription: 'يعرض كل رقم صيغته ومصدره ووقت آخر تحديث؛ الأسعار السوقية تقديرية.', recommendedAction: 'الإجراء المقترح', recommendedCalculate: 'أكمل الأصول والالتزامات ثم راجع نتيجة الحساب.', recommendedPay: 'بلغت النصاب. راجع النتيجة ثم انتقل إلى تسجيل السداد والإيصال.', separateNote: 'حساب الزكاة مستقل تماماً عن الخمس والتبرعات التطوعية.',
    assetsTitle: 'الأصول الخاضعة للزكاة', assetsDescription: 'أدخل النقد والاستثمارات والذهب والفضة، واستبعد أصول الاستخدام الشخصي بوضوح.', savedAssetsTitle: 'الأصول المحفوظة وتتبع الحول', noAssetsTitle: 'لا توجد أصول زكاة محفوظة', noAssetsDesc: 'أضف أصلاً مع تاريخ التملك ليظهر موعد الحول والتنبيه هنا.', zakatableAsset: 'أصل خاضع للزكاة',
    liabilitiesTitle: 'الالتزامات القابلة للخصم', liabilitiesDescription: 'سجّل الديون المستحقة المؤهلة فقط. راجع الحالات الخاصة مع جهة شرعية مختصة.', deductibleDebt: 'الديون المستحقة القابلة للخصم', liabilitiesFormula: 'صافي الوعاء = الأصول الخاضعة − الالتزامات المؤهلة', netPreview: 'معاينة صافي الوعاء',
    calculationTitle: 'مسار حساب الزكاة', calculationDescription: 'الأصول والالتزامات والنصاب والنتيجة في تسلسل واحد قابل للمراجعة.', assetsStep: 'الأصول', liabilitiesStep: 'الالتزامات', netStep: 'صافي المبلغ', nisabStep: 'النصاب', resultStep: 'النتيجة النهائية',
    paymentTitle: 'السداد والإيصال', paymentDescription: 'تسجيل السداد خطوة منفصلة بعد اعتماد حساب الزكاة؛ لا يغيّر ذلك معادلة الزكاة.', noPaymentsTitle: 'لا توجد دفعات زكاة مسجلة بعد', noPaymentsDesc: 'لا يتوفر هنا سجل مستقل لدفعات الزكاة. للحفاظ على التصنيف الصحيح، سجّل الدعم ضمن مشروع زكاة مؤهل وأرفق الإيصال؛ وتبقى الصدقة العامة منفصلة.', recordPayment: 'فتح مشاريع الزكاة', paymentDue: 'المستحق وفق آخر حساب', paymentRecorded: 'المدفوع المسجل', paymentRemaining: 'المتبقي للتسجيل', notRecorded: 'غير مسجل',
    reportsTitle: 'تقارير الزكاة', reportsDesc: 'ملخص سنوي يوضح المبلغ وطريقة الحساب وحالة السداد والإيصال.', year: 'السنة', amount: 'المبلغ', category: 'الفئة', calculation: 'الحساب', payment: 'السداد', receipt: 'الإيصال', pdf: 'PDF', status: 'الحالة', ready: 'جاهز', draft: 'مسودة', openReports: 'فتح مركز التقارير', exportPdf: 'طباعة / PDF',
    documentsTitle: 'مستندات الزكاة', documentsDesc: 'الإيصالات والأدلة والمرفقات تبقى منفصلة عن الحساب، مع رابط واضح إلى خزنة المستندات.', noDocumentsTitle: 'لا توجد مستندات زكاة مرتبطة بعد', noDocumentsDesc: 'أضف إيصال سداد أو مستنداً داعماً من خزنة المستندات.', openDocuments: 'فتح خزنة المستندات',
    formula: 'الصيغة', source: 'المصدر', lastUpdate: 'آخر تحديث', explanation: 'التوضيح', metricHelp: 'تفاصيل هذا الرقم', noUpdate: 'لم يُحفظ بعد', sourceSavedCalc: 'آخر حساب محفوظ', sourceAssets: 'أصول الزكاة المحفوظة', sourceMetals: 'أسعار الذهب والفضة', formulaZakatDue: 'إذا بلغ صافي الوعاء النصاب: صافي الوعاء × 2.5%', formulaNetBase: 'النقد + الاستثمارات + الذهب + الفضة − الديون المؤهلة', formulaNisab: '85 غ ذهب أو 595 غ فضة حسب الطريقة المختارة', formulaNextHawl: 'أقرب تاريخ استحقاق بين الأصول المحفوظة', formulaLastSaved: 'قيمة الزكاة من أحدث حساب محفوظ', updatedLive: 'محدّث من مصدر الأسعار', calculationEvidence: 'القيم الحالية من نموذج الزكاة فقط', resultEvidence: 'نتيجة تقديرية وليست فتوى شرعية', shareCopied: 'تم نسخ ملخص الزكاة.', shareUnavailable: 'تعذر مشاركة الملخص حالياً.',
  },
  en: {
    tabsOverview: 'Overview', tabsAssets: 'Assets', tabsLiabilities: 'Liabilities', tabsCalculation: 'Calculation', tabsPayment: 'Payment', tabsHistory: 'History', tabsReports: 'Reports', tabsDocuments: 'Documents',
    actionCenter: 'Action center', actionCalculate: 'Calculate', actionPay: 'Record payment', actionPdf: 'Export PDF', actionShare: 'Share', actionHistory: 'History', actionReminder: 'Hawl reminder',
    overviewTitle: 'Current Zakat status', overviewDescription: 'A clear view of what is due, the Nisab used, price evidence, and the next step.', currentStatus: 'Current status', calculationMethod: 'Calculation method', evidence: 'Evidence and sources', evidenceDescription: 'Every key figure shows its formula, source, and last update; market prices remain estimates.', recommendedAction: 'Recommended next action', recommendedCalculate: 'Complete assets and liabilities, then review the calculation result.', recommendedPay: 'Nisab is reached. Review the result, then record the payment and receipt.', separateNote: 'Zakat remains completely separate from Khums and voluntary charity.',
    assetsTitle: 'Zakatable assets', assetsDescription: 'Enter cash, investments, gold, and silver, and clearly exclude personal-use assets.', savedAssetsTitle: 'Saved assets and Hawl tracking', noAssetsTitle: 'No Zakat assets saved', noAssetsDesc: 'Add an asset with its ownership date to see its Hawl date and reminder.', zakatableAsset: 'Zakatable asset',
    liabilitiesTitle: 'Eligible liabilities', liabilitiesDescription: 'Record only eligible debts currently due. Review special cases with a qualified authority.', deductibleDebt: 'Eligible deductible debts', liabilitiesFormula: 'Net Zakat base = zakatable assets − eligible liabilities', netPreview: 'Net Zakat base preview',
    calculationTitle: 'Zakat calculation path', calculationDescription: 'Assets, liabilities, net amount, Nisab, and result in one reviewable sequence.', assetsStep: 'Assets', liabilitiesStep: 'Liabilities', netStep: 'Net amount', nisabStep: 'Nisab', resultStep: 'Final result',
    paymentTitle: 'Payment and receipt', paymentDescription: 'Payment recording is a separate step after reviewing the Zakat calculation; it never changes the Zakat formula.', noPaymentsTitle: 'No Zakat payments recorded yet', noPaymentsDesc: 'A dedicated Zakat payment record is not available here. To keep classification honest, record support against an eligible Zakat project and attach its receipt; general Donations stay separate.', recordPayment: 'Open Zakat projects', paymentDue: 'Due from latest calculation', paymentRecorded: 'Recorded paid amount', paymentRemaining: 'Remaining to record', notRecorded: 'Not recorded',
    reportsTitle: 'Zakat reports', reportsDesc: 'An annual summary with amount, calculation method, payment, receipt, PDF, and status.', year: 'Year', amount: 'Amount', category: 'Category', calculation: 'Calculation', payment: 'Payment', receipt: 'Receipt', pdf: 'PDF', status: 'Status', ready: 'Ready', draft: 'Draft', openReports: 'Open Reports Center', exportPdf: 'Print / PDF',
    documentsTitle: 'Zakat documents', documentsDesc: 'Receipts, evidence, and attachments stay separate from the calculation, with a clear path to the document vault.', noDocumentsTitle: 'No Zakat documents linked yet', noDocumentsDesc: 'Add a payment receipt or supporting document from the document vault.', openDocuments: 'Open document vault',
    formula: 'Formula', source: 'Source', lastUpdate: 'Last update', explanation: 'Explanation', metricHelp: 'Details for this figure', noUpdate: 'Not saved yet', sourceSavedCalc: 'Latest saved calculation', sourceAssets: 'Saved Zakat assets', sourceMetals: 'Gold and silver prices', formulaZakatDue: 'When the net base reaches Nisab: net base × 2.5%', formulaNetBase: 'Cash + investments + gold + silver − eligible debts', formulaNisab: '85 g gold or 595 g silver, based on the selected method', formulaNextHawl: 'Earliest due date among saved assets', formulaLastSaved: 'Zakat due from the latest saved calculation', updatedLive: 'Updated from the price source', calculationEvidence: 'Current values come only from the Zakat form', resultEvidence: 'An estimate, not a religious ruling', shareCopied: 'Zakat summary copied.', shareUnavailable: 'The summary could not be shared.',
  },
  fr: {
    tabsOverview: 'Aperçu', tabsAssets: 'Actifs', tabsLiabilities: 'Passifs', tabsCalculation: 'Calcul', tabsPayment: 'Paiement', tabsHistory: 'Historique', tabsReports: 'Rapports', tabsDocuments: 'Documents',
    actionCenter: 'Centre d’actions', actionCalculate: 'Calculer', actionPay: 'Enregistrer le paiement', actionPdf: 'Exporter en PDF', actionShare: 'Partager', actionHistory: 'Historique', actionReminder: 'Rappel du Hawl',
    overviewTitle: 'Statut actuel de la Zakat', overviewDescription: 'Une vue claire du montant dû, du Nisab utilisé, des preuves de prix et de la prochaine étape.', currentStatus: 'Statut actuel', calculationMethod: 'Méthode de calcul', evidence: 'Preuves et sources', evidenceDescription: 'Chaque chiffre clé affiche sa formule, sa source et sa mise à jour ; les prix de marché restent estimatifs.', recommendedAction: 'Prochaine action recommandée', recommendedCalculate: 'Complétez les actifs et les passifs, puis vérifiez le résultat du calcul.', recommendedPay: 'Le Nisab est atteint. Vérifiez le résultat, puis enregistrez le paiement et le reçu.', separateNote: 'La Zakat reste entièrement distincte du Khums et de la charité volontaire.',
    assetsTitle: 'Actifs soumis à la Zakat', assetsDescription: 'Saisissez les liquidités, investissements, l’or et l’argent, et excluez clairement les biens à usage personnel.', savedAssetsTitle: 'Actifs enregistrés et suivi du Hawl', noAssetsTitle: 'Aucun actif de Zakat enregistré', noAssetsDesc: 'Ajoutez un actif et sa date d’acquisition pour afficher le Hawl et son rappel.', zakatableAsset: 'Actif soumis à la Zakat',
    liabilitiesTitle: 'Passifs admissibles', liabilitiesDescription: 'Enregistrez uniquement les dettes admissibles actuellement exigibles. Consultez une autorité compétente pour les cas particuliers.', deductibleDebt: 'Dettes admissibles déductibles', liabilitiesFormula: 'Assiette nette = actifs soumis − passifs admissibles', netPreview: 'Aperçu de l’assiette nette',
    calculationTitle: 'Parcours du calcul de la Zakat', calculationDescription: 'Actifs, passifs, montant net, Nisab et résultat dans une séquence vérifiable.', assetsStep: 'Actifs', liabilitiesStep: 'Passifs', netStep: 'Montant net', nisabStep: 'Nisab', resultStep: 'Résultat final',
    paymentTitle: 'Paiement et reçu', paymentDescription: 'L’enregistrement du paiement est une étape distincte après le calcul ; il ne modifie jamais la formule de la Zakat.', noPaymentsTitle: 'Aucun paiement de Zakat enregistré', noPaymentsDesc: 'Aucun registre de paiement de Zakat dédié n’est disponible ici. Pour préserver une classification exacte, enregistrez le soutien sur un projet de Zakat éligible et joignez le reçu ; les dons généraux restent séparés.', recordPayment: 'Ouvrir les projets de Zakat', paymentDue: 'Dû selon le dernier calcul', paymentRecorded: 'Montant payé enregistré', paymentRemaining: 'Reste à enregistrer', notRecorded: 'Non enregistré',
    reportsTitle: 'Rapports de Zakat', reportsDesc: 'Un résumé annuel avec montant, méthode de calcul, paiement, reçu, PDF et statut.', year: 'Année', amount: 'Montant', category: 'Catégorie', calculation: 'Calcul', payment: 'Paiement', receipt: 'Reçu', pdf: 'PDF', status: 'Statut', ready: 'Prêt', draft: 'Brouillon', openReports: 'Ouvrir le centre de rapports', exportPdf: 'Imprimer / PDF',
    documentsTitle: 'Documents de Zakat', documentsDesc: 'Les reçus, preuves et pièces jointes restent séparés du calcul, avec un accès clair au coffre de documents.', noDocumentsTitle: 'Aucun document de Zakat lié', noDocumentsDesc: 'Ajoutez un reçu de paiement ou un document justificatif depuis le coffre.', openDocuments: 'Ouvrir le coffre de documents',
    formula: 'Formule', source: 'Source', lastUpdate: 'Dernière mise à jour', explanation: 'Explication', metricHelp: 'Détails de ce chiffre', noUpdate: 'Pas encore enregistré', sourceSavedCalc: 'Dernier calcul enregistré', sourceAssets: 'Actifs de Zakat enregistrés', sourceMetals: 'Prix de l’or et de l’argent', formulaZakatDue: 'Si l’assiette nette atteint le Nisab : assiette nette × 2,5 %', formulaNetBase: 'Liquidités + investissements + or + argent − dettes admissibles', formulaNisab: '85 g d’or ou 595 g d’argent selon la méthode choisie', formulaNextHawl: 'Première échéance parmi les actifs enregistrés', formulaLastSaved: 'Zakat due du dernier calcul enregistré', updatedLive: 'Mis à jour depuis la source des prix', calculationEvidence: 'Les valeurs actuelles proviennent uniquement du formulaire Zakat', resultEvidence: 'Une estimation, pas un avis religieux', shareCopied: 'Résumé de la Zakat copié.', shareUnavailable: 'Impossible de partager le résumé.',
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

function MetricHelp({ label, children }: { label: string; children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={180}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="metric-help"
            type="button"
            aria-label={label}
            style={{ width: 30, height: 30, borderRadius: 'var(--radius-pill)', border: '1px solid color-mix(in srgb, var(--accent) 30%, var(--border))', background: 'var(--accent-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', cursor: 'help' }}
          >
            <Info size={14} aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs border-border bg-surface-elevated px-3 py-2 text-foreground shadow-popover" sideOffset={8}>
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function ZakatPage() {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const tr = TEXT[lang as Lang] ?? TEXT.ar;
  const wx = WORKFLOW_TEXT[lang as Lang] ?? WORKFLOW_TEXT.ar;
  const db = supabase as any;

  const [assets, setAssets] = useState<ZakatAsset[]>([]);
  const [history, setHistory] = useState<ZakatCalculation[]>([]);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useUrlTabState<ZakatTab>({
    param: 'tab',
    values: ZAKAT_TAB_IDS,
    defaultValue: 'overview',
    omitDefault: true,
  });
  const [saving, setSaving] = useState(false);
  const [loadingMetals, setLoadingMetals] = useState(false);
  const [priceMode, setPriceMode] = useState<'automatic' | 'manual'>('manual');
  const [metalsPrice, setMetalsPrice] = useState<MetalsPriceResponse | null>(null);
  const fetchingMetalsRef = useRef(false);
  const printRequestedRef = useRef(false);
  const [nisabMethod, setNisabMethod] = useState<NisabMethod>('conservative');
  const [importedFinance, setImportedFinance] = useState({ savingsTotal: 0, investmentTotal: 0, excludedSavings: 0, excludedInvestments: 0 });
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
    const isExplicitKwd = (row: Record<string, unknown>) => String(row.currency ?? '').trim().toUpperCase() === 'KWD';
    const kwdSavings = financeRes.records.savings.filter(isExplicitKwd);
    const kwdInvestments = financeRes.records.investments.filter(isExplicitKwd);
    setImportedFinance({
      ...zakatImportCandidates(kwdSavings, kwdInvestments),
      excludedSavings: financeRes.records.savings.length - kwdSavings.length,
      excludedInvestments: financeRes.records.investments.length - kwdInvestments.length,
    });
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
    const refreshVisiblePrices = () => {
      if (document.visibilityState === 'visible') loadMetalsPrices();
    };
    const interval = window.setInterval(refreshVisiblePrices, 5 * 60_000);
    document.addEventListener('visibilitychange', refreshVisiblePrices);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshVisiblePrices);
    };
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
  const hasGoldNisab = goldNisabValue > 0;
  const hasSilverNisab = silverNisabValue > 0;
  const hasCriticalPriceData = nisabMethod === 'gold'
    ? hasGoldNisab
    : nisabMethod === 'silver'
      ? hasSilverNisab
      : hasGoldNisab && hasSilverNisab;
  const selectedNisabValue = nisabMethod === 'gold'
    ? (hasGoldNisab ? goldNisabValue : 0)
    : nisabMethod === 'silver'
      ? (hasSilverNisab ? silverNisabValue : 0)
      : hasGoldNisab && hasSilverNisab ? Math.min(goldNisabValue, silverNisabValue) : 0;
  const reachedNisab = selectedNisabValue > 0 && netZakatBase >= selectedNisabValue;
  const zakatDue = reachedNisab ? netZakatBase * 0.025 : 0;
  const nisabDifference = selectedNisabValue > 0 ? netZakatBase - selectedNisabValue : 0;
  const closeToNisab = selectedNisabValue > 0 && !reachedNisab && netZakatBase >= selectedNisabValue * 0.85;
  const nextHawl = assets
    .map(asset => asset.zakat_due_date)
    .filter((date): date is string => typeof date === 'string' && date >= today())
    .sort()[0];
  const lastSaved = history[0];
  const latestSavedDue = lastSaved ? toNum(lastSaved.zakat_due) : null;
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
  const excludedImportCount = importedFinance.excludedSavings + importedFinance.excludedInvestments;
  const kwdOnlyImportNote = lang === 'ar'
    ? 'KWD فقط: تم استبعاد السجلات ذات العملات الأخرى لمنع خلط العملات.'
    : lang === 'fr'
      ? 'KWD uniquement : les lignes dans une autre devise sont exclues afin de ne pas mélanger les devises.'
      : 'KWD only: records in other currencies are excluded to prevent mixed-currency calculations.';
  const zakatableAssetsTotal = Math.max(0, toNum(zakat.cash) + toNum(zakat.investments) + zakatableGoldValue + zakatableSilverValue);
  const calculationUpdatedAt = goldPriceLastUpdated ? timeLabel(goldPriceLastUpdated) : wx.noUpdate;
  const summaryCards = [
    {
      icon: Coins,
      label: tr.estimatedZakat,
      value: hasCriticalPriceData ? money(zakatDue) : unavailable,
      unavailable: !hasCriticalPriceData,
      explanation: reachedNisab ? tr.dueSummary : tr.notDueSummary,
      formula: wx.formulaZakatDue,
      source: wx.calculationEvidence,
      updated: calculationUpdatedAt,
    },
    { icon: Calculator, label: tr.netZakatBase, value: money(netZakatBase), unavailable: false, explanation: wx.liabilitiesFormula, formula: wx.formulaNetBase, source: wx.calculationEvidence, updated: calculationUpdatedAt },
    {
      icon: ShieldCheck,
      label: tr.selectedNisab,
      value: selectedNisabValue > 0 ? money(selectedNisabValue) : unavailable,
      unavailable: selectedNisabValue <= 0,
      explanation: nisabMethod === 'gold' ? tr.goldBased : nisabMethod === 'silver' ? tr.silverBased : tr.conservative,
      formula: wx.formulaNisab,
      source: wx.sourceMetals,
      updated: calculationUpdatedAt,
    },
    {
      icon: CalendarDays,
      label: tr.nextHawlDate,
      value: nextHawl ? dateLabel(nextHawl) : unavailable,
      unavailable: !nextHawl,
      explanation: tr.hijriEstimated,
      formula: wx.formulaNextHawl,
      source: wx.sourceAssets,
      updated: nextHawl ? dateLabel(nextHawl) : wx.noUpdate,
    },
    {
      icon: FileText,
      label: tr.lastSaved,
      value: lastSaved ? money(toNum(lastSaved.zakat_due), lastSaved.currency) : unavailable,
      unavailable: !lastSaved,
      explanation: wx.sourceSavedCalc,
      formula: wx.formulaLastSaved,
      source: wx.sourceSavedCalc,
      updated: lastSaved?.calculation_date ? dateLabel(lastSaved.calculation_date) : wx.noUpdate,
    },
  ];
  const zakatTabs = [
    { id: 'overview', label: wx.tabsOverview },
    { id: 'assets', label: wx.tabsAssets, count: assets.length },
    { id: 'liabilities', label: wx.tabsLiabilities },
    { id: 'calculation', label: wx.tabsCalculation },
    { id: 'payment', label: wx.tabsPayment },
    { id: 'history', label: wx.tabsHistory, count: history.length },
    { id: 'reports', label: wx.tabsReports },
    { id: 'documents', label: wx.tabsDocuments },
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
    if (!hasCriticalPriceData) {
      setMessage(tr.completeData);
      setActiveTab('calculation');
      return;
    }
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

  const shareSummary = async () => {
    const text = `${tr.title}: ${hasCriticalPriceData ? money(zakatDue) : unavailable}\n${tr.netZakatBase}: ${money(netZakatBase)}\n${tr.selectedNisab}: ${selectedNisabValue > 0 ? money(selectedNisabValue) : unavailable}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: tr.title, text });
      } else {
        await navigator.clipboard.writeText(text);
        setMessage(wx.shareCopied);
      }
    } catch {
      setMessage(wx.shareUnavailable);
    }
  };

  const requestReportPrint = () => {
    if (activeTab === 'reports') {
      window.print();
      return;
    }
    printRequestedRef.current = true;
    setActiveTab('reports');
  };

  useEffect(() => {
    if (activeTab !== 'reports' || !printRequestedRef.current) return;
    printRequestedRef.current = false;
    const frame = window.requestAnimationFrame(() => window.print());
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab]);

  return (
    <div className="zakat-page" data-charity-experience="zakat" dir={dir}>
      <DashboardPageShell contentClassName="zakat-content">
        <section className="zakat-hero">
          <div>
            <span>{tr.breadcrumb}</span>
            <h1>{tr.title}</h1>
            <p>{tr.subtitle}</p>
          </div>
          <div className="hero-actions">
            <button className="gold-btn" type="button" onClick={() => setActiveTab('calculation')}><Calculator size={17} /> {wx.actionCalculate}</button>
            <button className="dark-btn" type="button" onClick={() => setActiveTab('assets')}><CalendarDays size={17} /> {tr.hawlTracking}</button>
            <button className="dark-btn" type="button" onClick={saveZakatCalculation} disabled={!user || saving}>
              <Save size={17} /> {tr.saveCalculation}
            </button>
            <LanguageSwitcher variant="dark" compact />
          </div>
        </section>

        {message && <div className="notice" role="status" aria-live="polite">{message}</div>}

        <section className="zakat-action-center" aria-label={wx.actionCenter}>
          <div><small>{wx.actionCenter}</small><strong>{reachedNisab ? wx.recommendedPay : wx.recommendedCalculate}</strong></div>
          <nav aria-label={wx.actionCenter}>
            <button className="action-primary" type="button" onClick={() => setActiveTab('calculation')}><Calculator size={16} /> {wx.actionCalculate}</button>
            <button type="button" onClick={() => setActiveTab('payment')}><CreditCard size={16} /> {wx.actionPay}</button>
            <button type="button" onClick={requestReportPrint}><Download size={16} /> {wx.actionPdf}</button>
            <button type="button" onClick={() => void shareSummary()}><Share2 size={16} /> {wx.actionShare}</button>
            <button type="button" onClick={() => setActiveTab('history')}><History size={16} /> {wx.actionHistory}</button>
            <button type="button" onClick={() => setActiveTab('assets')}><CalendarDays size={16} /> {wx.actionReminder}</button>
          </nav>
        </section>

        <PageTabs
          tabs={zakatTabs}
          active={activeTab}
          onChange={id => setActiveTab(id as ZakatTab)}
          ariaLabel={tr.title}
          idBase={ZAKAT_TABS_ID}
          sticky
          mobileMode="auto"
        />

        <PageTabPanel idBase={ZAKAT_TABS_ID} value="overview" active={activeTab === 'overview'} className="zakat-overview-panel">
          <section className="zakat-summary-grid" aria-label={wx.overviewTitle}>
            {summaryCards.map(card => {
              const Icon = card.icon;
              return (
                <article className={`warm-card summary-card ${card.unavailable ? 'unavailable' : ''}`} key={card.label}>
                  <span aria-hidden="true"><Icon size={18} /></span>
                  <small>{card.label}</small>
                  <MetricHelp label={`${wx.metricHelp}: ${card.label}`}>
                    <strong>{wx.explanation}</strong><p>{card.explanation}</p>
                  </MetricHelp>
                  <strong dir={card.unavailable ? dir : 'ltr'}>{card.value}</strong>
                  {card.unavailable && <em>{unavailableHelper}</em>}
                  <dl className="metric-meta">
                    <div><dt>{wx.formula}</dt><dd>{card.formula}</dd></div>
                    <div><dt>{wx.source}</dt><dd>{card.source}</dd></div>
                    <div><dt>{wx.lastUpdate}</dt><dd>{card.updated}</dd></div>
                  </dl>
                </article>
              );
            })}
          </section>
          <section className="zakat-overview-grid">
            <article className="warm-card status-overview-card">
              <div className="section-head"><div><small>{wx.currentStatus}</small><h2>{wx.overviewTitle}</h2></div><ShieldCheck size={22} /></div>
              <div className={`overview-status ${reachedNisab ? 'due' : 'not-due'}`}>
                <strong>{hasCriticalPriceData ? (reachedNisab ? tr.reached : tr.notReached) : tr.completeData}</strong>
                <p>{reachedNisab ? wx.recommendedPay : wx.recommendedCalculate}</p>
              </div>
              <p className="separation-note"><Landmark size={16} /> {wx.separateNote}</p>
            </article>
            <article className="warm-card evidence-card">
              <div className="section-head"><div><small>{wx.calculationMethod}</small><h2>{wx.evidence}</h2></div><FileText size={22} /></div>
              <p>{wx.evidenceDescription}</p>
              <dl>
                <div><dt>{tr.nisabMethod}</dt><dd>{nisabMethodLabel(nisabMethod)}</dd></div>
                <div><dt>{wx.source}</dt><dd>{priceSourceLabel}</dd></div>
                <div><dt>{tr.goldPriceToday}</dt><dd dir="ltr">{toNum(zakat.goldPrice) > 0 ? money(toNum(zakat.goldPrice)) : unavailable}</dd></div>
                <div><dt>{tr.silverPriceToday}</dt><dd dir="ltr">{toNum(zakat.silverPrice) > 0 ? money(toNum(zakat.silverPrice)) : unavailable}</dd></div>
                <div><dt>{wx.lastUpdate}</dt><dd>{calculationUpdatedAt}</dd></div>
              </dl>
            </article>
          </section>
        </PageTabPanel>

        <PageTabPanel idBase={ZAKAT_TABS_ID} value="calculation" active={activeTab === 'calculation'} className="zakat-calculation-panel">
        <article className="warm-card calculation-map" data-calculation-scope="zakat">
          <div className="section-head"><div><small>{wx.formula}</small><h2>{wx.calculationTitle}</h2><p>{wx.calculationDescription}</p></div><Calculator size={22} /></div>
          <ol>
            <li><span>1</span><small>{wx.assetsStep}</small><strong dir="ltr">{money(zakatableAssetsTotal)}</strong><em>{tr.cash} + {tr.investments} + {tr.gold} + {tr.silver}</em></li>
            <li><span>2</span><small>{wx.liabilitiesStep}</small><strong dir="ltr">− {money(toNum(zakat.debts))}</strong><em>{wx.deductibleDebt}</em></li>
            <li><span>3</span><small>{wx.netStep}</small><strong dir="ltr">{money(netZakatBase)}</strong><em>{wx.formulaNetBase}</em></li>
            <li><span>4</span><small>{wx.nisabStep}</small><strong dir="ltr">{selectedNisabValue > 0 ? money(selectedNisabValue) : unavailable}</strong><em>{wx.formulaNisab}</em></li>
            <li className={reachedNisab ? 'result-due' : ''}><span>5</span><small>{wx.resultStep}</small><strong dir="ltr">{hasCriticalPriceData ? money(zakatDue) : unavailable}</strong><em>{wx.formulaZakatDue}</em></li>
          </ol>
          <footer><span>{wx.source}: {wx.calculationEvidence}</span><span>{wx.lastUpdate}: {calculationUpdatedAt}</span><span>{wx.resultEvidence}</span></footer>
        </article>
        <section id="zakat-calculator" className="zakat-main-grid">
          <article className="warm-card input-panel">
            <div className="section-head"><h2>{tr.zakatInputs}</h2><Coins size={22} /></div>
            {(importedFinance.savingsTotal > 0 || importedFinance.investmentTotal > 0 || excludedImportCount > 0) && (
              <div className="import-box">
                <strong>{tr.importedDataTitle}</strong>
                <p>{tr.importedDataHint}</p>
                {excludedImportCount > 0 && <p role="note">{kwdOnlyImportNote} ({excludedImportCount})</p>}
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
          <section id="hawl-tracking" className="zakat-assets-workspace">
            <article className="warm-card asset-entry-card">
              <div className="section-head"><div><small>{wx.tabsAssets}</small><h2>{wx.assetsTitle}</h2><p>{wx.assetsDescription}</p></div><WalletCards size={22} /></div>
              {(importedFinance.savingsTotal > 0 || importedFinance.investmentTotal > 0 || excludedImportCount > 0) && (
                <div className="import-box">
                  <strong>{tr.importedDataTitle}</strong><p>{tr.importedDataHint}</p>
                  {excludedImportCount > 0 && <p role="note">{kwdOnlyImportNote} ({excludedImportCount})</p>}
                  {importedFinance.savingsTotal > 0 && <div><span>{tr.foundSavings.replace('{amount}', money(importedFinance.savingsTotal))}</span><button type="button" onClick={() => includeImportedAmount('savings')} disabled={includedImports.savings}>{includedImports.savings ? tr.alreadyIncluded : tr.includeInZakat}</button></div>}
                  {importedFinance.investmentTotal > 0 && <div><span>{tr.foundInvestments.replace('{amount}', money(importedFinance.investmentTotal))}</span><button type="button" onClick={() => includeImportedAmount('investments')} disabled={includedImports.investments}>{includedImports.investments ? tr.alreadyIncluded : tr.includeInZakat}</button></div>}
                </div>
              )}
              <div className="form-grid">
                <label><span>{tr.cash}</span><input inputMode="decimal" value={zakat.cash} onChange={e => setZakat(prev => ({ ...prev, cash: e.target.value }))} placeholder="0.000" /></label>
                <label><span>{tr.investments}</span><input inputMode="decimal" value={zakat.investments} onChange={e => setZakat(prev => ({ ...prev, investments: e.target.value }))} placeholder="0.000" /></label>
              </div>
              <div className="asset-metals-grid">
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
                  <div className="form-grid one">
                    <label><span>{tr.silverWeight}</span><input inputMode="decimal" value={zakat.silverGrams} onChange={e => setZakat(prev => ({ ...prev, silverGrams: e.target.value }))} placeholder="0" /></label>
                    <label><span>{tr.directSilverValue}</span><input inputMode="decimal" value={zakat.silverDirectValue} onChange={e => setZakat(prev => ({ ...prev, silverDirectValue: e.target.value }))} placeholder="0.000" /></label>
                  </div>
                </div>
              </div>
              <details className="asset-box non-zakat-disclosure">
                <summary>{tr.nonZakatableAssets}</summary>
                <p>{tr.nonZakatHelper}</p>
                <div className="chip-grid" role="group" aria-label={tr.nonZakatableAssets}>
                  {nonZakatOptions.map(option => <button key={option} type="button" className={zakat.nonZakatAssets.includes(option) ? 'chip active' : 'chip'} onClick={() => toggleNonZakatAsset(option)} aria-pressed={zakat.nonZakatAssets.includes(option)}>{option === 'other' ? tr.other : tValue(option)}</button>)}
                </div>
                {zakat.nonZakatAssets.includes('other') && <label><span>{tr.otherNonZakatAsset}</span><input value={zakat.nonZakatOther} onChange={e => setZakat(prev => ({ ...prev, nonZakatOther: e.target.value }))} /></label>}
              </details>
            </article>

            <article className="warm-card saved-assets-card">
              <div className="section-head"><div><small>{tr.hawlTracking}</small><h2>{wx.savedAssetsTitle}</h2></div><CalendarDays size={22} /></div>
              <div className="form-grid">
                <label><span>{tr.assetName}</span><input value={assetForm.asset_name} onChange={e => setAssetForm(prev => ({ ...prev, asset_name: e.target.value }))} /></label>
                <label><span>{tr.assetType}</span><select value={assetForm.asset_type} onChange={e => setAssetForm(prev => ({ ...prev, asset_type: e.target.value as AssetType, is_zakatable: e.target.value !== 'non_zakat' }))}>{assetTypes.map(type => <option key={type} value={type}>{assetTypeLabel(type)}</option>)}</select></label>
                <label><span>{tr.amount}</span><input inputMode="decimal" value={assetForm.amount} onChange={e => setAssetForm(prev => ({ ...prev, amount: e.target.value }))} /></label>
                <label><span>{tr.ownershipDate}</span><input type="date" value={assetForm.ownership_date} onChange={e => setAssetForm(prev => ({ ...prev, ownership_date: e.target.value, zakat_due_date: addYear(e.target.value) }))} /></label>
                <label><span>{tr.dueDate}</span><input type="date" value={assetForm.zakat_due_date} onChange={e => setAssetForm(prev => ({ ...prev, zakat_due_date: e.target.value }))} /></label>
                <label className="check-row"><input type="checkbox" checked={assetForm.is_zakatable} onChange={e => setAssetForm(prev => ({ ...prev, is_zakatable: e.target.checked }))} /><span>{wx.zakatableAsset}</span></label>
                <button className="primary-wide wide" type="button" onClick={saveAsset}><Save size={16} /> {tr.addAsset}</button>
              </div>
              {assets.length === 0 ? (
                <EmptyState className="zakat-empty-state" icon={<CalendarDays size={26} />} title={wx.noAssetsTitle} description={wx.noAssetsDesc} />
              ) : (
                <div className="asset-list">
                  {assets.map(asset => {
                    const dueDays = asset.zakat_due_date ? daysUntil(asset.zakat_due_date) : null;
                    const status = !asset.ownership_date ? tr.missingOwnershipDate : dueDays !== null && dueDays <= 0 ? tr.completedHawl : tr.upcomingHawl;
                    return <article key={asset.id}><div><strong>{asset.asset_name}</strong><span>{assetTypeLabel(asset.asset_type)} • {money(toNum(asset.amount), asset.currency)}</span></div><b>{status}</b><small>{dateLabel(asset.zakat_due_date || asset.ownership_date)} • {estimatedHijriDate(asset.zakat_due_date || asset.ownership_date, lang as Lang)} • {tr.hijriEstimated}</small></article>;
                  })}
                </div>
              )}
            </article>
          </section>
        </PageTabPanel>

        <PageTabPanel idBase={ZAKAT_TABS_ID} value="liabilities" active={activeTab === 'liabilities'}>
          <section className="zakat-liabilities-grid">
            <article className="warm-card liabilities-entry-card">
              <div className="section-head"><div><small>{wx.tabsLiabilities}</small><h2>{wx.liabilitiesTitle}</h2><p>{wx.liabilitiesDescription}</p></div><ReceiptText size={22} /></div>
              <label className="liability-field"><span>{wx.deductibleDebt}</span><input inputMode="decimal" value={zakat.debts} onChange={e => setZakat(prev => ({ ...prev, debts: e.target.value }))} placeholder="0.000" /></label>
              <p className="formula-note"><Calculator size={16} /> {wx.liabilitiesFormula}</p>
            </article>
            <article className="warm-card net-preview-card">
              <small>{wx.netPreview}</small><strong dir="ltr">{money(netZakatBase)}</strong>
              <dl><div><dt>{wx.assetsStep}</dt><dd dir="ltr">{money(zakatableAssetsTotal)}</dd></div><div><dt>{wx.liabilitiesStep}</dt><dd dir="ltr">− {money(toNum(zakat.debts))}</dd></div></dl>
              <p>{wx.formulaNetBase}</p>
            </article>
          </section>
        </PageTabPanel>

        <PageTabPanel idBase={ZAKAT_TABS_ID} value="payment" active={activeTab === 'payment'}>
          <section className="zakat-payment-grid">
            <article className="warm-card payment-summary-card">
              <div className="section-head"><div><small>{wx.tabsPayment}</small><h2>{wx.paymentTitle}</h2><p>{wx.paymentDescription}</p></div><CreditCard size={22} /></div>
              <div className="payment-metrics"><div><small>{wx.paymentDue}</small><strong dir="ltr">{latestSavedDue !== null ? money(latestSavedDue, lastSaved?.currency) : unavailable}</strong></div><div><small>{wx.paymentRecorded}</small><strong>{wx.notRecorded}</strong></div><div><small>{wx.paymentRemaining}</small><strong dir="ltr">{latestSavedDue !== null ? money(latestSavedDue, lastSaved?.currency) : unavailable}</strong></div></div>
            </article>
            <EmptyState className="warm-card zakat-empty-state payment-empty" icon={<ReceiptText size={28} />} title={wx.noPaymentsTitle} description={wx.noPaymentsDesc} actions={<Link className="primary-wide" href="/charity-projects?tab=projects&scope=zakat">{wx.recordPayment}</Link>} />
          </section>
        </PageTabPanel>

        <PageTabPanel idBase={ZAKAT_TABS_ID} value="history" active={activeTab === 'history'}>
        <section className="warm-card">
          <div className="section-head">
            <h2>{tr.zakatHistory}</h2>
            <Link className="secondary-link" href="/charity-projects?tab=projects&scope=zakat">{tr.openCharityProjects}</Link>
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
          <section className="warm-card zakat-reports-card">
            <div className="section-head">
              <div><small>{wx.tabsReports}</small><h2>{wx.reportsTitle}</h2><p>{wx.reportsDesc}</p></div>
              <FileText size={22} />
            </div>
            {history.length === 0 ? (
              <EmptyState className="zakat-empty-state" icon={<FileText size={28} />} title={tr.noHistory} description={wx.reportsDesc} actions={<button className="primary-wide" type="button" onClick={() => setActiveTab('calculation')}>{wx.actionCalculate}</button>} />
            ) : (
              <div className="report-records">
                {history.map(item => {
                  const reportYear = item.calculation_date ? new Date(`${item.calculation_date.slice(0, 10)}T00:00:00`).getFullYear() : new Date().getFullYear();
                  return (
                    <article className="report-record" key={item.id}>
                      <dl>
                        <div><dt>{wx.year}</dt><dd>{reportYear}</dd></div>
                        <div><dt>{wx.amount}</dt><dd dir="ltr">{money(toNum(item.zakat_due), item.currency)}</dd></div>
                        <div><dt>{wx.category}</dt><dd>{tr.title}</dd></div>
                        <div><dt>{wx.calculation}</dt><dd>{nisabMethodLabel(item.nisab_method)}</dd></div>
                        <div><dt>{wx.payment}</dt><dd>{wx.notRecorded}</dd></div>
                        <div><dt>{wx.receipt}</dt><dd>{wx.notRecorded}</dd></div>
                        <div><dt>{wx.pdf}</dt><dd><button type="button" onClick={() => window.print()}>{wx.exportPdf}</button></dd></div>
                        <div><dt>{wx.status}</dt><dd><span className="report-status draft">{wx.draft}</span></dd></div>
                      </dl>
                    </article>
                  );
                })}
              </div>
            )}
            <div className="report-footer-actions"><button className="primary-wide" type="button" onClick={() => window.print()}><Download size={16} /> {wx.exportPdf}</button><button className="secondary-link" type="button" onClick={() => setActiveTab('documents')}>{wx.openDocuments}</button></div>
          </section>
        </PageTabPanel>

        <PageTabPanel idBase={ZAKAT_TABS_ID} value="documents" active={activeTab === 'documents'}>
          <section className="warm-card zakat-documents-card">
            <div className="section-head"><div><small>{wx.tabsDocuments}</small><h2>{wx.documentsTitle}</h2><p>{wx.documentsDesc}</p></div><ReceiptText size={22} /></div>
            <EmptyState className="zakat-empty-state" icon={<ReceiptText size={28} />} title={wx.noDocumentsTitle} description={wx.noDocumentsDesc} actions={<Link className="primary-wide" href="/charity-projects?tab=documents&scope=zakat">{wx.openDocuments}</Link>} />
          </section>
        </PageTabPanel>
      </DashboardPageShell>

      <style jsx>{`
        .zakat-page{min-height:100vh;background:var(--background);color:var(--foreground);font-family:var(--font-ui);overflow-x:hidden}.zakat-content{display:grid;gap:18px}.zakat-hero{position:relative;overflow:hidden;border-radius:var(--radius-panel);padding:28px;background:var(--surface);color:var(--surface);display:flex;align-items:center;justify-content:space-between;gap:20px;box-shadow:var(--shadow-card)}.zakat-hero span{color:var(--accent);font-size:12px;font-weight:600}.zakat-hero h1{margin:10px 0 8px;font-size:42px;line-height:1.05;font-weight:600}.zakat-hero p{margin:0;color:color-mix(in srgb, var(--accent) 76%, transparent);max-width:720px;line-height:1.75}.hero-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}.gold-btn,.dark-btn,.primary-wide,.secondary-link{min-height:44px;border-radius:var(--radius-control);border:1px solid color-mix(in srgb, var(--primary-soft) 28%, transparent);display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;font-weight:600;text-decoration:none;cursor:pointer;font-family:inherit}.gold-btn,.primary-wide{background:var(--primary);color:var(--surface);box-shadow:var(--shadow-card)}.dark-btn{background:color-mix(in srgb, var(--surface) 10%, transparent);color:var(--surface)}.dark-btn:disabled,.primary-wide:disabled{opacity:.55;cursor:not-allowed}.secondary-link{background:var(--surface);color:var(--foreground);border-color:color-mix(in srgb, var(--info) 18%, transparent)}.notice{border:1px solid color-mix(in srgb, var(--info) 18%, transparent);background:var(--surface-muted);color:var(--primary-hover);border-radius:var(--radius-card);padding:12px 14px;font-weight:600}.zakat-summary-grid{display:grid;grid-template-columns:repeat(5,minmax(170px,1fr));gap:16px;align-items:stretch;margin-top:4px}.warm-card{background:var(--surface);border:1px solid color-mix(in srgb, var(--info) 16%, transparent);border-radius:var(--radius-card);box-shadow:var(--shadow-card);padding:18px;min-width:0}.summary-card{display:grid;gap:8px}.summary-card span{width:36px;height:36px;border-radius:var(--radius-control);background:color-mix(in srgb, var(--info) 10%, transparent);color:var(--danger);display:grid;place-items:center}.summary-card small{color:var(--foreground-muted);font-weight:600}.summary-card strong{font-size:20px;color:var(--foreground);overflow-wrap:anywhere}.zakat-summary-grid .summary-card{min-height:136px;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto 1fr auto;align-items:start;gap:7px 12px;padding:18px 16px;border-radius:var(--radius-card)}.zakat-summary-grid .summary-card span{grid-row:1 / span 2;width:42px;height:42px;border-radius:var(--radius-control);color:var(--primary)}.zakat-summary-grid .summary-card small{font-size:12.5px;line-height:1.45;font-weight:600}.zakat-summary-grid .summary-card strong{align-self:end;font-size:clamp(18px,1.35vw,23px);line-height:1.25;overflow-wrap:normal;word-break:keep-all;unicode-bidi:isolate}.zakat-summary-grid .summary-card em{grid-column:2;font-style:normal;color:var(--foreground-muted);font-size:11.5px;font-weight:600;line-height:1.45}.zakat-summary-grid .summary-card.unavailable strong{font-size:16px;white-space:normal}.zakat-main-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr) minmax(280px,.78fr);gap:16px;align-items:start}.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.section-head h2{margin:0;font-size:19px;color:var(--foreground)}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.form-grid.one{grid-template-columns:1fr}.form-grid label,.asset-box label{display:grid;gap:7px;color:var(--foreground);font-size:13px;font-weight:600;min-width:0}.form-grid span,.asset-box span{min-width:0}.form-grid input,.form-grid select,.asset-box input{width:100%;min-height:44px;border:1px solid color-mix(in srgb, var(--info) 18%, transparent);border-radius:var(--radius-control);background:var(--surface);color:var(--foreground);padding:0 12px;outline:none;font-family:inherit}.form-grid input:focus,.form-grid select:focus,.asset-box input:focus{border-color:var(--accent);box-shadow:var(--focus-shadow)}.wide{grid-column:1 / -1}.asset-box,.manual-box,.import-box{margin-top:12px;border:1px solid color-mix(in srgb, var(--info) 13%, transparent);background:var(--surface-muted);border-radius:var(--radius-card);padding:14px;display:grid;gap:10px;min-width:0}.asset-box strong,.import-box strong{color:var(--foreground)}.asset-box p,.manual-box p,.import-box p,.muted,.disclaimer{margin:0;color:var(--foreground-muted);line-height:1.7;font-size:13px}.import-box div{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;border:1px solid color-mix(in srgb, var(--info) 12%, transparent);background:var(--surface);border-radius:var(--radius-control);padding:10px}.import-box span{color:var(--foreground);font-weight:600;line-height:1.6}.import-box button{min-height:36px;border-radius:var(--radius-control);border:1px solid color-mix(in srgb, var(--info) 20%, transparent);background:var(--foreground);color:var(--surface);padding:0 12px;font-weight:600;font-family:inherit;cursor:pointer}.import-box button:disabled{background:var(--surface-muted);color:var(--accent);cursor:default}.chip-grid{display:flex;flex-wrap:wrap;gap:8px}.chip{border:1px solid color-mix(in srgb, var(--info) 20%, transparent);background:var(--surface-muted);color:var(--foreground);border-radius:var(--radius-pill);min-height:36px;padding:0 12px;font-weight:600;cursor:pointer}.chip.active{background:var(--foreground);color:var(--surface);border-color:var(--foreground)}.price-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.price-card{background:var(--primary);border:1px solid color-mix(in srgb, var(--surface) 12%, transparent);border-radius:var(--radius-card);padding:15px;color:var(--surface);min-width:0;box-shadow:var(--shadow-card)}.price-card small,.price-card span,.price-card em{display:block;font-style:normal;font-weight:600}.price-card small{color:var(--info);text-align:start}.price-card strong{display:block;margin:7px 0 5px;color:var(--surface);font-size:clamp(20px,4.8vw,25px);line-height:1.25;overflow-wrap:anywhere}.price-card span{color:var(--accent)}.price-card em{margin-top:6px;color:var(--info);font-size:12px}.price-meta{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;color:var(--primary-hover);font-size:12px;font-weight:600}.price-meta span{border-radius:var(--radius-pill);background:color-mix(in srgb, var(--info) 12%, transparent);border:1px solid color-mix(in srgb, var(--info) 16%, transparent);color:var(--foreground);padding:6px 10px}.result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.result-grid div{border:1px solid color-mix(in srgb, var(--info) 12%, transparent);background:var(--surface-muted);border-radius:var(--radius-control);padding:11px;min-width:0}.result-grid small{display:block;color:var(--foreground-muted);font-weight:600}.result-grid strong{display:block;color:var(--foreground);font-size:16px;margin-top:4px;overflow-wrap:anywhere}.result-grid .nisab-reached{background:var(--surface-muted)}.result-grid .nisab-reached strong{color:var(--accent)}.result-grid .nisab-missing{background:var(--foreground-secondary)}.outcome{margin:12px 0 0;border-radius:var(--radius-card);background:var(--surface-muted);color:var(--accent);padding:12px;font-weight:600;line-height:1.7}.guidance-list{display:grid;gap:9px}.guidance-list p{margin:0;display:flex;gap:8px;align-items:flex-start;border:1px solid color-mix(in srgb, var(--info) 12%, transparent);background:var(--surface-muted);border-radius:var(--radius-control);padding:11px;color:var(--foreground);line-height:1.65}.guidance-list svg{color:var(--primary);flex:0 0 auto;margin-top:2px}.guidance-panel .primary-wide{width:100%;margin:14px 0}.split-grid{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:16px}.check-row{display:flex!important;align-items:center;gap:9px}.check-row input{width:auto;min-height:auto}.asset-list,.history-list{display:grid;gap:10px}.asset-list article,.history-list article{border:1px solid color-mix(in srgb, var(--info) 13%, transparent);background:var(--surface-muted);border-radius:var(--radius-card);padding:12px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}.asset-list span,.asset-list small,.history-list span,.history-list small{color:var(--foreground-muted);overflow-wrap:anywhere}.asset-list strong,.history-list strong{color:var(--foreground);overflow-wrap:anywhere}.asset-list b{color:var(--primary-hover)}.history-list article{grid-template-columns:1fr 1fr 1fr 1fr .7fr auto}.history-list button{width:36px;height:var(--control-h-sm);border:1px solid color-mix(in srgb, var(--danger) 14%, transparent);border-radius:var(--radius-control);background:var(--surface);color:var(--danger);display:grid;place-items:center;cursor:pointer}@media(max-width:1180px){.zakat-summary-grid{grid-template-columns:repeat(3,minmax(180px,1fr))}.zakat-main-grid{grid-template-columns:1fr 1fr}.guidance-panel{grid-column:1 / -1}}@media(max-width:760px){.zakat-hero{display:grid;padding:22px}.zakat-hero h1{font-size:34px}.hero-actions{display:grid;grid-template-columns:1fr;width:100%}.zakat-summary-grid,.zakat-main-grid,.split-grid,.form-grid,.price-grid,.result-grid,.import-box div{grid-template-columns:1fr}.history-list article,.asset-list article{grid-template-columns:1fr}.warm-card{padding:16px}.gold-btn,.dark-btn,.primary-wide,.secondary-link,.import-box button{width:100%}}

        /* Zakat route production polish for the Charity Projects module. */
        .zakat-page{background:var(--background);overflow-x:clip}
        .zakat-page .sfm-dashboard-page-content.zakat-content{width:100%;max-inline-size:none;margin-inline:0;gap:clamp(16px,1.8vw,24px);min-width:0}
        .zakat-page .sfm-dashboard-page-content.zakat-content > *{inline-size:100%;min-width:0}
        .zakat-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,max-content);align-items:center;border-radius:var(--radius-panel);min-height:0}
        .zakat-hero h1{font-size:clamp(32px,3.2vw,46px);letter-spacing:0;text-wrap:balance;color:var(--surface)!important}.zakat-hero p{font-size:15.5px;max-width:780px}.hero-actions{min-width:0}.hero-actions > *{flex:0 1 auto}
        .zakat-page :is(.gold-btn,.dark-btn,.primary-wide,.secondary-link){border-radius:var(--radius-control);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.zakat-page :is(.gold-btn,.dark-btn,.primary-wide,.secondary-link):hover:not(:disabled){transform:translateY(-1px)}.zakat-page :is(button,a,input,select):focus-visible{outline:3px solid color-mix(in srgb, var(--accent) 34%, transparent);outline-offset:2px}
        .zakat-page .page-section-tabs{display:flex;align-items:stretch;gap:8px;min-height:62px;padding:8px;border:1px solid color-mix(in srgb, var(--info) 13%, transparent);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card);overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch}.zakat-page .page-section-tabs::-webkit-scrollbar{display:none}.zakat-page .page-section-tabs button{flex:1 0 auto;min-width:max-content;min-height:48px;border-radius:var(--radius-card);white-space:nowrap}.zakat-page .page-section-tabs button.active{background:var(--foreground);color:var(--surface);border-color:color-mix(in srgb, var(--primary-soft) 32%, transparent);box-shadow:var(--shadow-card)}
        .zakat-page .warm-card{border-radius:var(--radius-panel);border:1px solid var(--border);box-shadow:var(--shadow-card);background:var(--surface);min-width:0}.zakat-summary-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.zakat-summary-grid .summary-card{height:100%;min-height:124px}.zakat-summary-grid .summary-card strong,.result-grid strong,.price-card strong,.history-list strong,.asset-list strong{direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums}
        .zakat-main-grid{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) minmax(300px,.8fr);gap:16px;align-items:start}.split-grid{grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);gap:16px}.section-head{align-items:center}.section-head h2{letter-spacing:0;text-wrap:balance}.form-grid{gap:14px}.form-grid label,.asset-box label{line-height:1.45}.form-grid input,.form-grid select,.asset-box input{min-height:46px;border-radius:var(--radius-control)}.asset-box,.manual-box,.import-box,.guidance-list p,.result-grid div,.asset-list article,.history-list article{border-radius:var(--radius-card)}.guidance-panel,.summary-panel,.input-panel{height:fit-content}.history-list article,.asset-list article{min-width:0}.history-list span,.history-list small,.asset-list span,.asset-list small{overflow-wrap:anywhere}.muted{border-radius:var(--radius-card);background:color-mix(in srgb, var(--accent) 55%, transparent);padding:14px;border:1px dashed color-mix(in srgb, var(--info) 18%, transparent)}
        @media(max-width:1260px){.zakat-hero{grid-template-columns:1fr}.zakat-summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.zakat-main-grid{grid-template-columns:1fr 1fr}.guidance-panel{grid-column:1 / -1}.hero-actions{justify-content:flex-start}}
        @media(max-width:920px){.zakat-summary-grid,.zakat-main-grid,.split-grid{grid-template-columns:1fr}.zakat-page .page-section-tabs button{flex:0 0 auto;min-width:142px}.history-list article{grid-template-columns:1fr}}
        @media(max-width:560px){.zakat-page .sfm-dashboard-page-content.zakat-content{gap:14px}.zakat-hero{padding:18px;border-radius:var(--radius-panel)}.hero-actions{display:grid;grid-template-columns:1fr;width:100%}.zakat-summary-grid,.form-grid,.price-grid,.result-grid{grid-template-columns:1fr}.warm-card{border-radius:var(--radius-panel);padding:16px}.zakat-page .page-section-tabs button{min-width:132px}.section-head{display:grid}.section-head svg{order:-1}.gold-btn,.dark-btn,.primary-wide,.secondary-link{width:100%}}

        /* Phase 2.8 — route-scoped Islamic finance experience. */
        .zakat-page{
          background:var(--background);color:var(--foreground)
        }
        .zakat-hero{background:var(--hero-gradient);color:var(--hero-foreground);border-color:color-mix(in srgb, var(--hero-foreground) 22%, transparent);box-shadow:var(--shadow-card)}
        .zakat-hero h1{color:var(--hero-foreground)!important}.zakat-hero>div>span,.zakat-hero p{color:var(--hero-foreground-muted)}
        .zakat-action-center{display:grid;grid-template-columns:minmax(240px,.72fr) minmax(0,1.28fr);gap:16px;align-items:center;padding:16px 18px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card)}
        .zakat-action-center>div{display:grid;gap:4px}.zakat-action-center>div small{color:var(--accent);font-weight:600}.zakat-action-center>div strong{color:var(--foreground);font-size:14px;line-height:1.6}
        .zakat-action-center nav{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}.zakat-action-center button{min-height:44px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground);padding:0 13px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-weight:600;cursor:pointer}.zakat-action-center button.action-primary{background:var(--primary);border-color:var(--primary);color:var(--primary-foreground)}.zakat-action-center button:hover{border-color:var(--primary);transform:translateY(-1px)}
        .zakat-overview-panel{display:grid;gap:16px}.zakat-summary-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.zakat-summary-grid .summary-card{min-height:258px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-rows:auto auto auto 1fr;align-content:start;gap:7px 11px;background:var(--surface);border-color:var(--border)}
        .zakat-summary-grid .summary-card>span{grid-column:1;grid-row:1 / span 2;background:color-mix(in srgb, var(--accent) 10%, transparent);color:var(--primary)}.zakat-summary-grid .summary-card>small{grid-column:2;grid-row:1;color:var(--foreground-muted)}.zakat-summary-grid .summary-card>.metric-help{grid-column:3;grid-row:1 / span 2}.zakat-summary-grid .summary-card>strong{grid-column:2 / 4;grid-row:2;color:var(--foreground);font-size:clamp(18px,1.35vw,24px)}.zakat-summary-grid .summary-card>em{grid-column:2 / 4;grid-row:3}.metric-meta{grid-column:1 / 4;grid-row:4;display:grid;gap:7px;margin:7px 0 0;padding-top:10px;border-top:1px solid var(--border)}.metric-meta div{display:grid;gap:2px}.metric-meta dt{color:var(--accent);font-size:10.5px;font-weight:600}.metric-meta dd{margin:0;color:var(--foreground-muted);font-size:11px;line-height:1.45;overflow-wrap:anywhere}
        .zakat-overview-grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:16px}.section-head small{display:block;color:var(--accent);font-weight:600;margin-bottom:4px}.section-head p{margin:5px 0 0;color:var(--foreground-muted);line-height:1.65}.overview-status{border:1px solid var(--border);border-radius:var(--radius-card);padding:16px;background:var(--surface-muted)}.overview-status strong{color:var(--foreground);font-size:20px}.overview-status p{margin:6px 0 0;color:var(--foreground-muted);line-height:1.65}.overview-status.due{border-color:color-mix(in srgb, var(--warning) 42%, transparent);background:var(--foreground-secondary)}.separation-note{display:flex;align-items:flex-start;gap:8px;margin:12px 0 0;padding:12px;border-inline-start:3px solid var(--accent);background:color-mix(in srgb, var(--warning) 8%, transparent);color:var(--foreground);line-height:1.65}.evidence-card>p{color:var(--foreground-muted);line-height:1.7}.evidence-card>dl{display:grid;gap:0;margin:14px 0 0}.evidence-card>dl div{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:12px;padding:10px 0;border-top:1px solid var(--border)}.evidence-card dt{color:var(--foreground-muted);font-weight:600}.evidence-card dd{margin:0;color:var(--foreground);font-weight:600;text-align:end}
        .calculation-map{margin-bottom:16px}.calculation-map ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.calculation-map li{position:relative;min-width:0;padding:14px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted);display:grid;gap:6px}.calculation-map li:not(:last-child)::after{content:'›';position:absolute;inset-inline-end:-10px;top:50%;translate:0 -50%;z-index:1;color:var(--accent);font-size:20px;font-weight:600}.zakat-page[dir='rtl'] .calculation-map li:not(:last-child)::after{content:'‹'}.calculation-map li>span{width:27px;height:27px;border-radius:var(--radius-pill);display:grid;place-items:center;background:var(--primary);color:var(--surface);font-weight:600}.calculation-map small{color:var(--accent);font-weight:600}.calculation-map strong{color:var(--foreground);font-size:17px;overflow-wrap:anywhere}.calculation-map em{color:var(--foreground-muted);font-size:11.5px;line-height:1.5;font-style:normal}.calculation-map li.result-due{background:var(--foreground-secondary);border-color:color-mix(in srgb, var(--warning) 50%, transparent)}.calculation-map footer{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.calculation-map footer span{border-radius:var(--radius-pill);background:var(--surface-muted);color:var(--foreground-muted);padding:6px 10px;font-size:11px;font-weight:600}
        .zakat-calculation-panel .zakat-main-grid{grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr)}.zakat-calculation-panel .input-panel{display:none}.summary-panel,.guidance-panel{background:var(--surface)}.price-card{background:var(--accent);color:var(--accent-foreground);border-color:color-mix(in srgb, var(--accent) 34%, var(--border))}.price-card small,.price-card span,.price-card em,.price-card strong{color:var(--accent-foreground)}.price-meta span{background:color-mix(in srgb, var(--accent) 10%, transparent);border-color:color-mix(in srgb, var(--accent) 18%, transparent);color:var(--foreground)}
        .zakat-assets-workspace{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(340px,.88fr);gap:16px;align-items:start}.asset-entry-card,.saved-assets-card{min-width:0}.asset-metals-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.non-zakat-disclosure summary{cursor:pointer;color:var(--foreground);font-weight:600}.saved-assets-card .asset-list{margin-top:16px}.zakat-empty-state{margin-top:16px;border:1px dashed var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}
        .zakat-liabilities-grid,.zakat-payment-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:16px;align-items:stretch}.liability-field{display:grid;gap:8px;color:var(--foreground);font-weight:600}.liability-field input{width:100%;min-height:48px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface);color:var(--foreground);padding:0 13px;font:600 16px var(--font-data)}.formula-note{display:flex;align-items:center;gap:8px;margin:14px 0 0;padding:12px;border-radius:var(--radius-card);background:var(--surface-muted);color:var(--foreground-muted);line-height:1.6}.net-preview-card{display:grid;align-content:center;gap:12px}.net-preview-card>small{color:var(--foreground-muted);font-weight:600}.net-preview-card>strong{font-size:clamp(28px,4vw,42px);color:var(--primary)}.net-preview-card dl{display:grid;gap:8px}.net-preview-card dl div{display:flex;justify-content:space-between;gap:12px}.net-preview-card dt{color:var(--foreground-muted)}.net-preview-card dd{margin:0;color:var(--foreground);font-weight:600}.net-preview-card p{margin:0;color:var(--foreground-muted);line-height:1.6}
        .payment-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.payment-metrics div{padding:14px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.payment-metrics small{display:block;color:var(--foreground-muted);font-weight:600}.payment-metrics strong{display:block;margin-top:7px;color:var(--foreground);font-size:18px}.payment-empty{margin:0!important;display:grid;place-content:center;text-align:center}
        .report-records{display:grid;gap:12px}.report-record{border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted);padding:14px}.report-record dl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0}.report-record dl div{min-width:0;display:grid;gap:5px}.report-record dt{color:var(--foreground-muted);font-size:11px;font-weight:600}.report-record dd{margin:0;color:var(--foreground);font-weight:600;overflow-wrap:anywhere}.report-record button{min-height:36px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface);color:var(--primary);padding:0 10px;font-weight:600;cursor:pointer}.report-status{display:inline-flex;border-radius:var(--radius-pill);padding:5px 9px;background:color-mix(in srgb, var(--accent) 12%, transparent);color:var(--primary-hover);font-size:11px}.report-status.draft{background:color-mix(in srgb, var(--warning) 14%, transparent);color:var(--accent)}.report-footer-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
        .zakat-page :is(.gold-btn,.primary-wide){background:var(--primary);border-color:var(--primary);color:var(--primary-foreground);box-shadow:var(--shadow-card)}.zakat-page .secondary-link{border-color:var(--border);background:var(--surface);color:var(--primary)}.zakat-page :is(input,select,button,a):focus-visible{outline:3px solid var(--focus-ring);outline-offset:2px}.zakat-page :is(.warm-card,.asset-box,.manual-box,.import-box,.result-grid div,.guidance-list p,.asset-list article,.history-list article){border-color:var(--border)}
        .calculation-map li>span{color:var(--primary-foreground)}
        .zakat-page :is(.summary-card strong,.result-grid strong,.price-card strong,.history-list strong,.asset-list strong,.calculation-map strong,.net-preview-card>strong,.net-preview-card dd,.payment-metrics strong,.report-record dd){font-family:var(--font-data)}
        @media(max-width:1180px){.zakat-summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.calculation-map ol{grid-template-columns:repeat(3,minmax(0,1fr))}.calculation-map li::after{display:none}.zakat-assets-workspace{grid-template-columns:1fr}.zakat-action-center{grid-template-columns:1fr}.zakat-action-center nav{justify-content:flex-start}}
        @media(max-width:920px){.zakat-overview-grid,.zakat-liabilities-grid,.zakat-payment-grid,.zakat-calculation-panel .zakat-main-grid{grid-template-columns:1fr}.asset-metals-grid{grid-template-columns:1fr}.calculation-map ol{grid-template-columns:repeat(2,minmax(0,1fr))}.report-record dl{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:560px){.zakat-action-center{padding:14px}.zakat-action-center nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.zakat-action-center button{width:100%;padding:0 9px}.zakat-summary-grid,.calculation-map ol,.payment-metrics,.report-record dl{grid-template-columns:1fr}.zakat-summary-grid .summary-card{min-height:0}.zakat-overview-grid,.zakat-assets-workspace{gap:12px}.report-footer-actions{display:grid}.evidence-card>dl div{grid-template-columns:1fr}.evidence-card dd{text-align:start}}
        @media(max-width:360px){.zakat-action-center nav{grid-template-columns:1fr}}
        @media(prefers-reduced-motion:reduce){.zakat-page *,.zakat-page *::before,.zakat-page *::after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}
        @media print{.zakat-hero,.zakat-action-center,.page-section-tabs-shell,.hero-actions,.report-footer-actions{display:none!important}.zakat-page{background:var(--surface)}.zakat-content{max-inline-size:none!important}.warm-card{box-shadow:none!important}}

      `}</style>
    </div>
  );
}
