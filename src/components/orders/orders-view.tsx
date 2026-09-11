'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Order, OrderFulfillmentStatus, OrderPaymentStatus, PaginatedResponse } from '@/types/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { OrderPaymentStatusBadge, OrderStatusBadge } from './order-status-badge';
import { Badge } from '@/components/ui/badge';
import { formatCents, formatDate } from '@/lib/format';

const FULFILLMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All fulfillment' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'READY_TO_SHIP', label: 'Ready to Ship' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PAYMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All payment' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const LIMIT = 25;

export function OrdersView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [fulfillmentStatus, setFulfillmentStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
  }

  // Visiting this page resets the sidebar's "new orders" badge to zero.
  const markSeen = useMutation({
    mutationFn: () => api.post('/admin/orders/mark-seen'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders-new-count'] }),
  });
  useEffect(() => {
    markSeen.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: result, isLoading } = useQuery<PaginatedResponse<Order>>({
    queryKey: ['orders', fulfillmentStatus, paymentStatus, search, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
      if (fulfillmentStatus !== 'all') params.fulfillmentStatus = fulfillmentStatus;
      if (paymentStatus !== 'all') params.paymentStatus = paymentStatus;
      if (search) params.q = search;
      return (await api.get('/admin/orders', { params })).data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search order no or customer…"
          value={search}
          onChange={(e) => handleFilterChange(() => setSearch(e.target.value))}
          className="w-full sm:max-w-xs"
        />
        <Select
          value={fulfillmentStatus}
          onValueChange={(v) => handleFilterChange(() => setFulfillmentStatus(v ?? 'all'))}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FULFILLMENT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={paymentStatus}
          onValueChange={(v) => handleFilterChange(() => setPaymentStatus(v ?? 'all'))}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Fulfillment</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: LIMIT }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : result?.data.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        #{order.orderNo}
                        {!!order.backOrders?.length && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            Backorder {order.backOrders.map((b) => b.backOrderNo).join(', ')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.customer?.displayName ?? order.customerEmail ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.orderDate ? formatDate(order.orderDate) : '—'}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.fulfillmentStatus as OrderFulfillmentStatus} />
                    </TableCell>
                    <TableCell>
                      <OrderPaymentStatusBadge status={order.paymentStatus as OrderPaymentStatus} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCents(order.totalCents, order.currency)}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {result && (
          <div className="border-t px-3">
            <PaginationControls
              page={result.meta.page}
              pages={result.meta.pages}
              total={result.meta.total}
              limit={result.meta.limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
