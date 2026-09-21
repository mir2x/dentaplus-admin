'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api';
import { formatCents, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SalesHistoryResponse {
  summary: { units: number; revenueCents: number; orders: number; customers: number };
  variations: {
    variantId: string | null;
    name: string;
    sku: string | null;
    units: number;
    revenueCents: number;
  }[];
  monthly: { month: string; units: number; revenueCents: number }[];
  history: {
    orderItemId: string;
    orderId: string;
    orderNo: string;
    orderDate: string;
    currency: string;
    fulfillmentStatus: string;
    paymentStatus: string;
    customerId: string | null;
    customerName: string | null;
    customerEmail: string | null;
    variantId: string | null;
    variantName: string | null;
    variantSku: string | null;
    quantity: number;
    revenueCents: number;
  }[];
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1).toLocaleDateString('en-AU', {
    month: 'short',
    year: '2-digit',
  });
}

function statusLabel(value: string) {
  return value.toLowerCase().replaceAll('_', ' ');
}

export function ProductSalesHistory({ productId }: { productId: string }) {
  const { data, isLoading, isError } = useQuery<SalesHistoryResponse>({
    queryKey: ['product-sales-history', productId],
    queryFn: async () => (await api.get(`/admin/products/${productId}/sales-history`)).data,
  });

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-medium">Sales history</h3>
        <p className="text-xs text-muted-foreground">
          Completed and active orders for this product. Cancelled orders are excluded.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="py-8 text-center text-sm text-destructive">Could not load sales history.</p>
      ) : data.history.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No sales recorded yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              ['Units sold', data.summary.units.toLocaleString('en-AU')],
              ['Line revenue', formatCents(data.summary.revenueCents)],
              ['Orders', data.summary.orders.toLocaleString('en-AU')],
              ['Customers', data.summary.customers.toLocaleString('en-AU')],
            ].map(([label, value]) => (
              <Card key={label} size="sm">
                <CardHeader>
                  <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{value}</CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-md border p-3">
            <p className="mb-3 text-sm font-medium">Monthly units sold</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.monthly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(month) => formatMonth(String(month))}
                  formatter={(value) => [Number(value).toLocaleString('en-AU'), 'Units']}
                />
                <Bar dataKey="units" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Variation breakdown</p>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variation</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.variations.map((variation) => (
                    <TableRow key={variation.variantId ?? 'product'}>
                      <TableCell className="font-medium">{variation.name}</TableCell>
                      <TableCell>{variation.sku ?? '—'}</TableCell>
                      <TableCell className="text-right">{variation.units}</TableCell>
                      <TableCell className="text-right">
                        {formatCents(variation.revenueCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Order history</p>
            <div className="max-h-[30rem] overflow-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Variation</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.history.map((row) => (
                    <TableRow key={row.orderItemId}>
                      <TableCell>{formatDate(row.orderDate)}</TableCell>
                      <TableCell>
                        <Link className="font-medium text-primary hover:underline" href={`/orders/${row.orderId}`}>
                          {row.orderNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-48 whitespace-normal">
                          <p className="font-medium">{row.customerName || 'Guest'}</p>
                          <p className="text-xs text-muted-foreground">{row.customerEmail ?? '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>{row.variantName || row.variantSku || 'Standard'}</TableCell>
                      <TableCell className="text-right">{row.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCents(row.revenueCents, row.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant="outline" className="capitalize">
                            {statusLabel(row.fulfillmentStatus)}
                          </Badge>
                          <span className="text-xs capitalize text-muted-foreground">
                            {statusLabel(row.paymentStatus)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
