import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { DensityProvider } from '@/hooks/useDensity';
import { Toaster } from '@/components/ui/sonner';
import GlobalClientEffects from '@/components/GlobalClientEffects';
import { AuthProvider } from '@/hooks/useAuth';
import { AdaptiveLanguageProvider } from '@/components/AdaptiveLanguageProvider';
import { CurrencyProvider } from '@/lib/useCurrency';
import { AppLayout } from '@/components/AppLayout';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import { ObservabilityLoader } from '@/components/ObservabilityLoader';
import { LocalizedSkipLink } from '@/components/LocalizedSkipLink';
import { pageMetadata } from '@/lib/seo';
import './globals.css';

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-ibm-plex-sans-arabic',
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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
    <html
      lang="ar"
      dir="rtl"
      className={`${ibmPlexSansArabic.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          storageKey="the-sfm-theme"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster />
          <DensityProvider>
            <AuthProvider>
              <AdaptiveLanguageProvider>
                <LocalizedSkipLink />
                <CurrencyProvider>
                  <AnalyticsTracker />
                  <ObservabilityLoader />
                  <AppLayout>{children}</AppLayout>
                </CurrencyProvider>
                <GlobalClientEffects />
              </AdaptiveLanguageProvider>
            </AuthProvider>
          </DensityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
