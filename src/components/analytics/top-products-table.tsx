'use client';

import { useState } from 'react';
import { TopProduct, TopVariant } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';

interface Props {
  data: { products: TopProduct[]; variants: TopVariant[] } | undefined;
  isLoading: boolean;
}

export function TopProductsTable({ data, isLoading }: Props) {
  const [tab, setTab] = useState<'products' | 'variants'>('products');
  const rows = tab === 'products' ? data?.products : data?.variants;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Top Selling Items</CardTitle>
          <div className="flex gap-1">
            <Button
              variant={tab === 'products' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setTab('products')}
            >
              Products
            </Button>
            <Button
              variant={tab === 'variants' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setTab('variants')}
            >
              Variations
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 pl-4">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Qty Sold</TableHead>
              <TableHead className="text-right pr-4">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || !rows ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                  No data for this period
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-4 text-muted-foreground text-sm">{i + 1}</TableCell>
                  <TableCell className="font-medium text-sm max-w-48 truncate">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{row.sku ?? '—'}</TableCell>
                  <TableCell className="text-right text-sm">{row.quantitySold}</TableCell>
                  <TableCell className="text-right font-medium text-sm pr-4">
                    {formatMoney(row.revenue)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
