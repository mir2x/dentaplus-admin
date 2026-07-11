import { CreditApplicationDetailView } from '@/components/credit/credit-application-detail-view';

export default async function CreditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CreditApplicationDetailView applicationId={id} />;
}
