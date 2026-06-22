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
  const isCredit = order.payment?.method === 'CREDIT_ACCOUNT';

  const push = useMutation({
    mutationFn: () => api.post(`/admin/quickbooks/orders/${order.id}/push`),
    onSuccess: () => {
      toast.success('Pushed to QuickBooks as a draft invoice');
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
        {isCredit ? (
          order.quickbooksSyncPending ? (
            <Badge variant="secondary">Sync pending</Badge>
          ) : hasInvoice ? (
            <Badge variant="default">Synced</Badge>
          ) : (
            <Badge variant="outline">Not pushed</Badge>
          )
        ) : (
          <Badge variant="outline">Direct pay</Badge>
        )}
      </div>

      {!isCredit ? (
        <p className="text-sm text-muted-foreground">
          Direct-pay order — paid at checkout, not invoiced through QuickBooks.
        </p>
      ) : (
        <>
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
              No QuickBooks invoice yet. It pushes automatically on checkout; use the button to
              push or re-push manually.
            </p>
          )}

          <Button
            variant="outline"
            className="w-full"
            disabled={push.isPending}
            onClick={() => push.mutate()}
          >
            {push.isPending ? 'Pushing…' : hasInvoice ? 'Re-push to QuickBooks' : 'Push to QuickBooks'}
          </Button>
        </>
      )}
    </section>
  );
}
