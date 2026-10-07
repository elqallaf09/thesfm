const productId = process.env.SFM_PRODUCT || 'finance';

const products = {
  finance: {
    name: 'THE SFM Finance',
    slug: 'the-sfm-finance',
    bundleIdentifier: 'com.thesfm.finance',
    easProjectId: 'd2a48038-2244-4209-a28c-90ed922f5a5e',
    primaryColor: '#19C5B7',
  },
  investor: {
    name: 'THE SFM Investor',
    slug: 'the-sfm-investor',
    bundleIdentifier: 'com.thesfm.investor',
    easProjectId: '307682b9-a2ef-4950-881c-5bdcaed6ff02',
    primaryColor: '#38BDF8',
  },
  business: {
    name: 'THE SFM Business',
    slug: 'the-sfm-business',
    bundleIdentifier: 'com.thesfm.business',
    easProjectId: 'e7be71e4-70ad-45c4-83cd-5ee195a027c7',
    primaryColor: '#A78BFA',
  },
};

const product = products[productId];
if (!product) throw new Error(`Unknown SFM_PRODUCT: ${productId}`);

module.exports = {
  expo: {
    cli: { appVersionSource: 'remote' },
    name: product.name,
    slug: product.slug,
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    scheme: product.slug,
    ios: {
      bundleIdentifier: product.bundleIdentifier,
      supportsTablet: true,
      infoPlist: { ITSAppUsesNonExemptEncryption: false },
    },
    android: { package: product.bundleIdentifier, adaptiveIcon: { backgroundColor: '#08131C' } },
    extra: {
      sfmProduct: productId,
      eas: { projectId: product.easProjectId },
      apiBaseUrl: process.env.EXPO_PUBLIC_SFM_API_BASE_URL || 'https://www.the-sfm.com',
      supabaseUrl: process.env.EXPO_PUBLIC_SFM_SUPABASE_URL || '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SFM_SUPABASE_ANON_KEY || '',
    },
  },
};
