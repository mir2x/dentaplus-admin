'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendPoint } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';

interface Props {
  data: TrendPoint[] | undefined;
  isLoading: boolean;
}

function formatPeriod(period: string) {
  if (period.length === 7) {
    const [year, month] = period.split('-');
    const d = new Date(Number(year), Number(month) - 1);
    return d.toLocaleString('en-AU', { month: 'short', year: '2-digit' });
  }
  const d = new Date(period);
  return d.toLocaleString('en-AU', { day: 'numeric', month: 'short' });
}

export function TrendChart({ data, isLoading }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Sales Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length === 0 ? (
          <p className="text-center text-muted-foreground py-16 text-sm">No data for this period</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="period"
                tickFormatter={formatPeriod}
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatMoney(v)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatMoney(Number(value)),
                  name === 'grossSales' ? 'Gross Sales'
                    : name === 'netSales' ? 'Net Sales'
                    : 'Revenue',
                ]}
                labelFormatter={(label) => formatPeriod(String(label))}
              />
              <Legend
                formatter={(v) =>
                  v === 'grossSales' ? 'Gross Sales' : v === 'netSales' ? 'Net Sales' : 'Revenue'
                }
              />
              <Area
                type="monotone"
                dataKey="grossSales"
                stroke="#6366f1"
                fill="url(#colorGross)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="netSales"
                stroke="#22c55e"
                fill="url(#colorNet)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#a855f7"
                fill="url(#colorRevenue)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
