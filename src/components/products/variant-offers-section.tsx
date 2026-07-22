'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { Offer } from '@/types/api';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VariantChipPicker } from '@/components/products/variant-chip-picker';

const uniq = (a: string[]) => [...new Set(a)];

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const message = err.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}

export function VariantOffersSection({
  variantId,
  variants,
}: {
  variantId: string;
  /** Sibling variants of the same product — SPECIFIC free variants are chosen from these. */
  variants: { id: string; name: string | null; sku: string | null }[];
}) {
  const queryClient = useQueryClient();
  const [offerId, setOfferId] = useState('');
  const [freePicked, setFreePicked] = useState<string[]>([]);

  const { data: offers } = useQuery<Offer[]>({
    queryKey: ['offers'],
    queryFn: async () => (await api.get('/admin/offers')).data,
  });

  const attached = (offers ?? []).filter((o) =>
    o.triggerVariants.some((v) => v.id === variantId),
  );
  const selectedOffer = offers?.find((o) => o.id === offerId);
  const needsFreeVariants = selectedOffer?.freeScope === 'SPECIFIC';
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['offers'] });

  const attach = useMutation({
    mutationFn: () => {
      const offer = offers!.find((o) => o.id === offerId)!;
      const ids = uniq([...offer.triggerVariants.map((v) => v.id), variantId]);
      // SPECIFIC offers validate the trigger and its free-variant pool together —
      // both must be sent in the same request, see ProductOffersSection.
      const freeVariantIds =
        offer.freeScope === 'SPECIFIC'
          ? uniq([...offer.freeVariants.map((v) => v.id), ...freePicked])
          : undefined;
      return api.patch(`/admin/offers/${offerId}`, {
        variantIds: ids,
        ...(freeVariantIds ? { freeVariantIds } : {}),
      });
    },
    onSuccess: () => {
      toast.success('Offer attached to variant');
      setOfferId('');
      setFreePicked([]);
      refresh();
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not attach offer')),
  });

  const detach = useMutation({
    mutationFn: (offer: Offer) =>
      api.patch(`/admin/offers/${offer.id}`, {
        variantIds: offer.triggerVariants.map((v) => v.id).filter((id) => id !== variantId),
      }),
    onSuccess: () => {
      toast.success('Offer detached');
      refresh();
    },
    onError: () => toast.error('Could not detach offer'),
  });

  const toggleFreePick = (id: string) =>
    setFreePicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const canAttach = !attach.isPending && offerId && !(needsFreeVariants && freePicked.length === 0);

  return (
    <section className="rounded-lg border p-4">
      <p className="text-sm font-medium mb-3">Offers (this variant)</p>

      {attached.length ? (
        <ul className="divide-y rounded-md border text-sm mb-4">
          {attached.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="font-medium">{o.name}</span>
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
        <p className="text-sm text-muted-foreground mb-4">No offers attached to this variant.</p>
      )}

      <div className="space-y-3">
        <Select
          value={offerId}
          onValueChange={(v) => {
            setOfferId(v ?? '');
            setFreePicked([]);
          }}
        >
          <SelectTrigger className="w-full"><SelectValue placeholder="Attach an existing offer…" /></SelectTrigger>
          <SelectContent>
            {offers?.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {needsFreeVariants && (
          <div className="rounded-md bg-muted/30 p-2.5">
            <p className="text-xs font-medium mb-1.5">
              Free variants (customer may receive) — required for a SPECIFIC offer
            </p>
            <VariantChipPicker
              variants={variants}
              selectedIds={new Set(freePicked)}
              onToggle={toggleFreePick}
            />
          </div>
        )}

        <Button size="sm" disabled={!canAttach} onClick={() => attach.mutate()}>
          {attach.isPending ? 'Attaching…' : 'Attach'}
        </Button>
      </div>
    </section>
  );
}
