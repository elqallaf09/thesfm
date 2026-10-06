export type MobileProductId = 'finance' | 'investor' | 'business' | 'tv';

export type MobileProduct = {
  id: MobileProductId;
  name: string;
  nameAr: string;
  iOSBundleId: string;
  androidApplicationId: string;
  entryPaths: readonly string[];
  platforms: readonly ('ios' | 'android' | 'huawei' | 'tvos' | 'webos')[];
};

/**
 * The canonical product boundary for native clients, store submissions, and
 * deep links. Products may share the SFM account and backend, but never a
 * store identity or navigation contract.
 */
export const MOBILE_PRODUCTS: readonly MobileProduct[] = [
  {
    id: 'finance',
    name: 'THE SFM Finance',
    nameAr: 'THE SFM للمال الشخصي',
    iOSBundleId: 'com.thesfm.finance',
    androidApplicationId: 'com.thesfm.finance',
    entryPaths: ['/today', '/expenses', '/income', '/debts', '/savings', '/goals', '/zakat', '/reports'],
    platforms: ['ios', 'android', 'huawei'],
  },
  {
    id: 'investor',
    name: 'THE SFM Investor',
    nameAr: 'THE SFM للمستثمر',
    iOSBundleId: 'com.thesfm.investor',
    androidApplicationId: 'com.thesfm.investor',
    entryPaths: ['/ai-analyst/overview', '/market-watchlist', '/market-analysis', '/invest', '/investments', '/alerts'],
    platforms: ['ios', 'android', 'huawei'],
  },
  {
    id: 'business',
    name: 'THE SFM Business',
    nameAr: 'THE SFM للأعمال',
    iOSBundleId: 'com.thesfm.business',
    androidApplicationId: 'com.thesfm.business',
    entryPaths: ['/business-hub', '/projects', '/customers', '/invoices', '/sales', '/employees', '/suppliers'],
    platforms: ['ios', 'android', 'huawei'],
  },
  {
    id: 'tv',
    name: 'THE SFM TV',
    nameAr: 'THE SFM TV',
    iOSBundleId: 'com.thesfm.tv',
    androidApplicationId: 'com.thesfm.tv',
    entryPaths: ['/tv'],
    platforms: ['android', 'huawei', 'tvos', 'webos'],
  },
] as const;

export function mobileProduct(productId: MobileProductId): MobileProduct {
  const product = MOBILE_PRODUCTS.find(candidate => candidate.id === productId);
  if (!product) throw new Error(`Unknown mobile product: ${productId}`);
  return product;
}
