export type IncomeCategoryId = 'active' | 'passive' | 'investment' | 'business' | 'additional' | 'seasonal' | 'government';

export interface IncomeCategory {
  id: IncomeCategoryId;
  nameAr: string;
  nameEn: string;
  icon?: string;
  examples: string[];
}

export const INCOME_CATEGORIES: IncomeCategory[] = [
  {
    id: 'active',
    nameAr: 'الدخل النشط',
    nameEn: 'Active Income',
    examples: ['المدخول الشهري', 'الأجر اليومي أو بالساعة', 'العمولات', 'العمل الحر'],
  },
  {
    id: 'passive',
    nameAr: 'الدخل السلبي',
    nameEn: 'Passive Income',
    examples: ['إيجار العقارات', 'أرباح الأسهم', 'عوائد المشاريع', 'بيع المنتجات الرقمية', 'قنوات يوتيوب أو تطبيقات'],
  },
  {
    id: 'investment',
    nameAr: 'دخل الاستثمار',
    nameEn: 'Investment Income',
    examples: ['الأسهم', 'الصناديق الاستثمارية', 'السندات', 'العملات الرقمية'],
  },
  {
    id: 'business',
    nameAr: 'دخل الأعمال',
    nameEn: 'Business Income',
    examples: ['متجر', 'مطعم', 'شركة خدمات', 'تجارة إلكترونية'],
  },
  {
    id: 'additional',
    nameAr: 'الدخل الإضافي',
    nameEn: 'Side Income',
    examples: ['التوصيل', 'التصميم', 'التدريس', 'التسويق بالعمولة'],
  },
  {
    id: 'seasonal',
    nameAr: 'الدخل الموسمي أو المؤقت',
    nameEn: 'Seasonal or Temporary Income',
    examples: ['مواسم البيع', 'المكافآت السنوية', 'مشاريع مؤقتة'],
  },
  {
    id: 'government',
    nameAr: 'الدخل الحكومي أو الدعم',
    nameEn: 'Government or Support Income',
    examples: ['التقاعد', 'الإعانات', 'الدعم الحكومي'],
  },
];
