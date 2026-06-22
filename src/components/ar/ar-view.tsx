'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArReport } from '@/types/api';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';

const COLS = [
  ['bucket0', 'Current'],
  ['bucket30', '1–30'],
  ['bucket60', '31–60'],
  ['bucket90', '61–90'],
  ['bucket120', '91–120'],
  ['bucket120plus', '120+'],
] as const;

export function ArView() {
  const { data, isLoading } = useQuery<ArReport>({
    queryKey: ['accounts-receivable'],
    queryFn: async () => (await api.get('/admin/accounts-receivable')).data,
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Outstanding balances by age. Buckets are refreshed nightly from invoice due dates.
      </p>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              {COLS.map(([key, label]) => (
                <TableHead key={key} className="text-right">
                  {label}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.customers.length ? (
              data.customers.map((c) => (
                <TableRow key={c.customer.id}>
                  <TableCell className="font-medium">
                    {c.customer.displayName ?? c.customer.email}
                    {c.customer.dentaplusId && (
                      <span className="text-muted-foreground text-xs"> · {c.customer.dentaplusId}</span>
                    )}
                  </TableCell>
                  {COLS.map(([key]) => (
                    <TableCell key={key} className="text-right text-muted-foreground">
                      {c[key] ? formatMoney(c[key]) : '—'}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium">{formatMoney(c.total)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No outstanding balances
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {data && data.customers.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">Total</TableCell>
                {COLS.map(([key]) => (
                  <TableCell key={key} className="text-right font-medium">
                    {formatMoney(data.totals[key])}
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium">
                  {formatMoney(data.totals.total)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
