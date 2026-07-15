import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Tasks Center | THE SFM',
  description: 'Review, filter, complete, and manage all of your THE SFM tasks.',
};

export default function TasksLayout({ children }: { children: ReactNode }) {
  return children;
}
