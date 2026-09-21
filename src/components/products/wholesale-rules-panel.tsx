'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, getApiErrorMessage } from '@/lib/api';
import { WholesaleRule } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Owner =
  | { productId: string; variantId?: undefined }
  | { productId?: undefined; variantId: string };

function discountCents(rule: WholesaleRule, regularPriceCents: number): number {
  return rule.discountType === 'PERCENTAGE'
    ? Math.round(regularPriceCents * ((rule.percentageBps ?? 0) / 10000))
    : (rule.amountCents ?? 0);
}

export function WholesaleRulesPanel(
  props: Owner & { regularPriceCents: number | null },
) {
  const queryClient = useQueryClient();
  const ownerKey = props.productId ? `product:${props.productId}` : `variant:${props.variantId}`;
  const basePath = props.productId
    ? `/admin/products/${props.productId}/wholesale-rules`
    : `/admin/variants/${props.variantId}/wholesale-rules`;

  const { data: rules } = useQuery<WholesaleRule[]>({
    queryKey: ['wholesale-rules', ownerKey],
    queryFn: async () => (await api.get(basePath)).data,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [minQuantity, setMinQuantity] = useState('1');
  const [wholesalePrice, setWholesalePrice] = useState('');

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['wholesale-rules', ownerKey] });

  const resetForm = () => {
    setEditingId(null);
    setMinQuantity('1');
    setWholesalePrice('');
  };

  const editRule = (rule: WholesaleRule) => {
    const regular = props.regularPriceCents;
    if (regular == null) return;
    setEditingId(rule.id);
    setMinQuantity(String(rule.minQuantity));
    setWholesalePrice(((regular - discountCents(rule, regular)) / 100).toFixed(2));
  };

  const save = useMutation({
    mutationFn: () => {
      const regular = props.regularPriceCents ?? 0;
      const price = Math.round(parseFloat(wholesalePrice) * 100);
      const payload = {
        roleKey: 'wholesale_customer',
        minQuantity: Number(minQuantity) || 1,
        discountType: 'FIXED',
        amountCents: regular - price,
        percentageBps: null,
      };
      return editingId
        ? api.patch(`/admin/wholesale-rules/${editingId}`, payload)
        : api.post(basePath, payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Wholesale rule updated' : 'Wholesale rule added');
      resetForm();
      invalidate();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, 'Could not save wholesale rule')),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/wholesale-rules/${id}`),
    onSuccess: () => {
      toast.success('Rule removed');
      invalidate();
    },
    onError: () => toast.error('Delete failed'),
  });

  const enteredPriceCents = Math.round(parseFloat(wholesalePrice || '0') * 100);
  const canSave =
    props.regularPriceCents != null &&
    enteredPriceCents > 0 &&
    enteredPriceCents < props.regularPriceCents;

  return (
    <div className="space-y-3">
      {rules?.length ? (
        <ul className="divide-y rounded-md border text-sm">
          {rules.map((rule) => {
            const discount =
              props.regularPriceCents == null
                ? null
                : discountCents(rule, props.regularPriceCents);
            const price =
              discount == null || props.regularPriceCents == null
                ? null
                : props.regularPriceCents - discount;
            return (
              <li key={rule.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span>
                  <span className="font-medium">Wholesale customer</span>
                  <span className="text-muted-foreground"> · {rule.minQuantity}+ units · </span>
                  {price == null ? 'Price unavailable' : `$${(price / 100).toFixed(2)}`}
                  {discount != null && (
                    <span className="text-muted-foreground">
                      {' '}(${(discount / 100).toFixed(2)} off)
                    </span>
                  )}
                </span>
                <div className="flex shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => editRule(rule)}>
                    <Pencil className="size-4" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={del.isPending}
                    onClick={() => del.mutate(rule.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          No wholesale rules for this {props.productId ? 'product' : 'variant'}.
        </p>
      )}

      <div className="rounded-md bg-muted/30 p-3 text-sm">
        Regular price:{' '}
        <strong>
          {props.regularPriceCents == null
            ? 'Set a regular price first'
            : `$${(props.regularPriceCents / 100).toFixed(2)}`}
        </strong>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Min quantity</Label>
          <Input
            type="number"
            min={1}
            value={minQuantity}
            onChange={(event) => setMinQuantity(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Wholesale price ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max={props.regularPriceCents != null ? (props.regularPriceCents - 1) / 100 : undefined}
            placeholder="e.g. 11.00"
            value={wholesalePrice}
            onChange={(event) => setWholesalePrice(event.target.value)}
          />
          {props.regularPriceCents != null && enteredPriceCents > 0 && (
            <p className="text-xs text-muted-foreground">
              Discount: $
              {Math.max(0, (props.regularPriceCents - enteredPriceCents) / 100).toFixed(2)} per unit
            </p>
          )}
        </div>
      </div>

      <Button
        size="sm"
        className="w-full"
        disabled={save.isPending || !canSave}
        onClick={() => save.mutate()}
      >
        {save.isPending
          ? 'Saving…'
          : editingId
            ? 'Save wholesale rule'
            : 'Add wholesale rule'}
      </Button>
      {editingId && (
        <Button variant="ghost" size="sm" className="w-full" onClick={resetForm}>
          <X className="size-4" /> Cancel edit
        </Button>
      )}
    </div>
  );
}
