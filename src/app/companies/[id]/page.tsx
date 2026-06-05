import { CompanyDetailsPage } from '@/components/company-listings/CompanyDetailsPage';

type CompanyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { id } = await params;
  return <CompanyDetailsPage id={id} />;
}
