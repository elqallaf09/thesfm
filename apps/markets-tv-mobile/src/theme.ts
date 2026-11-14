export const palettes = {
  dark: { background: '#071A16', panel: '#102C25', text: '#F2F8F5', muted: '#B0C8BD', accent: '#8DE1BC', line: '#31594A' },
  light: { background: '#F4F7F2', panel: '#FFFFFF', text: '#102B23', muted: '#4F685E', accent: '#176A4B', line: '#B6C8BC' },
} as const;

export const messages = {
  ar: { back: 'رجوع', home: 'الصالة', refresh: 'تحديث', loading: 'جارٍ فتح الأسواق', error: 'تعذّر فتح الصفحة', detail: 'تحقق من اتصال الإنترنت ثم أعد المحاولة.', retry: 'إعادة المحاولة', browser: 'فتح في المتصفح', linkError: 'تعذّر فتح الرابط' },
  en: { back: 'Back', home: 'Hall', refresh: 'Refresh', loading: 'Opening markets', error: 'Unable to open this page', detail: 'Check your internet connection and try again.', retry: 'Try again', browser: 'Open in browser', linkError: 'Unable to open link' },
  fr: { back: 'Retour', home: 'Salle', refresh: 'Actualiser', loading: 'Ouverture des marchés', error: 'Impossible d’ouvrir cette page', detail: 'Vérifiez votre connexion Internet et réessayez.', retry: 'Réessayer', browser: 'Ouvrir dans le navigateur', linkError: 'Impossible d’ouvrir le lien' },
} as const;
