'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Star, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminReview, PaginatedResponse } from '@/types/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';

export function ReviewsView() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PaginatedResponse<AdminReview>>({
    queryKey: ['admin-reviews'],
    queryFn: async () => (await api.get('/admin/reviews', { params: { limit: 100 } })).data,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/reviews/${id}`),
    onSuccess: () => {
      toast.success('Review removed');
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
    onError: () => toast.error('Failed to remove review'),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.data.length) {
    return <p className="text-muted-foreground py-8 text-center">No reviews</p>;
  }

  return (
    <div className="space-y-3">
      {data.data.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex items-start justify-between gap-4 py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                    />
                  ))}
                </div>
                {r.title && <span className="text-sm font-medium">{r.title}</span>}
              </div>
              <p className="text-sm text-muted-foreground">{r.body}</p>
              <p className="text-xs text-muted-foreground">
                {r.product?.name ?? 'Unknown product'} ·{' '}
                {r.user?.displayName ?? r.user?.email ?? 'Anonymous'} · {formatDate(r.createdAt)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive shrink-0"
              disabled={del.isPending}
              onClick={() => del.mutate(r.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
