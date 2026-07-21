import { Badge } from '@/components/ui/badge';
import { OrderFulfillmentStatus, OrderPaymentStatus } from '@/types/api';

const FULFILLMENT_CONFIG: Record<
  OrderFulfillmentStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PROCESSING:    { label: 'Processing',    variant: 'secondary' },
  READY_TO_SHIP: { label: 'Ready to Ship', variant: 'default' },
  SHIPPED:       { label: 'Shipped',       variant: 'default' },
  DELIVERED:     { label: 'Delivered',     variant: 'default' },
  CANCELLED:     { label: 'Cancelled',     variant: 'destructive' },
};

const PAYMENT_CONFIG: Record<
  OrderPaymentStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  UNPAID:         { label: 'Unpaid',          variant: 'outline' },
  PARTIALLY_PAID: { label: 'Partially Paid',  variant: 'secondary' },
  PAID:           { label: 'Paid',            variant: 'default' },
  REFUNDED:       { label: 'Refunded',        variant: 'destructive' },
};

export function OrderStatusBadge({ status }: { status: OrderFulfillmentStatus }) {
  const { label, variant } = FULFILLMENT_CONFIG[status] ?? { label: status, variant: 'outline' };
  return <Badge variant={variant}>{label}</Badge>;
}

export function OrderPaymentStatusBadge({ status }: { status: OrderPaymentStatus }) {
  const { label, variant } = PAYMENT_CONFIG[status] ?? { label: status, variant: 'outline' };
  return <Badge variant={variant}>{label}</Badge>;
}
