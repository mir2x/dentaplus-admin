import { CouponUsage } from '@/types/api';
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
import { formatMoney } from '@/lib/format';

interface Props {
  data: CouponUsage[] | undefined;
  isLoading: boolean;
}

function formatCouponValue(type: string | null, value: number | null) {
  if (!type || value == null) return '—';
  return type === 'PERCENTAGE' ? `${value}%` : formatMoney(value / 100);
}

export function CouponTable({ data, isLoading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Coupon Usage</CardTitle>
        <p className="text-xs text-muted-foreground">
          Orders placed before coupon tracking was enabled are excluded.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="text-right">Uses</TableHead>
              <TableHead className="text-right">Total Discount</TableHead>
              <TableHead className="text-right pr-4">Revenue with Coupon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || !data ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                  No coupon usage recorded for this period
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.promoCodeId}>
                  <TableCell className="pl-4 font-mono font-medium text-sm">{row.code}</TableCell>
                  <TableCell>
                    {row.type && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {row.type.toLowerCase()}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{formatCouponValue(row.type, row.value)}</TableCell>
                  <TableCell className="text-right text-sm">{row.usageCount}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatMoney(row.totalDiscount)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm pr-4">
                    {formatMoney(row.revenueWithCoupon)}
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
