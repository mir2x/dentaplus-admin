'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Offer, ProductVariantDetail } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCents } from '@/lib/format';
import { VariantEditSheet } from './variant-edit-sheet';

export function VariantsManager({ productId }: { productId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ProductVariantDetail | 'new' | null>(null);

  const { data: variants } = useQuery<ProductVariantDetail[]>({
    queryKey: ['variants', productId],
    queryFn: async () => (await api.get(`/admin/products/${productId}/variants`)).data,
  });
  const { data: offers } = useQuery<Offer[]>({
    queryKey: ['offers'],
    queryFn: async () => (await api.get('/admin/offers')).data,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/variants/${id}`),
    onSuccess: () => {
      toast.success('Variant deleted');
      queryClient.invalidateQueries({ queryKey: ['variants', productId] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <section className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">Variants ({variants?.length ?? 0})</p>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="size-4" /> Add variant
        </Button>
      </div>

      {variants?.length ? (
        <div className="divide-y rounded-md border text-sm">
          {variants.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40"
              onClick={() => router.push(`/products/${productId}/variants/${v.id}`)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {v.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnailUrl} alt="" className="size-9 shrink-0 rounded border object-cover" />
                ) : (
                  <div className="size-9 shrink-0 rounded border bg-muted" />
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {v.name || v.options.map((o) => o.value).join(' / ') || '—'}
                    {!v.isActive && <Badge variant="secondary" className="ml-2 text-[10px]">Inactive</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {v.sku ?? 'no SKU'}
                    {v.options.length > 0 && ` · ${v.options.map((o) => `${o.attributeName}: ${o.value}`).join(', ')}`}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {offers
                      ?.filter((offer) =>
                        offer.triggerVariants.some((variant) => variant.id === v.id),
                      )
                      .map((offer) => (
                        <Badge key={offer.id} variant="outline" className="text-[10px]">
                          Offer: {offer.name}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <span className="text-muted-foreground">
                  {v.saleCents != null
                    ? formatCents(v.saleCents)
                    : v.regularCents != null
                      ? formatCents(v.regularCents)
                      : '—'}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setEditing(v)}>Edit</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={del.isPending}
                  onClick={() => del.mutate(v.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No variants yet. Add one to get started.
        </p>
      )}

      <VariantEditSheet productId={productId} editing={editing} onClose={() => setEditing(null)} />
    </section>
  );
}
