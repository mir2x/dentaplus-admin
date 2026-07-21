'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { BackOrder, PaginatedResponse } from '@/types/api';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';

const STATUS_CONFIG = {
  DRAFT:                { label: 'Draft',                variant: 'outline' as const },
  PROCESSING:           { label: 'Processing',           variant: 'default' as const },
  PARTIALLY_FULFILLED:  { label: 'Partially Fulfilled',  variant: 'secondary' as const },
  FULFILLED:            { label: 'Fulfilled',            variant: 'default' as const },
  CANCELLED:            { label: 'Cancelled',            variant: 'destructive' as const },
};

export function BackOrdersView() {
  const [status, setStatus] = useState('all');
  const router = useRouter();

  const { data, isLoading } = useQuery<PaginatedResponse<BackOrder>>({
    queryKey: ['back-orders', status],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status !== 'all') params.status = status;
      return (await api.get('/admin/backorders', { params })).data;
    },
  });

  return (
    <div className="space-y-4">
      <Select value={status} onValueChange={(v) => setStatus(v ?? 'all')}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="DRAFT">Draft — needs review</SelectItem>
          <SelectItem value="PROCESSING">Processing</SelectItem>
          <SelectItem value="PARTIALLY_FULFILLED">Partially Fulfilled</SelectItem>
          <SelectItem value="FULFILLED">Fulfilled</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Back Order</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length ? (
              data.data.map((bo) => (
                <TableRow
                  key={bo.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/back-orders/${bo.id}`)}
                >
                  <TableCell className="font-medium">{bo.backOrderNo}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">#{bo.orderNo}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {bo.customer?.displayName ?? bo.customer?.email ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(bo.createdAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={STATUS_CONFIG[bo.status].variant}>
                      {STATUS_CONFIG[bo.status].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No back orders
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
