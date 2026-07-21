'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Order } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/format';

export function OrderQuickbooksSection({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const isCredit = order.channel === 'CREDIT';

  const push = useMutation({
    mutationFn: () => api.post(`/admin/quickbooks/orders/${order.id}/push`),
    onSuccess: () => {
      toast.success(
        isCredit ? 'Pushed to QuickBooks as a draft invoice' : 'Pushed to QuickBooks and marked paid',
      );
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: () => toast.error('Push failed — is QuickBooks connected?'),
  });

  const invoices = order.invoices ?? [];
  const hasInvoice = invoices.length > 0;

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">QuickBooks</p>
        {order.quickbooksSyncPending ? (
          <Badge variant="secondary">Sync pending</Badge>
        ) : hasInvoice ? (
          <Badge variant="default">{isCredit ? 'Synced' : 'Paid'}</Badge>
        ) : (
          <Badge variant="outline">Not pushed</Badge>
        )}
      </div>

      {hasInvoice ? (
        <div className="divide-y rounded-md border">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="font-medium">{inv.invoiceNo}</span>
              {inv.syncStatus && (
                <Badge variant="outline" className="text-xs">{inv.syncStatus}</Badge>
              )}
              <span className="text-muted-foreground">
                {formatCents(inv.outstandingCents)} due
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isCredit
            ? 'No QuickBooks invoice yet. It pushes automatically on checkout; use the button to push or re-push manually.'
            : 'Paid at checkout — an invoice pushes automatically and is recorded as paid in QuickBooks. Use the button to retry if it hasn’t landed yet.'}
        </p>
      )}

      {/* Credit-account invoices stay open for staff to review, adjust, and
          send — always re-pushable. A direct-pay invoice is settled the
          moment it lands (paid via the eWay charge already collected), so
          once it exists there's nothing for staff to edit or re-send. */}
      {(isCredit || !hasInvoice) && (
        <Button
          variant="outline"
          className="w-full"
          disabled={push.isPending}
          onClick={() => push.mutate()}
        >
          {push.isPending ? 'Pushing…' : hasInvoice ? 'Re-push to QuickBooks' : 'Push to QuickBooks'}
        </Button>
      )}
    </section>
  );
}
