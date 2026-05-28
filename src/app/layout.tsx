import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import GlobalClientEffects from '@/components/GlobalClientEffects';
import { AuthProvider } from '@/hooks/useAuth';
import { LanguageProvider } from '@/components/LanguageProvider';
import { CurrencyProvider } from '@/lib/useCurrency';
import { AppLayout } from '@/components/AppLayout';
import { pageMetadata } from '@/lib/seo';
import './globals.css';

const cairo = Cairo({
  variable: '--font-cairo',
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '900'],
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${cairo.variable} font-cairo antialiased`}>
        <a className="sfm-skip-link" href="#main-content">تخطّي إلى المحتوى</a>
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
              <CurrencyProvider>
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
