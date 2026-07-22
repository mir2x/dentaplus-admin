'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { X } from 'lucide-react';
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
import { VariantChipPicker, variantLabel } from '@/components/products/variant-chip-picker';

const uniq = (a: string[]) => [...new Set(a)];

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const message = err.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}

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
  const [freePicked, setFreePicked] = useState<string[]>([]);

  const selectedOffer = offers?.find((o) => o.id === offerId);
  const needsFreeVariants = selectedOffer?.freeScope === 'SPECIFIC';

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['offers'] });

  const attach = useMutation({
    mutationFn: () => {
      const offer = offers!.find((o) => o.id === offerId)!;
      // SPECIFIC offers validate the trigger and its free-variant pool together —
      // an offer with no free variants yet is rejected even mid-attach, so both
      // must be sent in the same request.
      const freeVariantIds =
        offer.freeScope === 'SPECIFIC'
          ? uniq([...offer.freeVariants.map((v) => v.id), ...freePicked])
          : undefined;
      if (scope === 'all') {
        const productIds = uniq([...offer.triggerProducts.map((p) => p.id), productId]);
        return api.patch(`/admin/offers/${offerId}`, {
          productIds,
          ...(freeVariantIds ? { freeVariantIds } : {}),
        });
      }
      const ids = uniq([...offer.triggerVariants.map((v) => v.id), ...picked]);
      return api.patch(`/admin/offers/${offerId}`, {
        variantIds: ids,
        ...(freeVariantIds ? { freeVariantIds } : {}),
      });
    },
    onSuccess: () => {
      toast.success('Offer attached');
      setOfferId('');
      setPicked([]);
      setFreePicked([]);
      refresh();
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not attach offer')),
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
  const toggleFreePick = (id: string) =>
    setFreePicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const setFreeVariants = useMutation({
    mutationFn: ({ offerId: id, freeVariantIds }: { offerId: string; freeVariantIds: string[] }) =>
      api.patch(`/admin/offers/${id}`, { freeVariantIds }),
    onSuccess: () => refresh(),
    onError: (err) => toast.error(errorMessage(err, 'Could not update free variants')),
  });

  const canAttach =
    !attach.isPending &&
    offerId &&
    !(scope === 'select' && picked.length === 0) &&
    !(needsFreeVariants && freePicked.length === 0);

  return (
    <section className="rounded-lg border p-4">
      <p className="text-sm font-medium mb-3">Offers</p>

      {attached.length ? (
        <ul className="divide-y rounded-md border text-sm mb-4">
          {attached.map((o) => (
            <li key={o.id} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{o.name}</span>
                    <span className="text-muted-foreground"> · {describeAttachment(o)}</span>
                  </div>
                  {(o.startsAt || o.endsAt) && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {o.startsAt ? new Date(o.startsAt).toLocaleDateString() : 'Now'} – {o.endsAt ? new Date(o.endsAt).toLocaleDateString() : 'Ongoing'}
                    </div>
                  )}
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
              </div>
              {o.freeScope === 'ANY_VARIANT' && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Customers choose from this product&apos;s {variants?.length ?? 0} variant
                  {variants?.length === 1 ? '' : 's'}.
                </p>
              )}
              {o.freeScope === 'SPECIFIC' && (
                <div className="mt-2 rounded-md bg-muted/30 p-2.5">
                  <p className="text-xs font-medium mb-1.5">
                    Free variants ({o.freeVariants.length} selected — the customer always picks
                    which one at checkout, even if only one is selected)
                  </p>
                  <VariantChipPicker
                    variants={variants ?? []}
                    selectedIds={new Set(o.freeVariants.map((v) => v.id))}
                    disabled={setFreeVariants.isPending}
                    onToggle={(id) => {
                      const freeIds = new Set(o.freeVariants.map((v) => v.id));
                      const next = freeIds.has(id)
                        ? [...freeIds].filter((x) => x !== id)
                        : [...freeIds, id];
                      setFreeVariants.mutate({ offerId: o.id, freeVariantIds: next });
                    }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">No offers attached.</p>
      )}

      {/* Attach an existing offer */}
      <div className="space-y-3 rounded-md bg-muted/30 p-3">
        <p className="text-xs font-medium">Attach an existing offer</p>
        <Select
          value={offerId}
          onValueChange={(v) => {
            setOfferId(v ?? '');
            setFreePicked([]);
          }}
        >
          <SelectTrigger className="w-full mb-3">
            <SelectValue placeholder="Choose an offer…">
              {offerId ? offers?.find((o) => o.id === offerId)?.name : 'Choose an offer…'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {offers?.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {offerId && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input cursor-pointer"
                  checked={scope === 'all'}
                  onChange={(e) => setScope(e.target.checked ? 'all' : 'select')}
                />
                All variants
              </label>
            </div>

            {scope === 'select' && (
              <div className="mb-3">
                <VariantChipPicker
                  variants={variants ?? []}
                  selectedIds={new Set(picked)}
                  onToggle={togglePick}
                />
              </div>
            )}

            {needsFreeVariants && (
              <div className="mb-3 rounded-md bg-background p-2.5">
                <p className="text-xs font-medium mb-1.5">
                  Free variants (customer may receive) — required for a SPECIFIC offer
                </p>
                <VariantChipPicker
                  variants={variants ?? []}
                  selectedIds={new Set(freePicked)}
                  onToggle={toggleFreePick}
                />
              </div>
            )}

            <Button size="sm" disabled={!canAttach} onClick={() => attach.mutate()}>
              {attach.isPending ? 'Attaching…' : 'Attach offer'}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
