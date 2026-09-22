'use client';

import { useRouter } from 'next/navigation';
import { Order } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';
import { formatCents } from '@/lib/format';

/**
 * Direct-pay orders get a PAID invoice automatically at checkout (see backend
 * CheckoutService), so staff never create one here — this just links to it.
 * Credit-account orders are invoiced by hand: "Create invoice" pre-fills the
 * lines from the order's items on the new-invoice form for staff to review.
 */
export function OrderInvoiceCard({ order }: { order: Order }) {
  const router = useRouter();
  const isCredit = order.channel === 'CREDIT';
  const invoices = order.invoices ?? [];

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Invoice</p>
        {invoices.length === 0 && isCredit && (
          <Badge variant="outline">Awaiting invoice</Badge>
        )}
      </div>

      {invoices.length > 0 ? (
        <div className="divide-y rounded-md border">
          {invoices.map((inv) => (
            <button
              key={inv.id}
              type="button"
              onClick={() => router.push(`/invoices/${inv.id}`)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="font-medium">{inv.invoiceNo}</span>
              <InvoiceStatusBadge status={inv.status} className="text-xs" />
              <span className="text-muted-foreground">
                {formatCents(inv.outstandingCents)} due
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isCredit
            ? 'Not invoiced yet. Create an invoice with the order’s items pre-filled for review before sending.'
            : 'Paid at checkout — an invoice is created automatically.'}
        </p>
      )}

      {isCredit && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push(`/invoices/new?orderId=${order.id}`)}
        >
          {invoices.length > 0 ? 'Create another invoice' : 'Create invoice'}
        </Button>
      )}
    </section>
  );
}
