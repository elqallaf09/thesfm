'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';
import { loadUserDataTables } from '@/lib/data/financeData';
import { zakatImportCandidates } from '@/lib/data/zakatData';

type Lang = 'ar' | 'en' | 'fr';
type AssetType = 'cash' | 'savings' | 'investment' | 'gold' | 'silver' | 'non_zakat';
type NisabMethod = 'gold' | 'silver' | 'conservative';

type MetalsPriceResponse = {
  success: boolean;
  source: 'api' | 'manual' | 'fallback';
  currency: 'KWD';
  gold: {
    pricePerGram: number;
    pricePerGram24k?: number;
    pricePerGram22k?: number;
    pricePerGram21k?: number;
    pricePerGram18k?: number;
    unit: 'gram';
  };
  silver: { pricePerGram: number; unit: 'gram' };
  updatedAt: string;
  message?: string;
};

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

const TEXT = {
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
    live: 'مباشر',
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
    live: 'Live',
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
    live: 'Direct',
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
    importedDataTitle: 'Valeurs financières de votre compte',
    importedDataHint: 'Vous pouvez inclure ces valeurs dans la zakat uniquement après confirmation.',
    foundSavings: 'Une épargne de {amount} a été trouvée. Voulez-vous l’inclure dans le calcul de la zakat ?',
    foundInvestments: 'Des investissements de {amount} ont été trouvés. Voulez-vous les inclure dans le calcul de la zakat ?',
    includeInZakat: 'Inclure dans le calcul',
    alreadyIncluded: 'Inclus',
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
  return Number(String(value ?? 0).replace(/[^\d.-]/g, '')) || 0;
}

