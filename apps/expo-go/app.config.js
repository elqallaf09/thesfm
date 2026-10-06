const productId = process.env.SFM_PRODUCT || 'finance';

const products = {
  finance: {
    name: 'THE SFM Finance',
    slug: 'the-sfm-finance',
    bundleIdentifier: 'com.thesfm.finance',
    primaryColor: '#19C5B7',
  },
  investor: {
    name: 'THE SFM Investor',
    slug: 'the-sfm-investor',
    bundleIdentifier: 'com.thesfm.investor',
    primaryColor: '#38BDF8',
  },
  business: {
    name: 'THE SFM Business',
    slug: 'the-sfm-business',
    bundleIdentifier: 'com.thesfm.business',
    primaryColor: '#A78BFA',
  },
};

const product = products[productId];
if (!product) throw new Error(`Unknown SFM_PRODUCT: ${productId}`);

module.exports = {
  expo: {
    name: product.name,
    slug: product.slug,
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    scheme: product.slug,
    ios: { bundleIdentifier: product.bundleIdentifier, supportsTablet: true },
    android: { package: product.bundleIdentifier, adaptiveIcon: { backgroundColor: '#08131C' } },
    extra: {
      sfmProduct: productId,
      apiBaseUrl: process.env.EXPO_PUBLIC_SFM_API_BASE_URL || 'https://www.the-sfm.com',
      supabaseUrl: process.env.EXPO_PUBLIC_SFM_SUPABASE_URL || '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SFM_SUPABASE_ANON_KEY || '',
    },
  },
};
