import { TR } from '@/lib/translations';

type TranslationKey = keyof typeof TR;

export const COMPANY_CATEGORIES = ['investment', 'trading', 'accounting', 'feasibility', 'financial_consulting'] as const;
export const COMPANY_STATUSES = ['pending_review', 'approved', 'rejected', 'inactive'] as const;

export type CompanyCategory = typeof COMPANY_CATEGORIES[number];
export type CompanyStatus = typeof COMPANY_STATUSES[number];

export type CompanyListing = {
  id: string;
  user_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  company_name: string;
  category: CompanyCategory;
  country?: string | null;
  city?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  website_url?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
  founded_year?: number | null;
  license_number?: string | null;
  regulator_name?: string | null;
  services?: string[] | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  status: CompanyStatus;
  is_featured?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  approved_at?: string | null;
};

export type CompanyCategoryConfig = {
  category: CompanyCategory;
  path: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  labelKey: TranslationKey;
};

export const COMPANY_CATEGORY_CONFIGS: Record<CompanyCategory, CompanyCategoryConfig> = {
  investment: {
    category: 'investment',
    path: '/investment-companies',
    titleKey: 'company_page_investment_title',
    descriptionKey: 'company_page_investment_desc',
    labelKey: 'company_category_investment',
  },
  trading: {
    category: 'trading',
    path: '/trading-companies',
    titleKey: 'company_page_trading_title',
    descriptionKey: 'company_page_trading_desc',
    labelKey: 'company_category_trading',
  },
  accounting: {
    category: 'accounting',
    path: '/accounting-companies',
    titleKey: 'company_page_accounting_title',
    descriptionKey: 'company_page_accounting_desc',
    labelKey: 'company_category_accounting',
  },
  feasibility: {
    category: 'feasibility',
    path: '/feasibility-companies',
    titleKey: 'company_page_feasibility_title',
    descriptionKey: 'company_page_feasibility_desc',
    labelKey: 'company_category_feasibility',
  },
  financial_consulting: {
    category: 'financial_consulting',
    path: '/financial-consulting-companies',
    titleKey: 'company_page_financial_consulting_title',
    descriptionKey: 'company_page_financial_consulting_desc',
    labelKey: 'company_category_financial_consulting',
  },
};

export function isCompanyCategory(value: unknown): value is CompanyCategory {
  return COMPANY_CATEGORIES.includes(value as CompanyCategory);
}

export function isCompanyStatus(value: unknown): value is CompanyStatus {
  return COMPANY_STATUSES.includes(value as CompanyStatus);
}

export function normalizeCompanyCategory(value: unknown): CompanyCategory | null {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/-/g, '_');
  return isCompanyCategory(normalized) ? normalized : null;
}

export function normalizeCompanyStatus(value: unknown): CompanyStatus | null {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/-/g, '_');
  return isCompanyStatus(normalized) ? normalized : null;
}

export function companyCategoryFromPath(pathname: string) {
  return Object.values(COMPANY_CATEGORY_CONFIGS).find(item => item.path === pathname)?.category ?? null;
}

export function splitServices(value: unknown) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  return String(value ?? '')
    .split(/\n|,/)
    .map(item => item.trim())
    .filter(Boolean);
}
