import type { PhoneProduct } from '../../../src/lib/mobile/resourceContract';

// Mirrors src/styles/themes.css and the website login. Keep this palette scoped
// to authentication so workspace data displays retain their existing semantics.
export const authPalettes = {
  light: { bg: '#F5F6FD', surface: '#FFFFFF', text: '#14183A', muted: '#5B6178', border: '#E9EBF7', inputBorder: '#6E759C', primary: '#4F46E5', onPrimary: '#FFFFFF', soft: '#ECEDFB', danger: '#B42338' },
  dark: { bg: '#0F1218', surface: '#12151C', text: '#EAF1FB', muted: '#98A2C9', border: '#292E38', inputBorder: '#6E79A8', primary: '#818CF8', onPrimary: '#0A1230', soft: '#222A5E', danger: '#FB7185' },
} as const;

export const authCopy = {
  ar: {
    title: 'مرحباً بعودتك', body: 'سجّل دخولك للوصول إلى حسابك ومتابعة خطتك المالية.',
    headline: 'المدير المالي الذكي', description: 'تحكّم في دخلك ومصروفاتك وأهدافك واستثماراتك برؤية واضحة وقرارات أذكى.',
    email: 'البريد الإلكتروني', password: 'كلمة المرور', passwordHint: 'أدخل كلمة المرور', show: 'إظهار كلمة المرور', hide: 'إخفاء كلمة المرور',
    remember: 'تذكرني', forgot: 'نسيت كلمة المرور؟', submit: 'تسجيل الدخول', busy: 'جارٍ تسجيل الدخول…',
    divider: 'أو تابع عبر', google: 'تسجيل الدخول عبر Google', guest: 'متابعة كضيف',
    createLead: 'ليس لديك حساب؟', create: 'إنشاء حساب جديد', website: 'استكشف THE SFM',
    oneAccount: 'حساب واحد. ثلاث مساحات.', language: 'اختيار اللغة', light: 'الوضع الفاتح', dark: 'الوضع الداكن',
    privacy: 'الخصوصية', terms: 'الشروط', external: 'يفتح على موقع THE SFM',
    invalid: 'البريد أو كلمة المرور غير صحيحة.', unavailable: 'تعذر إكمال الطلب. تحقق من الاتصال وأعد المحاولة.',
    benefits: ['أمان متقدم', 'أهداف ذكية', 'رؤى وتقارير', 'دعم مخصص'],
  },
  en: {
    title: 'Welcome back', body: 'Sign in to access your account and keep your financial plan on track.',
    headline: 'Smart Financial Manager', description: 'Bring income, expenses, goals, and investments together for clearer insight and smarter decisions.',
    email: 'Email', password: 'Password', passwordHint: 'Enter your password', show: 'Show password', hide: 'Hide password',
    remember: 'Remember me', forgot: 'Forgot password?', submit: 'Sign in', busy: 'Signing in…',
    divider: 'Or continue with', google: 'Sign in with Google', guest: 'Continue as guest',
    createLead: "Don't have an account?", create: 'Create an account', website: 'Explore THE SFM',
    oneAccount: 'One account. Three workspaces.', language: 'Choose language', light: 'Light mode', dark: 'Dark mode',
    privacy: 'Privacy', terms: 'Terms', external: 'Opens on the THE SFM website',
    invalid: 'Incorrect email or password.', unavailable: 'Unable to complete the request. Check your connection and retry.',
    benefits: ['Advanced security', 'Smart goals', 'Insights and reports', 'Dedicated support'],
  },
  fr: {
    title: 'Heureux de vous revoir', body: 'Connectez-vous pour accéder à votre compte et suivre votre plan financier.',
    headline: 'Gestionnaire financier intelligent', description: 'Réunissez revenus, dépenses, objectifs et investissements pour des décisions plus claires et plus intelligentes.',
    email: 'E-mail', password: 'Mot de passe', passwordHint: 'Saisissez votre mot de passe', show: 'Afficher le mot de passe', hide: 'Masquer le mot de passe',
    remember: 'Se souvenir de moi', forgot: 'Mot de passe oublié ?', submit: 'Connexion', busy: 'Connexion en cours…',
    divider: 'Ou continuer avec', google: 'Se connecter avec Google', guest: 'Continuer en invité',
    createLead: 'Vous n’avez pas de compte ?', create: 'Créer un compte', website: 'Découvrir THE SFM',
    oneAccount: 'Un compte. Trois espaces.', language: 'Choisir la langue', light: 'Mode clair', dark: 'Mode sombre',
    privacy: 'Confidentialité', terms: 'Conditions', external: 'S’ouvre sur le site THE SFM',
    invalid: 'E-mail ou mot de passe incorrect.', unavailable: 'Impossible de terminer. Vérifiez votre connexion et réessayez.',
    benefits: ['Sécurité avancée', 'Objectifs intelligents', 'Analyses et rapports', 'Assistance dédiée'],
  },
} as const;

export function authWebsiteUrl(base: string, product: PhoneProduct, action: 'register' | 'forgot' | 'explore' | 'privacy' | 'terms', language: string) {
  const url = new URL(action === 'explore' ? '/' : action === 'register' || action === 'forgot' ? '/login' : `/${action}`, base);
  url.searchParams.set('lang', language);
  if (action === 'register' || action === 'forgot') {
    url.searchParams.set('mode', action);
    url.searchParams.set('next', product === 'investor' ? '/investments' : product === 'business' ? '/business' : '/dashboard');
  }
  return url.toString();
}
