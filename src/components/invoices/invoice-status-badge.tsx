import { InvoiceStatus } from '@/types/api';
import { Badge } from '@/components/ui/badge';

// OVERDUE is never stored — the backend derives it from OPEN + a past due
// date at read time (see backend InvoiceService.serialize), so it always
// arrives as part of `status`, same as any other value here.
const STATUS_VARIANT: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  OPEN: 'outline',
  OVERDUE: 'destructive',
  PARTIAL: 'outline',
  PAID: 'default',
  VOID: 'secondary',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  OPEN: 'Sent',
  OVERDUE: 'Overdue',
  PARTIAL: 'Partially paid',
  PAID: 'Paid',
  VOID: 'Void',
};

export function InvoiceStatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
