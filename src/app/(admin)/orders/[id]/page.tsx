'use client';

import { useState } from 'react';
import { use } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Order, OrderFulfillmentStatus, OrderPaymentStatus } from '@/types/api';
import { formatCents, formatDate, formatDateTime } from '@/lib/format';
import { OrderPaymentStatusBadge, OrderStatusBadge } from '@/components/orders/order-status-badge';
import { OrderQuickbooksSection } from '@/components/orders/order-quickbooks-section';
import { RefundPanel } from '@/components/orders/refund-panel';
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

// Fulfillment status: physical shipment of the order's in-stock items.
// Independent of payment — see SYSTEM_MODEL.md "The two status axes".
const NEXT_FULFILLMENT_STATUSES: Partial<
  Record<OrderFulfillmentStatus, OrderFulfillmentStatus[]>
> = {
  PROCESSING:    ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED'],
  SHIPPED:       ['DELIVERED'],
};

const FULFILLMENT_LABELS: Record<OrderFulfillmentStatus, string> = {
  PROCESSING: 'Processing', READY_TO_SHIP: 'Ready to Ship', SHIPPED: 'Shipped',
  DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
};

// Payment status: UNPAID/PARTIALLY_PAID/PAID normally happen automatically
// (direct at checkout, credit from the QBO invoice balance) — this lets
// staff set them manually too, plus REFUNDED, which is always manual.
const NEXT_PAYMENT_STATUSES: Partial<Record<OrderPaymentStatus, OrderPaymentStatus[]>> = {
  UNPAID:         ['PARTIALLY_PAID', 'PAID'],
  PARTIALLY_PAID: ['PAID', 'REFUNDED'],
  PAID:           ['REFUNDED'],
};

const PAYMENT_LABELS: Record<OrderPaymentStatus, string> = {
  UNPAID: 'Unpaid', PARTIALLY_PAID: 'Partially Paid', PAID: 'Paid', REFUNDED: 'Refunded',
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

  const [newFulfillmentStatus, setNewFulfillmentStatus] = useState('');
  const [fulfillmentNote, setFulfillmentNote] = useState('');
  const [savingFulfillment, setSavingFulfillment] = useState(false);

  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/orders/${id}`);
      return data;
    },
  });

  async function handleUpdateFulfillmentStatus() {
    if (!order || !newFulfillmentStatus) return;
    setSavingFulfillment(true);
    try {
      await api.patch(`/admin/orders/${order.id}/fulfillment-status`, {
        status: newFulfillmentStatus,
        note: fulfillmentNote || undefined,
      });
      toast.success(
        `Fulfillment status updated to ${FULFILLMENT_LABELS[newFulfillmentStatus as OrderFulfillmentStatus]}`,
      );
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setNewFulfillmentStatus('');
      setFulfillmentNote('');
    } catch {
      toast.error('Failed to update fulfillment status.');
    } finally {
      setSavingFulfillment(false);
    }
  }

  async function handleUpdatePaymentStatus() {
    if (!order || !newPaymentStatus) return;
    setSavingPayment(true);
    try {
      await api.patch(`/admin/orders/${order.id}/payment-status`, {
        status: newPaymentStatus,
        note: paymentNote || undefined,
      });
      toast.success(
        `Payment status updated to ${PAYMENT_LABELS[newPaymentStatus as OrderPaymentStatus]}`,
      );
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setNewPaymentStatus('');
      setPaymentNote('');
    } catch {
      toast.error('Failed to update payment status — REFUNDED requires the order to have taken payment or already be cancelled.');
    } finally {
      setSavingPayment(false);
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
  const nextFulfillmentOptions = NEXT_FULFILLMENT_STATUSES[order.fulfillmentStatus] ?? [];
  // Mirrors the backend guard: REFUNDED only makes sense once money has
  // actually moved, or the order is already cancelled.
  const canRefund = order.paymentStatus !== 'UNPAID' || order.fulfillmentStatus === 'CANCELLED';
  const nextPaymentOptions = (NEXT_PAYMENT_STATUSES[order.paymentStatus] ?? []).filter(
    (s) => s !== 'REFUNDED' || canRefund,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push('/orders')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="size-3.5" />
            All orders
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Order #{order.orderNo}</h2>
            <span className="rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {order.channel === 'CREDIT' ? 'Credit Account' : 'Direct Pay'}
            </span>
            <OrderStatusBadge status={order.fulfillmentStatus} />
            <OrderPaymentStatusBadge status={order.paymentStatus} />
            {order.backOrders?.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => router.push(`/back-orders/${b.id}`)}
                className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
              >
                Backorder {b.backOrderNo}
              </button>
            ))}
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
            <section className="rounded-lg border p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                {order.notes.map((n) => {
                  // A status-change entry stores its default message on the
                  // first line and an optional staff note on the rest — the
                  // note is appended, never a replacement for the message.
                  const [message, ...noteLines] = n.content.split('\n');
                  const staffNote = noteLines.join('\n');
                  return (
                    <div key={n.id} className="px-4 py-3 flex gap-3">
                      <div className="mt-1 size-1.5 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 space-y-0.5">
                        <p className="text-sm">{message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(n.notedAt)}
                          {n.addedBy && (
                            <span className="ml-1">· {n.addedBy}</span>
                          )}
                        </p>
                        {staffNote && (
                          <p className="text-sm text-muted-foreground italic pt-1">
                            {staffNote}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
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

          {/* Refunds — standalone, zero automation; see SYSTEM_MODEL.md */}
          <RefundPanel order={order} />

          {/* Update fulfillment status */}
          {nextFulfillmentOptions.length > 0 && (
            <section className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Update Fulfillment Status</p>
              <Select
                value={newFulfillmentStatus}
                onValueChange={(v) => setNewFulfillmentStatus(v ?? '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status…" />
                </SelectTrigger>
                <SelectContent className="p-1.5">
                  {nextFulfillmentOptions.map((s) => (
                    <SelectItem key={s} value={s} className="px-3 py-2">
                      {FULFILLMENT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1.5">
                <Label htmlFor="fulfillment-note">Note (optional)</Label>
                <Textarea
                  id="fulfillment-note"
                  rows={2}
                  placeholder="Add a note…"
                  value={fulfillmentNote}
                  onChange={(e) => setFulfillmentNote(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={!newFulfillmentStatus || savingFulfillment}
                onClick={handleUpdateFulfillmentStatus}
              >
                {savingFulfillment ? 'Saving…' : 'Update Fulfillment Status'}
              </Button>
            </section>
          )}

          {/* Update payment status */}
          {nextPaymentOptions.length > 0 && (
            <section className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Update Payment Status</p>
              <Select value={newPaymentStatus} onValueChange={(v) => setNewPaymentStatus(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status…" />
                </SelectTrigger>
                <SelectContent className="p-1.5">
                  {nextPaymentOptions.map((s) => (
                    <SelectItem key={s} value={s} className="px-3 py-2">
                      {PAYMENT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1.5">
                <Label htmlFor="payment-note">Note (optional)</Label>
                <Textarea
                  id="payment-note"
                  rows={2}
                  placeholder="Add a note…"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={!newPaymentStatus || savingPayment}
                onClick={handleUpdatePaymentStatus}
              >
                {savingPayment ? 'Saving…' : 'Update Payment Status'}
              </Button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
