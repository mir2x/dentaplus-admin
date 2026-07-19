'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Order, OrderStatus } from '@/types/api';
import { formatCents, formatDate } from '@/lib/format';
import { OrderStatusBadge } from './order-status-badge';
import { OrderQuickbooksSection } from './order-quickbooks-section';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

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

interface Props {
  order: Order | null;
  onClose: () => void;
}

export function OrderDetailSheet({ order, onClose }: Props) {
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const nextOptions = order ? (NEXT_STATUSES[order.status] ?? []) : [];
  const billing = order?.addresses.find((a) => a.type === 'BILLING');
  const shipping = order?.addresses.find((a) => a.type === 'SHIPPING');

  async function handleUpdateStatus() {
    if (!order || !newStatus) return;
    setSaving(true);
    try {
      await api.patch(`/admin/orders/${order.id}/status`, {
        status: newStatus,
        note: note || undefined,
      });
      toast.success(`Order updated to ${STATUS_LABELS[newStatus as OrderStatus]}`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setNewStatus('');
      setNote('');
      onClose();
    } catch {
      toast.error('Failed to update order status.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={!!order} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {order && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle>Order #{order.orderNo}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <OrderStatusBadge status={order.status} />
                <span className="text-sm text-muted-foreground">
                  {order.orderDate ? formatDate(order.orderDate) : ''}
                </span>
              </div>
            </SheetHeader>

            {/* Customer */}
            <section className="space-y-1 text-sm mb-4">
              <p className="font-medium">Customer</p>
              <p className="text-muted-foreground">
                {order.customer?.displayName ?? order.customerEmail ?? '—'}
              </p>
              {order.customerEmail && (
                <p className="text-muted-foreground">{order.customerEmail}</p>
              )}
            </section>

            <Separator className="mb-4" />

            {/* Items */}
            <section className="mb-4">
              <p className="text-sm font-medium mb-2">Items</p>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex-1 pr-4">
                      {item.quantity}× {item.name}
                      {item.sku && (
                        <span className="block text-xs text-muted-foreground/70">
                          SKU: {item.sku}
                        </span>
                      )}
                    </span>
                    <span className="font-medium">
                      {formatCents(item.totalCents, order.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="mb-4" />

            {/* Totals */}
            <section className="space-y-1 text-sm mb-4">
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
              <div className="flex justify-between font-semibold pt-1 border-t mt-1">
                <span>Total</span>
                <span>{formatCents(order.totalCents, order.currency)}</span>
              </div>
            </section>

            <Separator className="mb-4" />

            {/* Addresses */}
            <section className="grid grid-cols-1 gap-4 text-sm mb-4 sm:grid-cols-2">
              {billing && (
                <div>
                  <p className="font-medium mb-1">Billing</p>
                  <address className="not-italic text-muted-foreground space-y-0.5">
                    <p>{[billing.firstName, billing.lastName].filter(Boolean).join(' ')}</p>
                    {billing.company && <p>{billing.company}</p>}
                    <p>{billing.address1}</p>
                    {billing.address2 && <p>{billing.address2}</p>}
                    <p>{[billing.city, billing.state, billing.postcode].filter(Boolean).join(' ')}</p>
                  </address>
                </div>
              )}
              {shipping && (
                <div>
                  <p className="font-medium mb-1">Shipping</p>
                  <address className="not-italic text-muted-foreground space-y-0.5">
                    <p>{[shipping.firstName, shipping.lastName].filter(Boolean).join(' ')}</p>
                    {shipping.company && <p>{shipping.company}</p>}
                    <p>{shipping.address1}</p>
                    {shipping.address2 && <p>{shipping.address2}</p>}
                    <p>{[shipping.city, shipping.state, shipping.postcode].filter(Boolean).join(' ')}</p>
                  </address>
                </div>
              )}
            </section>

            {/* QuickBooks */}
            <div className="mb-4">
              <OrderQuickbooksSection order={order} />
            </div>

            {/* Update status */}
            {nextOptions.length > 0 && (
              <>
                <Separator className="mb-4" />
                <section className="space-y-3">
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
                    <Label htmlFor="note">Internal note (optional)</Label>
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
              </>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
