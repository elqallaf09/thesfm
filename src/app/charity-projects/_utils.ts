// Utility constants and functions for charity-projects/page
import { normalizeDigits } from '@/lib/locale';
import type { Lang, ProjectCategory, ProjectStatus, AssetType, DocumentCategory, ReminderType, ReminderPriority, BeneficiaryCategory, BeneficiaryStatus, ContributorRole, PaymentStatus, OrganizationType, VerificationStatus } from './_types';

export const categories: ProjectCategory[] = ['ongoing', 'sponsorship', 'zakat', 'sacrifice', 'endowment', 'mosque', 'water_well', 'education', 'relief', 'other'];
export const statuses: ProjectStatus[] = ['planning', 'fundraising', 'in_progress', 'completed', 'paused'];
export const assetTypes: AssetType[] = ['cash', 'savings', 'investment', 'gold', 'silver', 'non_zakat'];
export const documentCategories: DocumentCategory[] = ['donation_receipt', 'charity_certificate', 'project_report', 'zakat_document', 'beneficiary_report', 'other'];
export const reminderTypes: ReminderType[] = ['zakat', 'hawl', 'ramadan', 'dhul_hijjah', 'arafah', 'sacrifice', 'sponsorship', 'project_milestone', 'general'];
export const reminderPriorities: ReminderPriority[] = ['low', 'normal', 'high'];
export const beneficiaryCategories: BeneficiaryCategory[] = ['orphan', 'family', 'student', 'medical', 'elderly', 'refugee', 'project_group', 'other'];
export const beneficiaryStatuses: BeneficiaryStatus[] = ['active', 'paused', 'completed', 'needs_review'];
export const contributorRoles: ContributorRole[] = ['owner', 'contributor', 'viewer'];
export const paymentStatuses: PaymentStatus[] = ['pending', 'paid', 'partial', 'late', 'cancelled'];
export const organizationTypes: OrganizationType[] = ['charity', 'zakat_house', 'humanitarian', 'waqf', 'mosque', 'education', 'relief', 'other'];
export const verificationStatuses: VerificationStatus[] = ['verified', 'pending_review', 'unverified'];
export const goldKarats = ['24', '22', '21', '18'] as const;
export const nonZakatOptions = ['personalHome', 'personalCar', 'householdFurniture', 'personalTools', 'residentialLand', 'personalUseAssets', 'other'] as const;
export const allowedDocumentTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
export const maxDocumentSize = 10 * 1024 * 1024;

export const templates = [
  { category: 'sponsorship' as ProjectCategory, amount: 300, months: 12, ar: 'كفالة يتيم لمدة سنة', en: 'Orphan sponsorship for one year', fr: "Parrainage d'orphelin pendant un an", subAr: '25 د.ك × 12 شهر', subEn: 'KWD 25 x 12 months', subFr: '25 KWD x 12 mois' },
  { category: 'water_well' as ProjectCategory, amount: 1200, months: 6, ar: 'حفر بئر ماء', en: 'Water well', fr: "Puits d'eau", subAr: '800 - 2000 د.ك', subEn: 'KWD 800 - 2000', subFr: '800 - 2000 KWD' },
  { category: 'endowment' as ProjectCategory, amount: 250, months: 0, ar: 'وقف مصاحف', en: 'Quran endowment', fr: 'Waqf de Corans', subAr: 'مساهمة مستمرة', subEn: 'Ongoing contribution', subFr: 'Contribution continue' },
  { category: 'education' as ProjectCategory, amount: 3000, months: 6, ar: 'بناء فصل دراسي', en: 'Build a classroom', fr: 'Construire une salle de classe', subAr: '3000 د.ك على 6 شهور', subEn: 'KWD 3000 over 6 months', subFr: '3000 KWD sur 6 mois' },
  { category: 'sacrifice' as ProjectCategory, amount: 90, months: 12, ar: 'أضحية', en: 'Sacrifice', fr: 'Sacrifice', subAr: 'سنوي عند عيد الأضحى', subEn: 'Annual at Eid al-Adha', subFr: "Annuel à l'Aïd al-Adha" },
];

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addYear(date: string) {
  const d = date ? new Date(`${date}T00:00:00`) : new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const d = date ? new Date(`${date}T00:00:00`) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(date: string) {
  const start = new Date(`${today()}T00:00:00`).getTime();
  const end = new Date(`${date}T00:00:00`).getTime();
  return Math.round((end - start) / 86400000);
}

export function toNum(value: string | number | null | undefined) {
  return Number(normalizeDigits(value).replace(/[^\d.-]/g, '')) || 0;
}

export function recordDate(row: any) {
  return row?.donation_date || row?.received_date || row?.generated_for_date || row?.date || row?.created_at || null;
}

export function isYear(value: string | null | undefined, year: number) {
  if (!value) return false;
  return new Date(`${value.slice(0, 10)}T00:00:00`).getFullYear() === year;
}

export function isCurrentMonth(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function formatFileSize(size?: number | null) {
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
}

export function estimatedHijriDate(date?: string | null, lang: Lang = 'ar') {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura-nu-latn' : lang === 'fr' ? 'fr-FR-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return '';
  }
}

