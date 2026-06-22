'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
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

interface InventoryRow {
  id: string;
  quantity: number | null;
  inStock: boolean;
  product: {
    id: string;
    name: string;
    sku: string | null;
    published: boolean;
    quickbooksItemId: string | null;
  } | null;
}

export function InventoryView() {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery<InventoryRow[]>({
    queryKey: ['inventory', filter, q],
    queryFn: async () => {
      const params: Record<string, string> = {};
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
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v ?? 'all')}>
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
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.length ? (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.product?.name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.product?.sku ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">{row.quantity ?? '—'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={row.inStock ? 'default' : 'destructive'}>
                      {row.inStock ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={row.product?.published ? 'default' : 'secondary'}>
                      {row.product?.published ? 'Live' : 'Draft'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No matching products
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
