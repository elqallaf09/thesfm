import type { Metadata } from 'next';
import { OwnerCompaniesPage } from '@/components/company-listings/OwnerCompaniesPage';

export const metadata: Metadata = {
  title: 'شركاتي | THE SFM',
  description: 'إدارة طلبات إدراج الشركات الخاصة بك في THE SFM.',
};

export default function MyCompaniesRoute() {
  return <OwnerCompaniesPage />;
}
