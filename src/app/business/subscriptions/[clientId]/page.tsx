import SubscriptionManagerPage from '@/components/business-subscriptions/SubscriptionManagerPage';

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function BusinessSubscriptionClientPage({ params }: PageProps) {
  const { clientId } = await params;
  return <SubscriptionManagerPage clientId={clientId} />;
}
