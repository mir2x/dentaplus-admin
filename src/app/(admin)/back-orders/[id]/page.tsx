import { BackOrderDetailView } from '@/components/back-orders/back-order-detail-view';

export default async function BackOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BackOrderDetailView backOrderId={id} />;
}
