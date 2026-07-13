'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PaginatedResponse } from '@/types/api';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface InventoryOwnerProduct {
  id: string;
  name: string;
  sku: string | null;
  published: boolean;
  quickbooksItemId: string | null;
}

interface InventoryRow {
  id: string;
  quantity: number | null;
  inStock: boolean;
  kind: 'product' | 'variant';
  product: InventoryOwnerProduct | null;
  variant: {
    id: string;
    sku: string | null;
    name: string | null;
    product: InventoryOwnerProduct;
  } | null;
}

const LIMIT = 25;

export function InventoryView() {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
  }

  const { data: result, isLoading } = useQuery<PaginatedResponse<InventoryRow>>({
    queryKey: ['inventory', filter, q, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
      if (filter !== 'all') params.filter = filter;
      if (q) params.q = q;
      return (await api.get('/admin/inventory', { params })).data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name or SKU…"
          value={q}
          onChange={(e) => handleFilterChange(() => setQ(e.target.value))}
          className="max-w-xs"
        />
        <Select value={filter} onValueChange={(v) => handleFilterChange(() => setFilter(v ?? 'all'))}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock</SelectItem>
            <SelectItem value="low">Low stock</SelectItem>
            <SelectItem value="out">Out of stock</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground ml-auto">Stock is owned by QuickBooks (read-only)</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-center">In stock</TableHead>
              <TableHead className="text-center">Published</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: LIMIT }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : result?.data.length ? (
              result.data.map((row) => {
                const owner = row.product ?? row.variant?.product ?? null;
                const label =
                  row.kind === 'variant' && row.variant
                    ? `${owner?.name ?? '—'} — ${row.variant.name ?? row.variant.sku ?? 'Variant'}`
                    : (owner?.name ?? '—');
                const sku = row.kind === 'variant' ? row.variant?.sku : owner?.sku;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{label}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {sku ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">{row.quantity ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.inStock ? 'default' : 'destructive'}>
                        {row.inStock ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={owner?.published ? 'default' : 'secondary'}>
                        {owner?.published ? 'Live' : 'Draft'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No matching products
                </TableCell>
              </TableRow>
            )}
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
