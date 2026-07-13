'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  ShoppingCart,
  UserPlus,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  PackageX,
  Landmark,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DashboardSummary } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';

export function DashboardView() {
  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get('/admin/dashboard/summary')).data,
  });

  const cards = [
    { label: 'Gross sales (MTD)', value: data && formatMoney(data.grossSalesMtd), icon: DollarSign },
    { label: 'Orders today', value: data?.ordersToday, sub: `${data?.ordersMtd ?? 0} this month`, icon: ShoppingCart },
    { label: 'New customers (MTD)', value: data?.newCustomersMtd, icon: UserPlus },
    { label: 'AR outstanding', value: data && formatMoney(data.accountsReceivable.outstanding), icon: Landmark, href: '/accounts-receivable' },
    { label: 'Pending credit apps', value: data?.pendingCreditApplications, icon: CreditCard, href: '/credit-applications', alert: (data?.pendingCreditApplications ?? 0) > 0 },
    { label: 'Overdue invoices', value: data?.overdueInvoices, icon: AlertTriangle, href: '/invoices', alert: (data?.overdueInvoices ?? 0) > 0 },
    { label: 'Pending QBO pushes', value: data?.pendingQboPushes, icon: RefreshCw, href: '/quickbooks', alert: (data?.pendingQboPushes ?? 0) > 0 },
    { label: 'Out of stock', value: data?.inventory.outOfStock, sub: `${data?.inventory.lowStock ?? 0} low stock`, icon: PackageX, href: '/products?stock=out' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Inner = (
            <Card className={c.alert ? 'border-amber-500/50' : undefined}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.label}
                </CardTitle>
                <c.icon className={`size-4 ${c.alert ? 'text-amber-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-semibold">{c.value ?? 0}</div>
                )}
                {c.sub && <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>}
              </CardContent>
            </Card>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="block transition-opacity hover:opacity-80">
              {Inner}
            </Link>
          ) : (
            <div key={c.label}>{Inner}</div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accounts receivable aging</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              {(
                [
                  ['Current', data.accountsReceivable.aging.bucket0],
                  ['1–30', data.accountsReceivable.aging.bucket30],
                  ['31–60', data.accountsReceivable.aging.bucket60],
                  ['61–90', data.accountsReceivable.aging.bucket90],
                  ['91–120', data.accountsReceivable.aging.bucket120],
                  ['120+', data.accountsReceivable.aging.bucket120plus],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label} days</p>
                  <p className="text-lg font-medium">{formatMoney(value)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
