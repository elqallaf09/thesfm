import type { Metadata } from 'next';
import { Cairo, IBM_Plex_Sans_Arabic, Tajawal } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import GlobalClientEffects from '@/components/GlobalClientEffects';
import { AuthProvider } from '@/hooks/useAuth';
import { LanguageProvider } from '@/components/LanguageProvider';
import { CurrencyProvider } from '@/lib/useCurrency';
import { AppLayout } from '@/components/AppLayout';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import { LocalizedSkipLink } from '@/components/LocalizedSkipLink';
import { pageMetadata } from '@/lib/seo';
import './globals.css';

const cairo = Cairo({
  variable: '--font-cairo',
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '900'],
  display: 'swap',
});

const tajawal = Tajawal({
  variable: '--font-tajawal',
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800', '900'],
  display: 'swap',
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-ibm-plex-sans-arabic',
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export function generateMetadata(): Metadata {
  return {
    ...pageMetadata({
    title: 'THE SFM — منصة مالية ذكية لإدارة أموالك ومشاريعك',
    path: '/',
    }),
    metadataBase: new URL('https://www.the-sfm.com'),
    icons: {
      icon: [
        { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
        { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: '/icons/apple-touch-icon.png',
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} ${tajawal.variable} ${ibmPlexSansArabic.variable} font-cairo antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          storageKey="the-sfm-theme"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster />
          <AuthProvider>
            <LanguageProvider>
              <LocalizedSkipLink />
              <CurrencyProvider>
                <AnalyticsTracker />
                <AppLayout>{children}</AppLayout>
              </CurrencyProvider>
              <GlobalClientEffects />
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
