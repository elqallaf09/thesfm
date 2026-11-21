import type { TvLanguage } from '@/lib/markets-tv/types';

export const tvMenuCopy = {
  ar: { sections: 'الأقسام', wallpapers: 'خلفية الشاشة', chooseWallpaper: 'اختيار صورة الخلفية', overview: 'نظرة عامة', markets: 'الأسواق', broadcasts: 'الأخبار والقنوات', library: 'مكتبتي', display: 'إعدادات العرض', accountHeading: 'الحساب', back: 'رجوع', menu: 'القائمة', world: 'أسواق العالم', strips: 'أشرطة الأسعار', news: 'الأخبار', signIn: 'تسجيل الدخول', signOut: 'تسجيل الخروج', guest: 'المشاهدة العامة', account: 'الحساب مرتبط', myAccount: 'حسابي', tools: 'أدوات الشاشة' },
  en: { sections: 'Sections', wallpapers: 'Wallpaper', chooseWallpaper: 'Choose background image', overview: 'Overview', markets: 'Markets', broadcasts: 'News and channels', library: 'My library', display: 'Display settings', accountHeading: 'Account', back: 'Back', menu: 'Menu', world: 'World markets', strips: 'Price strips', news: 'News', signIn: 'Sign in', signOut: 'Sign out', guest: 'Public viewing', account: 'Account linked', myAccount: 'My account', tools: 'Screen tools' },
  fr: { sections: 'Rubriques', wallpapers: 'Fond d’écran', chooseWallpaper: 'Choisir une image de fond', overview: 'Vue d’ensemble', markets: 'Marchés', broadcasts: 'Actualités et chaînes', library: 'Ma bibliothèque', display: 'Réglages d’affichage', accountHeading: 'Compte', back: 'Retour', menu: 'Menu', world: 'Marchés mondiaux', strips: 'Bandes de cours', news: 'Actualités', signIn: 'Se connecter', signOut: 'Se déconnecter', guest: 'Affichage public', account: 'Compte lié', myAccount: 'Mon compte', tools: 'Outils de l’écran' },
} satisfies Record<TvLanguage, Record<string, string>>;

export const tvMenuText = (language: TvLanguage, key: keyof typeof tvMenuCopy.ar) => tvMenuCopy[language][key];
