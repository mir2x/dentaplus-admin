'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Offer, ProductVariantDetail } from '@/types/api';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const uniq = (a: string[]) => [...new Set(a)];

export function ProductOffersSection({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const { data: offers } = useQuery<Offer[]>({
    queryKey: ['offers'],
    queryFn: async () => (await api.get('/admin/offers')).data,
  });
  const { data: variants } = useQuery<ProductVariantDetail[]>({
    queryKey: ['variants', productId],
    queryFn: async () => (await api.get(`/admin/products/${productId}/variants`)).data,
  });

  const variantIds = useMemo(() => new Set((variants ?? []).map((v) => v.id)), [variants]);
  const variantLabel = (v: { id: string; name: string | null; sku: string | null }) =>
    v.name || v.sku || v.id.slice(0, 6);

  const attached = useMemo(
    () =>
      (offers ?? []).filter(
        (o) =>
          o.triggerProducts.some((p) => p.id === productId) ||
          o.triggerVariants.some((v) => variantIds.has(v.id)),
      ),
    [offers, productId, variantIds],
  );

  const [offerId, setOfferId] = useState('');
  const [scope, setScope] = useState<'all' | 'select'>('all');
  const [picked, setPicked] = useState<string[]>([]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['offers'] });

  const attach = useMutation({
    mutationFn: () => {
      const offer = offers!.find((o) => o.id === offerId)!;
      if (scope === 'all') {
        const productIds = uniq([...offer.triggerProducts.map((p) => p.id), productId]);
        return api.patch(`/admin/offers/${offerId}`, { productIds });
      }
      const ids = uniq([...offer.triggerVariants.map((v) => v.id), ...picked]);
      return api.patch(`/admin/offers/${offerId}`, { variantIds: ids });
    },
    onSuccess: () => {
      toast.success('Offer attached');
      setOfferId('');
      setPicked([]);
      refresh();
    },
    onError: () => toast.error('Could not attach offer'),
  });

  const detach = useMutation({
    mutationFn: (offer: Offer) => {
      // Remove this product and all of its variants from the offer's triggers.
      const productIds = offer.triggerProducts.map((p) => p.id).filter((id) => id !== productId);
      const remainingVariantIds = offer.triggerVariants
        .map((v) => v.id)
        .filter((id) => !variantIds.has(id));
      return api.patch(`/admin/offers/${offer.id}`, {
        productIds,
        variantIds: remainingVariantIds,
      });
    },
    onSuccess: () => {
      toast.success('Offer detached');
      refresh();
    },
    onError: () => toast.error('Could not detach offer'),
  });

  const describeAttachment = (o: Offer) => {
    if (o.triggerProducts.some((p) => p.id === productId)) return 'All variants';
    const names = o.triggerVariants.filter((v) => variantIds.has(v.id)).map(variantLabel);
    return names.length ? names.join(', ') : '—';
  };

  const togglePick = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <section className="rounded-lg border p-4">
      <p className="text-sm font-medium mb-3">Offers</p>

      {attached.length ? (
        <ul className="divide-y rounded-md border text-sm mb-4">
          {attached.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0">
                <span className="font-medium">{o.name}</span>
                <span className="text-muted-foreground"> · {describeAttachment(o)}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={detach.isPending}
                onClick={() => detach.mutate(o)}
              >
                <X className="size-4" /> Detach
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">No offers attached.</p>
      )}

      {/* Attach an existing offer */}
      <div className="space-y-3 rounded-md bg-muted/30 p-3">
        <p className="text-xs font-medium">Attach an existing offer</p>
        <Select value={offerId} onValueChange={(v) => setOfferId(v ?? '')}>
          <SelectTrigger><SelectValue placeholder="Choose an offer…" /></SelectTrigger>
          <SelectContent>
            {offers?.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {offerId && (
          <>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={scope === 'all' ? 'default' : 'outline'}
                onClick={() => setScope('all')}
              >
                All variants
              </Button>
              <Button
                type="button"
                size="sm"
                variant={scope === 'select' ? 'default' : 'outline'}
                onClick={() => setScope('select')}
              >
                Select variants
              </Button>
            </div>

            {scope === 'select' && (
              <div className="flex flex-wrap gap-2">
                {variants?.length ? (
                  variants.map((v) => {
                    const on = picked.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => togglePick(v.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                          on ? 'border-primary bg-primary text-primary-foreground' : 'border-input hover:bg-muted'
                        }`}
                      >
                        {on && <Check className="size-3" />}
                        {variantLabel(v)}
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-muted-foreground">No variants to select.</span>
                )}
              </div>
            )}

            <Button
              size="sm"
              disabled={attach.isPending || (scope === 'select' && picked.length === 0)}
              onClick={() => attach.mutate()}
            >
              {attach.isPending ? 'Attaching…' : 'Attach offer'}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