function estimatedHijriDate(date?: string | null, lang: Lang = 'ar') {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : lang === 'fr' ? 'fr-FR-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${date}T00:00:00`));
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
  const [saving, setSaving] = useState(false);
  const [loadingMetals, setLoadingMetals] = useState(false);
  const [priceMode, setPriceMode] = useState<'automatic' | 'manual'>('manual');
  const [metalsPrice, setMetalsPrice] = useState<MetalsPriceResponse | null>(null);
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

  const money = useCallback((amount: number, currency = 'KWD') => formatMoney(amount, currency, lang as Lang), [lang]);
  const dateLabel = useCallback((date?: string | null) => date ? new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US') : '-', [lang]);

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
    setLoadingMetals(true);
    try {
      const response = await fetch('/api/zakat/metals-prices');
      const data = await response.json() as MetalsPriceResponse;
      setMetalsPrice(data);
      if (data.success && data.source === 'api') {
        setPriceMode('automatic');
        setZakat(prev => ({
          ...prev,
          goldPrice: String(data.gold.pricePerGram24k || data.gold.pricePerGram || ''),
          silverPrice: String(data.silver.pricePerGram || ''),
        }));
      } else {
        setPriceMode('manual');
      }
    } catch {
      setPriceMode('manual');
      setMetalsPrice({
        success: false,
        source: 'manual',
        message: tr.apiNotConfigured,
        currency: 'KWD',
        gold: { pricePerGram: 0, unit: 'gram' },
        silver: { pricePerGram: 0, unit: 'gram' },
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setLoadingMetals(false);
    }
  }, [tr.apiNotConfigured]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const savedGold = window.localStorage.getItem('sfm_zakat_gold_price_kwd') ?? window.localStorage.getItem('sfm_charity_gold_price_kwd') ?? '';
    const savedSilver = window.localStorage.getItem('sfm_zakat_silver_price_kwd') ?? window.localStorage.getItem('sfm_charity_silver_price_kwd') ?? '';
    const savedMethod = window.localStorage.getItem('sfm_zakat_nisab_method') ?? window.localStorage.getItem('sfm_charity_nisab_method');
    if (savedGold || savedSilver) setZakat(prev => ({ ...prev, goldPrice: savedGold, silverPrice: savedSilver }));
    if (savedMethod && ['gold', 'silver', 'conservative'].includes(savedMethod)) setNisabMethod(savedMethod as NisabMethod);
    loadMetalsPrices();
  }, [loadMetalsPrices]);

  useEffect(() => {
    window.localStorage.setItem('sfm_zakat_gold_price_kwd', zakat.goldPrice);
    window.localStorage.setItem('sfm_zakat_silver_price_kwd', zakat.silverPrice);
  }, [zakat.goldPrice, zakat.silverPrice]);

  useEffect(() => {
    window.localStorage.setItem('sfm_zakat_nisab_method', nisabMethod);
  }, [nisabMethod]);

  const goldPricesByKarat = useMemo(() => ({
    '24': toNum(zakat.goldPrice),
    '22': (metalsPrice?.gold.pricePerGram22k && metalsPrice.gold.pricePerGram22k > 0) ? metalsPrice.gold.pricePerGram22k : toNum(zakat.goldPrice) * (22 / 24),
    '21': (metalsPrice?.gold.pricePerGram21k && metalsPrice.gold.pricePerGram21k > 0) ? metalsPrice.gold.pricePerGram21k : toNum(zakat.goldPrice) * (21 / 24),
    '18': (metalsPrice?.gold.pricePerGram18k && metalsPrice.gold.pricePerGram18k > 0) ? metalsPrice.gold.pricePerGram18k : toNum(zakat.goldPrice) * (18 / 24),
  }), [metalsPrice, zakat.goldPrice]);

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
  const priceSourceLabel = metalsPrice?.source === 'api' ? tr.live : metalsPrice?.source === 'fallback' ? tr.failed : tr.manual;

  function includeImportedAmount(kind: 'savings' | 'investments') {
    const amount = kind === 'savings' ? importedFinance.savingsTotal : importedFinance.investmentTotal;
    if (amount <= 0) return;
    setZakat(prev => ({ ...prev, [kind === 'savings' ? 'cash' : 'investments']: String(amount) }));
    setIncludedImports(prev => ({ ...prev, [kind]: true }));
  }

  const summaryCards = [
    { icon: Coins, label: tr.estimatedZakat, value: money(zakatDue) },
    { icon: Calculator, label: tr.netZakatBase, value: money(netZakatBase) },
    { icon: ShieldCheck, label: tr.selectedNisab, value: selectedNisabValue > 0 ? money(selectedNisabValue) : '-' },
    { icon: CalendarDays, label: tr.nextHawlDate, value: nextHawl ? dateLabel(nextHawl) : tr.noDueDate },
    { icon: FileText, label: tr.lastSaved, value: lastSaved ? money(toNum(lastSaved.zakat_due), lastSaved.currency) : tr.noSavedCalculation },
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
            <a className="gold-btn" href="#zakat-calculator"><Calculator size={17} /> {tr.calculator}</a>
            <a className="dark-btn" href="#hawl-tracking"><CalendarDays size={17} /> {tr.hawlTracking}</a>
            <button className="dark-btn" type="button" onClick={saveZakatCalculation} disabled={!user || saving}>
              <Save size={17} /> {tr.saveCalculation}
            </button>
            <LanguageSwitcher variant="dark" compact />
          </div>
        </section>

        {message && <div className="notice">{message}</div>}

        <section className="summary-grid">
          {summaryCards.map(card => {
            const Icon = card.icon;
            return (
              <article className="warm-card summary-card" key={card.label}>
                <span><Icon size={18} /></span>
                <small>{card.label}</small>
                <strong>{card.value}</strong>
              </article>
            );
          })}
        </section>

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
                <strong>{toNum(zakat.goldPrice) > 0 ? money(toNum(zakat.goldPrice)) : '-'}</strong>
                <span>{metalsPrice?.success ? tr.live : tr.failed}</span>
              </div>
              <div className="price-card">
                <small>{tr.silverPriceToday}</small>
                <strong>{toNum(zakat.silverPrice) > 0 ? money(toNum(zakat.silverPrice)) : '-'}</strong>
                <span>{metalsPrice?.success ? tr.live : tr.failed}</span>
              </div>
            </div>
            <div className="price-meta">
              <span>{tr.source}: {priceSourceLabel}</span>
              <span>{tr.lastUpdated}: {metalsPrice?.updatedAt ? dateLabel(metalsPrice.updatedAt) : '-'}</span>
            </div>
            <button className="primary-wide" type="button" onClick={loadMetalsPrices} disabled={loadingMetals} aria-label={tr.refreshPrices}>
              <RefreshCw size={16} /> {loadingMetals ? tr.refreshPrices : tr.refreshPrices}
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

        <section id="hawl-tracking" className="split-grid">
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
      </DashboardPageShell>

      <style jsx>{`
        .zakat-page{min-height:100vh;background:#F5F1E8;color:#2B1A0F;font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}.zakat-content{display:grid;gap:18px}.zakat-hero{position:relative;overflow:hidden;border-radius:24px;padding:28px;background:radial-gradient(circle at 14% 10%,rgba(250,199,117,.28),transparent 30%),linear-gradient(135deg,#1A0F05,#2B1A0F 48%,#7B4A12 135%);color:#FFFDF8;display:flex;align-items:center;justify-content:space-between;gap:20px;box-shadow:0 22px 55px rgba(61,41,20,.18)}.zakat-hero span{color:#FAC775;font-size:12px;font-weight:900}.zakat-hero h1{margin:10px 0 8px;font-size:42px;line-height:1.05;font-weight:950}.zakat-hero p{margin:0;color:rgba(255,253,248,.76);max-width:720px;line-height:1.75}.hero-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}.gold-btn,.dark-btn,.primary-wide,.secondary-link{min-height:44px;border-radius:14px;border:1px solid rgba(250,199,117,.28);display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;font-weight:900;text-decoration:none;cursor:pointer;font-family:inherit}.gold-btn,.primary-wide{background:linear-gradient(135deg,#FAC775,#EF9F27);color:#251407;box-shadow:0 10px 24px rgba(239,159,39,.2)}.dark-btn{background:rgba(20,12,6,.5);color:#FFFDF8}.dark-btn:disabled,.primary-wide:disabled{opacity:.55;cursor:not-allowed}.secondary-link{background:#FFFDF8;color:#3D2914;border-color:rgba(186,117,23,.18)}.notice{border:1px solid rgba(186,117,23,.18);background:#FFF8EA;color:#854F0B;border-radius:16px;padding:12px 14px;font-weight:900}.summary-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}.warm-card{background:#FFFDF8;border:1px solid rgba(186,117,23,.16);border-radius:20px;box-shadow:0 14px 34px rgba(61,41,20,.07);padding:18px;min-width:0}.summary-card{display:grid;gap:8px}.summary-card span{width:36px;height:36px;border-radius:13px;background:#FAEEDA;color:#9A5E0D;display:grid;place-items:center}.summary-card small{color:#7A6A55;font-weight:900}.summary-card strong{font-size:20px;color:#2B1A0F;overflow-wrap:anywhere}.zakat-main-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr) minmax(280px,.78fr);gap:16px;align-items:start}.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.section-head h2{margin:0;font-size:19px;color:#3D2914}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.form-grid.one{grid-template-columns:1fr}.form-grid label,.asset-box label{display:grid;gap:7px;color:#3D2914;font-size:13px;font-weight:900;min-width:0}.form-grid span,.asset-box span{min-width:0}.form-grid input,.form-grid select,.asset-box input{width:100%;min-height:44px;border:1px solid rgba(186,117,23,.18);border-radius:13px;background:#FFFDF8;color:#1A0F05;padding:0 12px;outline:none;font-family:inherit}.form-grid input:focus,.form-grid select:focus,.asset-box input:focus{border-color:#EF9F27;box-shadow:0 0 0 3px rgba(239,159,39,.16)}.wide{grid-column:1 / -1}.asset-box,.manual-box,.import-box{margin-top:12px;border:1px solid rgba(186,117,23,.13);background:#FFF8EA;border-radius:16px;padding:14px;display:grid;gap:10px;min-width:0}.asset-box strong,.import-box strong{color:#3D2914}.asset-box p,.manual-box p,.import-box p,.muted,.disclaimer{margin:0;color:#7A6A55;line-height:1.7;font-size:13px}.import-box div{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;border:1px solid rgba(186,117,23,.12);background:#FFFDF8;border-radius:14px;padding:10px}.import-box span{color:#3D2914;font-weight:900;line-height:1.6}.import-box button{min-height:36px;border-radius:12px;border:1px solid rgba(186,117,23,.2);background:#3D2914;color:#FFFDF8;padding:0 12px;font-weight:900;font-family:inherit;cursor:pointer}.import-box button:disabled{background:#EAF3DE;color:#27500A;cursor:default}.chip-grid{display:flex;flex-wrap:wrap;gap:8px}.chip{border:1px solid rgba(186,117,23,.2);background:#F7F0E4;color:#3D2914;border-radius:999px;min-height:36px;padding:0 12px;font-weight:900;cursor:pointer}.chip.active{background:#3D2914;color:#FFFDF8;border-color:#3D2914}.price-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.price-card{background:#3D2914;border:1px solid rgba(250,199,117,.18);border-radius:16px;padding:14px;color:#FFFDF8;min-width:0}.price-card small,.price-card span{display:block;color:#FAC775;font-weight:900}.price-card strong{display:block;margin:6px 0;color:#FFFDF8;font-size:20px;overflow-wrap:anywhere}.price-meta{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;color:#854F0B;font-size:12px;font-weight:900}.price-meta span{border-radius:999px;background:#FAEEDA;padding:6px 10px}.result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.result-grid div{border:1px solid rgba(186,117,23,.12);background:#FFF8EA;border-radius:14px;padding:11px;min-width:0}.result-grid small{display:block;color:#7A6A55;font-weight:900}.result-grid strong{display:block;color:#2B1A0F;font-size:16px;margin-top:4px;overflow-wrap:anywhere}.result-grid .nisab-reached{background:#EAF3DE}.result-grid .nisab-reached strong{color:#27500A}.result-grid .nisab-missing{background:#FFF4DE}.outcome{margin:12px 0 0;border-radius:15px;background:#EAF3DE;color:#27500A;padding:12px;font-weight:900;line-height:1.7}.guidance-list{display:grid;gap:9px}.guidance-list p{margin:0;display:flex;gap:8px;align-items:flex-start;border:1px solid rgba(186,117,23,.12);background:#FFF8EA;border-radius:14px;padding:11px;color:#3D2914;line-height:1.65}.guidance-list svg{color:#BA7517;flex:0 0 auto;margin-top:2px}.guidance-panel .primary-wide{width:100%;margin:14px 0}.split-grid{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:16px}.check-row{display:flex!important;align-items:center;gap:9px}.check-row input{width:auto;min-height:auto}.asset-list,.history-list{display:grid;gap:10px}.asset-list article,.history-list article{border:1px solid rgba(186,117,23,.13);background:#FFF8EA;border-radius:15px;padding:12px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}.asset-list span,.asset-list small,.history-list span,.history-list small{color:#7A6A55;overflow-wrap:anywhere}.asset-list strong,.history-list strong{color:#2B1A0F;overflow-wrap:anywhere}.asset-list b{color:#854F0B}.history-list article{grid-template-columns:1fr 1fr 1fr 1fr .7fr auto}.history-list button{width:36px;height:36px;border:1px solid rgba(121,31,31,.14);border-radius:11px;background:#FCEBEB;color:#791F1F;display:grid;place-items:center;cursor:pointer}@media(max-width:1180px){.summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.zakat-main-grid{grid-template-columns:1fr 1fr}.guidance-panel{grid-column:1 / -1}}@media(max-width:760px){.zakat-hero{display:grid;padding:22px}.zakat-hero h1{font-size:34px}.hero-actions{display:grid;grid-template-columns:1fr;width:100%}.summary-grid,.zakat-main-grid,.split-grid,.form-grid,.price-grid,.result-grid,.import-box div{grid-template-columns:1fr}.history-list article,.asset-list article{grid-template-columns:1fr}.warm-card{padding:16px}.gold-btn,.dark-btn,.primary-wide,.secondary-link,.import-box button{width:100%}}
      `}</style>
    </div>
  );
}
