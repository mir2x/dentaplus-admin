'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Offer } from '@/types/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCents } from '@/lib/format';
import { OfferEditSheet } from './offer-edit-sheet';

/**
 * ANY_VARIANT/SPECIFIC offers can be created with no trigger yet (an "empty
 * shell" attached to a product later from that product's edit page) — the
 * backend deliberately keeps those inert rather than treating them as
 * general/whole-cart, so the label here must not claim they're live storewide.
 */
function describeAppliesTo(o: Offer): string {
  if (o.triggerProducts?.length) {
    return o.triggerProducts.length === 1
      ? o.triggerProducts[0].name
      : `${o.triggerProducts.length} products`;
  }
  if (o.triggerVariants?.length) {
    return o.triggerVariants.length === 1
      ? (o.triggerVariants[0].name ?? o.triggerVariants[0].sku ?? '1 variant')
      : `${o.triggerVariants.length} variants`;
  }
  if (o.freeScope === 'ANY_VARIANT' || o.freeScope === 'SPECIFIC') {
    return 'Not yet attached';
  }
  return 'General (whole cart)';
}

export function describeReward(o: Offer): string {
  if (o.rewardType === 'FIXED_DISCOUNT') return `${formatCents(o.discountAmountCents ?? 0)} off`;
  if (o.rewardType === 'PERCENTAGE_DISCOUNT') return `${(o.discountBps ?? 0) / 100}% off`;
  const target =
    o.freeScope === 'SPECIFIC'
      ? o.freeVariants.length === 1
        ? (o.freeVariants[0].name ?? 'variant')
        : `${o.freeVariants.length} variant choices`
      : o.freeScope === 'ANY_VARIANT'
        ? 'any variant (customer choice)'
        : 'same product/variant';
  return `${o.freeQty ?? 1} × free ${target}`;
}

export function OffersView() {
  const [editing, setEditing] = useState<Offer | 'new' | null>(null);

  const { data, isLoading } = useQuery<Offer[]>({
    queryKey: ['offers'],
    queryFn: async () => (await api.get('/admin/offers')).data,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" /> New offer
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Applies to</TableHead>
              <TableHead>Buy</TableHead>
              <TableHead>Reward</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.length ? (
              data.map((o) => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => setEditing(o)}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1.5">
                      {!o.triggerProducts?.length &&
                      !o.triggerVariants?.length &&
                      (o.freeScope === 'ANY_VARIANT' || o.freeScope === 'SPECIFIC') ? (
                        <span className="font-medium text-amber-600">{describeAppliesTo(o)}</span>
                      ) : (
                        <span className="text-muted-foreground">{describeAppliesTo(o)}</span>
                      )}
                      {o.triggerMode === 'COLLECTIVE' && (
                        <Badge variant="outline" className="shrink-0">
                          Collective
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{o.minQuantity}+</TableCell>
                  <TableCell className="text-sm">{describeReward(o)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={o.isActive ? 'default' : 'secondary'}>
                      {o.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No offers
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <OfferEditSheet editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
