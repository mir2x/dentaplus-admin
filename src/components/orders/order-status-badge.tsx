import { Badge } from '@/components/ui/badge';
import { OrderStatus } from '@/types/api';

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DRAFT:           { label: 'Draft',            variant: 'outline' },
  PENDING_PAYMENT: { label: 'Pending Payment',  variant: 'secondary' },
  PAID:            { label: 'Paid',             variant: 'default' },
  PROCESSING:      { label: 'Processing',       variant: 'default' },
  READY_TO_SHIP:   { label: 'Ready to Ship',    variant: 'default' },
  SHIPPED:         { label: 'Shipped',          variant: 'default' },
  DELIVERED:       { label: 'Delivered',        variant: 'default' },
  COMPLETED:       { label: 'Completed',        variant: 'default' },
  CANCELLED:       { label: 'Cancelled',        variant: 'destructive' },
  REFUNDED:        { label: 'Refunded',         variant: 'destructive' },
  FAILED:          { label: 'Failed',           variant: 'destructive' },
  ON_HOLD:         { label: 'On Hold',          variant: 'secondary' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, variant } = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' };
  return <Badge variant={variant}>{label}</Badge>;
}
