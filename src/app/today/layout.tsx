import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { EconomicCommandCenter } from '@/components/economic-intelligence/EconomicCommandCenter';

export const metadata: Metadata = {
  title: 'Today Center | THE SFM',
  description: 'Your concise, prioritized daily operational brief in THE SFM.',
};

export default function TodayLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <EconomicCommandCenter />
      {children}
    </>
  );
}
