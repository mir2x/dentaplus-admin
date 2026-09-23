'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import type { PopupStats } from '@/types/popups';
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
import { OptionSelect } from './form-bits';
import { formatDollars } from './popup-utils';

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'ytd', label: 'Year to date' },
] as const;
type Preset = (typeof PRESETS)[number]['value'];

function rate(n: number, d: number): string {
  return d ? `${((n / d) * 100).toFixed(1)}%` : '—';
}

export function PopupAnalytics({ popupId }: { popupId: string }) {
  const [preset, setPreset] = useState<Preset>('30d');
  const { data, isLoading } = useQuery({
    queryKey: ['popup-stats', popupId, preset],
    queryFn: async () => (await api.get<PopupStats>(`/admin/popups/${popupId}/stats`, { params: { preset } })).data,
  });

  const t = data?.totals;
  const tiles = t
    ? [
        { label: 'Shown', value: t.shown.toLocaleString('en-AU') },
        { label: 'Clicked', value: t.clicked.toLocaleString('en-AU'), sub: rate(t.clicked, t.shown) },
        { label: 'Submitted', value: t.submitted.toLocaleString('en-AU'), sub: rate(t.submitted, t.shown) },
        { label: 'Added to cart', value: t.addedToCart.toLocaleString('en-AU'), sub: rate(t.addedToCart, t.shown) },
        { label: 'Closed', value: t.closed.toLocaleString('en-AU'), sub: rate(t.closed, t.shown) },
        { label: 'Orders', value: t.orders.toLocaleString('en-AU'), sub: rate(t.orders, t.shown) },
        {
          label: 'Revenue',
          value: formatDollars(t.revenueCents),
          sub: t.orders ? `${formatDollars(Math.round(t.revenueCents / t.orders))} avg order` : undefined,
          raw: true,
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="w-48">
        <OptionSelect value={preset} options={PRESETS} onChange={setPreset} />
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
            {tiles.map((tile) => (
              <Card key={tile.label} size="sm">
                <CardHeader>
                  <CardTitle className="text-xs font-medium text-muted-foreground">{tile.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{tile.value}</p>
                  {tile.sub && (
                    <p className="text-xs text-muted-foreground">
                      {tile.sub}
                      {'raw' in tile ? '' : ' of shown'}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-md border p-3">
            <p className="mb-3 text-sm font-medium">Daily activity</p>
            {data.daily.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.daily} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="shown" name="Shown" stroke="#2563eb" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="clicked" name="Clicked" stroke="#16a34a" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="submitted" name="Submitted" stroke="#d97706" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="orders" name="Orders" stroke="#9333ea" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">No activity in this period.</p>
            )}
          </div>

          {data.byVariant.length > 0 && (
            <div className="rounded-md border">
              <p className="px-3 pt-3 text-sm font-medium">
                {data.byVariant.length > 1 ? 'A/B comparison' : 'Conversion'}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead className="text-right">Shown</TableHead>
                    <TableHead className="text-right">Click rate</TableHead>
                    <TableHead className="text-right">Submit rate</TableHead>
                    <TableHead className="text-right">Add-to-cart rate</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Order rate</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Revenue / 1k shown</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byVariant.map((v) => (
                    <TableRow key={v.variantId}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell className="text-right">{v.shown.toLocaleString('en-AU')}</TableCell>
                      <TableCell className="text-right">{rate(v.clicked, v.shown)}</TableCell>
                      <TableCell className="text-right">{rate(v.submitted, v.shown)}</TableCell>
                      <TableCell className="text-right">{rate(v.addedToCart, v.shown)}</TableCell>
                      <TableCell className="text-right">{v.orders.toLocaleString('en-AU')}</TableCell>
                      <TableCell className="text-right">{rate(v.orders, v.shown)}</TableCell>
                      <TableCell className="text-right">{formatDollars(v.revenueCents)}</TableCell>
                      <TableCell className="text-right">
                        {v.shown ? formatDollars(Math.round((v.revenueCents / v.shown) * 1000)) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Orders are credited to the last popup a customer clicked, signed up through or added to cart from in the 7
            days before ordering. Cancelled and refunded orders are excluded.
          </p>
        </>
      )}
    </div>
  );
}
