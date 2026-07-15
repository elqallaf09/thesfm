import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Reports Center | THE SFM',
  description: 'Generate, preview, print, and export source-backed reports in THE SFM.',
};

export default function ReportsCenterLayout({ children }: { children: ReactNode }) {
  return children;
}
