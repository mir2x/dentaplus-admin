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

const REVIEW_STATUS_VARIANT = {
  DRAFT: 'outline',
  PENDING: 'secondary',
  PROCESSING: 'default',
  DECLINED: 'destructive',
} as const;

export function BackOrdersView() {
  const [reviewStatus, setReviewStatus] = useState('all');
  const router = useRouter();

  const { data, isLoading } = useQuery<PaginatedResponse<BackOrder>>({
    queryKey: ['back-orders', reviewStatus],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (reviewStatus !== 'all') params.reviewStatus = reviewStatus;
      return (await api.get('/admin/backorders', { params })).data;
    },
  });

  return (
    <div className="space-y-4">
      <Select value={reviewStatus} onValueChange={(v) => setReviewStatus(v ?? 'all')}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="DRAFT">Needs triage</SelectItem>
          <SelectItem value="PENDING">Awaiting customer</SelectItem>
          <SelectItem value="PROCESSING">Processing</SelectItem>
          <SelectItem value="DECLINED">Declined</SelectItem>
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
              <TableHead className="text-center">Review</TableHead>
              <TableHead className="text-center">Fulfillment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
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
                  <TableCell className="font-medium">
                    {bo.backOrderNo}
                    {bo.hasUnreviewedItems && (
                      <Badge variant="destructive" className="ml-2">
                        New items
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">#{bo.orderNo}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {bo.customer?.displayName ?? bo.customer?.email ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(bo.createdAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={REVIEW_STATUS_VARIANT[bo.reviewStatus]}>
                      {bo.reviewStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground text-sm">
                    {bo.status ?? '—'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
