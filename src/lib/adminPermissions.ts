export const ADMIN_PERMISSION_KEYS = [
  'admin_dashboard',
  'company_reviews',
  'instagram_automation',
  'business_management',
  'users_management',
  'payments',
  'reports',
  'settings',
] as const;

export type AdminPermission = typeof ADMIN_PERMISSION_KEYS[number];
export type AdminPermissions = Record<AdminPermission, boolean>;

export const EMPTY_ADMIN_PERMISSIONS: AdminPermissions = {
  admin_dashboard: false,
  company_reviews: false,
  instagram_automation: false,
  business_management: false,
  users_management: false,
  payments: false,
  reports: false,
  settings: false,
};

export const SUPER_ADMIN_PERMISSIONS: AdminPermissions = {
  admin_dashboard: true,
  company_reviews: true,
  instagram_automation: true,
  business_management: true,
  users_management: true,
  payments: true,
  reports: true,
  settings: true,
};

export const ADMIN_PERMISSION_LABELS_AR: Record<AdminPermission, string> = {
  admin_dashboard: 'لوحة الإدارة',
  company_reviews: 'مراجعة الشركات',
  instagram_automation: 'أتمتة إنستغرام',
  business_management: 'إدارة الأعمال',
  users_management: 'إدارة المستخدمين',
  payments: 'المدفوعات والاشتراكات',
  reports: 'التقارير',
  settings: 'الإعدادات',
};

export function normalizeAdminPermissions(value: unknown): AdminPermissions {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return ADMIN_PERMISSION_KEYS.reduce<AdminPermissions>((permissions, key) => {
    permissions[key] = source[key] === true;
    return permissions;
  }, { ...EMPTY_ADMIN_PERMISSIONS });
}

export function countEnabledAdminPermissions(permissions: Partial<Record<AdminPermission, boolean>> | null | undefined) {
  if (!permissions) return 0;
  return ADMIN_PERMISSION_KEYS.filter(key => permissions[key] === true).length;
}
