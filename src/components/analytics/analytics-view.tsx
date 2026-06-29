'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  AnalyticsSummary,
  CouponUsage,
  DatePreset,
  PaginatedResponse,
  TrendPoint,
  TopCustomer,
  WholesaleCustomer,
} from '@/types/api';
import { DateFilterBar } from './date-filter-bar';
import { SummaryCards } from './summary-cards';
import { TrendChart } from './trend-chart';
import { TopProductsTable } from './top-products-table';
import { TopCustomersTable } from './top-customers-table';
import { CouponTable } from './coupon-table';

interface TopProductsResponse {
  products: {
    productId: string | null;
    name: string;
    sku: string | null;
    revenue: number;
    quantitySold: number;
  }[];
  variants: {
    variantId: string | null;
    name: string;
    sku: string | null;
    revenue: number;
    quantitySold: number;
  }[];
}

export function AnalyticsView() {
  const [preset, setPreset] = useState<DatePreset>('30d');
  const [customersPage, setCustomersPage] = useState(1);
  const [wholesalePage, setWholesalePage] = useState(1);

  function handlePresetChange(p: DatePreset) {
    setPreset(p);
    setCustomersPage(1);
    setWholesalePage(1);
  }

  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ['analytics-summary', preset],
    queryFn: () => api.get('/admin/analytics/summary', { params: { preset } }).then((r) => r.data),
  });

  const { data: trend, isLoading: trendLoading } = useQuery<TrendPoint[]>({
    queryKey: ['analytics-trend', preset],
    queryFn: () => api.get('/admin/analytics/trend', { params: { preset } }).then((r) => r.data),
  });

  const { data: topProducts, isLoading: topProductsLoading } = useQuery<TopProductsResponse>({
    queryKey: ['analytics-top-products', preset],
    queryFn: () =>
      api.get('/admin/analytics/top-products', { params: { preset, limit: 10 } }).then((r) => r.data),
  });

  const { data: topCustomers, isLoading: topCustomersLoading } = useQuery<
    PaginatedResponse<TopCustomer>
  >({
    queryKey: ['analytics-top-customers', preset, customersPage],
    queryFn: () =>
      api
        .get('/admin/analytics/top-customers', {
          params: { preset, page: customersPage, limit: 10 },
        })
        .then((r) => r.data),
  });

  const { data: wholesale, isLoading: wholesaleLoading } = useQuery<
    PaginatedResponse<WholesaleCustomer>
  >({
    queryKey: ['analytics-wholesale', preset, wholesalePage],
    queryFn: () =>
      api
        .get('/admin/analytics/wholesale', {
          params: { preset, page: wholesalePage, limit: 10 },
        })
        .then((r) => r.data),
  });

  const { data: coupons, isLoading: couponsLoading } = useQuery<CouponUsage[]>({
    queryKey: ['analytics-coupons', preset],
    queryFn: () =>
      api.get('/admin/analytics/coupons', { params: { preset } }).then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <DateFilterBar preset={preset} onChange={handlePresetChange} />
      <SummaryCards data={summary} isLoading={summaryLoading} />
      <TrendChart data={trend} isLoading={trendLoading} />
      <div className="grid gap-6 lg:grid-cols-2">
        <TopProductsTable data={topProducts} isLoading={topProductsLoading} />
        <TopCustomersTable
          title="Top Customers"
          data={topCustomers}
          isLoading={topCustomersLoading}
          page={customersPage}
          onPageChange={setCustomersPage}
        />
      </div>
      <TopCustomersTable
        title="Wholesale Performance"
        data={wholesale}
        isLoading={wholesaleLoading}
        page={wholesalePage}
        onPageChange={setWholesalePage}
        showDiscounts
      />
      <CouponTable data={coupons} isLoading={couponsLoading} />
    </div>
  );
}
