import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Cairo } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import GlobalClientEffects from '@/components/GlobalClientEffects';
import { AuthProvider } from '@/hooks/useAuth';
import { LanguageProvider } from '@/components/LanguageProvider';
import { CurrencyProvider } from '@/lib/useCurrency';
import './globals.css';

const cairo = Cairo({
  variable: '--font-cairo',
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'المدير المالي الذكي | SFM',
  description: 'إدارة راتبك بذكاء - قسّم راتبك إلى مصروفات ومدخرات واستثمار',
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'المدير المالي الذكي | SFM',
    description: 'إدارة راتبك بذكاء - قسّم راتبك إلى مصروفات ومدخرات واستثمار',
    images: [{ url: '/icons/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'المدير المالي الذكي | SFM',
    description: 'إدارة راتبك بذكاء - قسّم راتبك إلى مصروفات ومدخرات واستثمار',
    images: ['/icons/og-image.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Respect the language cookie on the server so the first paint has the right dir
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get('sfm_lang')?.value;
  const lang = cookieLang === 'en' || cookieLang === 'fr' ? cookieLang : 'ar';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${cairo.variable} font-cairo antialiased`}>
        <Toaster />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <LanguageProvider>
              <CurrencyProvider>
                {children}
              </CurrencyProvider>
              <GlobalClientEffects />
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
