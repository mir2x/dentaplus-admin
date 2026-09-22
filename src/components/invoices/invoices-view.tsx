'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AdminInvoice, InvoiceStatus, PaginatedResponse } from '@/types/api';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatMoney } from '@/lib/format';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';

const STATUSES: InvoiceStatus[] = ['DRAFT', 'OPEN', 'OVERDUE', 'PARTIAL', 'PAID', 'VOID'];

export function InvoicesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(() => searchParams.get('status') ?? 'all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<AdminInvoice>>({
    queryKey: ['admin-invoices', search, status, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 25 };
      if (search) params.search = search;
      if (status !== 'all') params.status = status;
      return (await api.get('/admin/invoices', { params })).data;
    },
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search invoice no / customer…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full sm:max-w-xs"
          />
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v ?? 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => router.push('/invoices/new')}>
          Create invoice
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length ? (
              data.data.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                >
                  <TableCell className="font-medium">
                    {inv.invoiceNo}
                    {inv.type === 'CREDIT_NOTE' && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Credit
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {inv.customer?.displayName ?? inv.customer?.email ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(inv.dateInvoiced)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(inv.total)}</TableCell>
                  <TableCell className="text-right">{formatMoney(inv.outstanding)}</TableCell>
                  <TableCell className="text-center">
                    <InvoiceStatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {inv.hasPdf ? 'Yes' : '—'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No invoices
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.pages}
          </span>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.meta.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
