'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Order, OrderStatus, PaginatedResponse } from '@/types/api';
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
import { OrderStatusBadge } from './order-status-badge';
import { formatCents, formatDate } from '@/lib/format';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'READY_TO_SHIP', label: 'Ready to Ship' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

const LIMIT = 25;

export function OrdersView() {
  const router = useRouter();
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
  }

  const { data: result, isLoading } = useQuery<PaginatedResponse<Order>>({
    queryKey: ['orders', status, search, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
      if (status !== 'all') params.status = status;
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
        <Select value={status} onValueChange={(v) => handleFilterChange(() => setStatus(v ?? 'all'))}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
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
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: LIMIT }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
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
                    <TableCell className="font-medium">#{order.orderNo}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.customer?.displayName ?? order.customerEmail ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.orderDate ? formatDate(order.orderDate) : '—'}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status as OrderStatus} />
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
