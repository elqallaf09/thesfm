import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import GlobalClientEffects from "@/components/GlobalClientEffects";
import { AuthProvider } from "@/hooks/useAuth";

import "./globals.css";
import "../styles/safari-fix.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "مدير الراتب الذكي | AI Salary Manager",
  description: "إدارة راتبك بذكاء - قسّم راتبك إلى مصروفات ومدخرات واستثمار",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <>
      {children}
      <GlobalClientEffects />
    </>
  );

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </head>
      <body className={`${cairo.variable} font-cairo antialiased`}>
        <Toaster />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{content}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
