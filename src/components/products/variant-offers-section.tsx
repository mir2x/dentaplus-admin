'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const uniq = (a: string[]) => [...new Set(a)];

export function VariantOffersSection({ variantId }: { variantId: string }) {
  const queryClient = useQueryClient();
  const [offerId, setOfferId] = useState('');

  const { data: offers } = useQuery<Offer[]>({
    queryKey: ['offers'],
    queryFn: async () => (await api.get('/admin/offers')).data,
  });

  const attached = (offers ?? []).filter((o) =>
    o.triggerVariants.some((v) => v.id === variantId),
  );
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['offers'] });

  const attach = useMutation({
    mutationFn: () => {
      const offer = offers!.find((o) => o.id === offerId)!;
      const ids = uniq([...offer.triggerVariants.map((v) => v.id), variantId]);
      return api.patch(`/admin/offers/${offerId}`, { variantIds: ids });
    },
    onSuccess: () => {
      toast.success('Offer attached to variant');
      setOfferId('');
      refresh();
    },
    onError: () => toast.error('Could not attach offer'),
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

      <div className="flex items-center gap-2">
        <Select value={offerId} onValueChange={(v) => setOfferId(v ?? '')}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Attach an existing offer…" /></SelectTrigger>
          <SelectContent>
            {offers?.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!offerId || attach.isPending} onClick={() => attach.mutate()}>
          {attach.isPending ? 'Attaching…' : 'Attach'}
        </Button>
      </div>
    </section>
  );
}
