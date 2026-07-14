'use client';

import { useState } from 'react';
import { use } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Order, OrderStatus } from '@/types/api';
import { formatCents, formatDate, formatDateTime } from '@/lib/format';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { OrderQuickbooksSection } from '@/components/orders/order-quickbooks-section';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED', 'FAILED'],
  PAID:            ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING:      ['READY_TO_SHIP', 'ON_HOLD', 'CANCELLED'],
  READY_TO_SHIP:   ['SHIPPED', 'ON_HOLD'],
  SHIPPED:         ['DELIVERED'],
  DELIVERED:       ['COMPLETED', 'REFUNDED'],
  ON_HOLD:         ['PROCESSING', 'CANCELLED'],
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Draft', PENDING_PAYMENT: 'Pending Payment', PAID: 'Paid',
  PROCESSING: 'Processing', READY_TO_SHIP: 'Ready to Ship', SHIPPED: 'Shipped',
  DELIVERED: 'Delivered', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded', FAILED: 'Failed', ON_HOLD: 'On Hold',
};

function AddressBlock({ address }: {
  address: {
    firstName: string | null; lastName: string | null; company: string | null;
    address1: string | null; address2: string | null; city: string | null;
    state: string | null; postcode: string | null; country: string | null; phone: string | null;
  };
}) {
  return (
    <address className="not-italic text-sm text-muted-foreground space-y-0.5">
      <p className="font-medium text-foreground">
        {[address.firstName, address.lastName].filter(Boolean).join(' ') || '—'}
      </p>
      {address.company && <p>{address.company}</p>}
      {address.address1 && <p>{address.address1}</p>}
      {address.address2 && <p>{address.address2}</p>}
      <p>
        {[address.city, address.state, address.postcode].filter(Boolean).join(', ')}
        {address.country ? ` ${address.country}` : ''}
      </p>
      {address.phone && <p>{address.phone}</p>}
    </address>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/orders/${id}`);
      return data;
    },
  });

  async function handleUpdateStatus() {
    if (!order || !newStatus) return;
    setSaving(true);
    try {
      await api.patch(`/admin/orders/${order.id}/status`, {
        status: newStatus,
        note: note || undefined,
      });
      toast.success(`Status updated to ${STATUS_LABELS[newStatus as OrderStatus]}`);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setNewStatus('');
      setNote('');
    } catch {
      toast.error('Failed to update order status.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const billing = order.addresses.find((a) => a.type === 'BILLING');
  const shipping = order.addresses.find((a) => a.type === 'SHIPPING');
  const nextOptions = NEXT_STATUSES[order.status] ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push('/orders')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="size-3.5" />
            All orders
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Order #{order.orderNo}</h2>
            <OrderStatusBadge status={order.status} />
          </div>
          {order.orderDate && (
            <p className="text-sm text-muted-foreground">
              Placed {formatDate(order.orderDate)}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — main content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Customer */}
          <section className="rounded-lg border p-4 space-y-1">
            <p className="text-sm font-medium mb-2">Customer</p>
            <p className="text-sm font-medium">
              {order.customer?.displayName ?? order.customerEmail ?? '—'}
            </p>
            {order.customerEmail && (
              <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
            )}
            {order.customerNote && (
              <p className="text-sm text-muted-foreground italic mt-2">
                &ldquo;{order.customerNote}&rdquo;
              </p>
            )}
          </section>

          {/* Items */}
          <section className="rounded-lg border overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/40">
              <p className="text-sm font-medium">Items ({order.items.length})</p>
            </div>
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="size-8 rounded bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                    {item.quantity}×
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.sku && (
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">
                      {formatCents(item.totalCents, order.currency)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">
                        {formatCents(item.subtotalCents / item.quantity, order.currency)} each
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Payment & Shipping */}
          {(order.payment || order.shipping) && (
            <section className="rounded-lg border p-4 grid grid-cols-2 gap-4">
              {order.payment && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Payment</p>
                  <p className="text-sm text-muted-foreground">
                    {order.payment.methodTitle ?? order.payment.method ?? '—'}
                  </p>
                  {order.payment.transactionId && (
                    <p className="text-xs text-muted-foreground font-mono">
                      #{order.payment.transactionId}
                    </p>
                  )}
                </div>
              )}
              {order.shipping && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Shipping</p>
                  <p className="text-sm text-muted-foreground">
                    {order.shipping.methodTitle ?? '—'}
                  </p>
                  {order.shipping.totalCents > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {formatCents(order.shipping.totalCents, order.currency)}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Notes timeline */}
          {order.notes.length > 0 && (
            <section className="rounded-lg border overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/40">
                <p className="text-sm font-medium">Order History</p>
              </div>
              <div className="divide-y">
                {order.notes.map((n) => (
                  <div key={n.id} className="px-4 py-3 flex gap-3">
                    <div className="mt-1 size-1.5 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm">{n.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(n.notedAt)}
                        {n.addedBy && (
                          <span className="ml-1">· {n.addedBy}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right — sidebar */}
        <div className="space-y-5">

          {/* Totals */}
          <section className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-medium mb-1">Summary</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCents(order.subtotalCents, order.currency)}</span>
              </div>
              {order.shippingCents > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>{formatCents(order.shippingCents, order.currency)}</span>
                </div>
              )}
              {order.taxCents > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>{formatCents(order.taxCents, order.currency)}</span>
                </div>
              )}
              {order.discountCents > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span>−{formatCents(order.discountCents, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total</span>
                <span>{formatCents(order.totalCents, order.currency)}</span>
              </div>
            </div>
          </section>

          {/* QuickBooks */}
          <OrderQuickbooksSection order={order} />

          {/* Addresses */}
          {(billing || shipping) && (
            <section className="rounded-lg border p-4 space-y-4">
              {billing && (
                <div>
                  <p className="text-sm font-medium mb-1.5">Billing Address</p>
                  <AddressBlock address={billing} />
                </div>
              )}
              {shipping && billing && <hr />}
              {shipping && (
                <div>
                  <p className="text-sm font-medium mb-1.5">Shipping Address</p>
                  <AddressBlock address={shipping} />
                </div>
              )}
            </section>
          )}

          {/* Update status */}
          {nextOptions.length > 0 && (
            <section className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Update Status</p>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status…" />
                </SelectTrigger>
                <SelectContent className="p-1.5">
                  {nextOptions.map((s) => (
                    <SelectItem key={s} value={s} className="px-3 py-2">
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1.5">
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea
                  id="note"
                  rows={2}
                  placeholder="Add a note…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={!newStatus || saving}
                onClick={handleUpdateStatus}
              >
                {saving ? 'Saving…' : 'Update Status'}
              </Button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
