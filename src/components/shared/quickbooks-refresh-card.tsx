'use client';

import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props<T> {
  /** Admin endpoint that returns the live QuickBooks snapshot. */
  endpoint: string;
  queryKey: unknown[];
  render: (data: T) => React.ReactNode;
}

/**
 * Card with a "Refresh from QuickBooks" button that lazily live-fetches a QBO
 * snapshot on demand (so the page never blocks on QuickBooks being online).
 */
export function QuickbooksRefreshCard<T>({ endpoint, queryKey, render }: Props<T>) {
  const { data, isFetching, refetch } = useQuery<T>({
    queryKey,
    queryFn: async () => (await api.get(endpoint)).data,
    enabled: false,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">QuickBooks</CardTitle>
        <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
          <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing…' : 'Refresh from QuickBooks'}
        </Button>
      </CardHeader>
      <CardContent>
        {data === undefined ? (
          <p className="text-sm text-muted-foreground">
            Click refresh to load the latest data from QuickBooks.
          </p>
        ) : (
          render(data)
        )}
      </CardContent>
    </Card>
  );
}
