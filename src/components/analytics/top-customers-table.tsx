'use client';

import { useRouter } from 'next/navigation';
import { TopCustomer, WholesaleCustomer, PaginatedResponse } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { formatMoney } from '@/lib/format';

interface Props {
  title: string;
  data: PaginatedResponse<TopCustomer | WholesaleCustomer> | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  showDiscounts?: boolean;
}

export function TopCustomersTable({
  title,
  data,
  isLoading,
  page,
  onPageChange,
  showDiscounts = false,
}: Props) {
  const router = useRouter();
  const rows = data?.data;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 pl-4">#</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Company</TableHead>
              {showDiscounts && <TableHead className="text-right">Discounts</TableHead>}
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right pr-4">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || !rows ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: showDiscounts ? 6 : 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showDiscounts ? 6 : 5}
                  className="text-center text-muted-foreground py-8 text-sm"
                >
                  No data for this period
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow
                  key={row.customerId}
                  className="cursor-pointer"
                  onClick={() => router.push(`/customers/${row.customerId}`)}
                >
                  <TableCell className="pl-4 text-muted-foreground text-sm">
                    {(page - 1) * (data?.meta.limit ?? 10) + i + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {row.displayName ?? row.email ?? '—'}
                      </span>
                      {row.isWholesale && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          Wholesale
                        </Badge>
                      )}
                    </div>
                    {row.displayName && (
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.company ?? '—'}
                  </TableCell>
                  {showDiscounts && (
                    <TableCell className="text-right text-sm">
                      {formatMoney((row as WholesaleCustomer).discounts)}
                    </TableCell>
                  )}
                  <TableCell className="text-right text-sm">{row.orderCount}</TableCell>
                  <TableCell className="text-right font-medium text-sm pr-4">
                    {formatMoney(row.revenue)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {data && (
          <div className="border-t px-3">
            <PaginationControls
              page={data.meta.page}
              pages={data.meta.pages}
              total={data.meta.total}
              limit={data.meta.limit}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
