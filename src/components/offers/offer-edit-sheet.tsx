'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Offer, OfferRewardType, FreeProductScope, Product } from '@/types/api';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  editing: Offer | 'new' | null;
  onClose: () => void;
}

export function OfferEditSheet({ editing, onClose }: Props) {
  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {editing && (
          <OfferForm key={editing === 'new' ? 'new' : editing.id} editing={editing} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface FormState {
  name: string;
  description: string;
  productId: string;
  minQuantity: number;
  rewardType: OfferRewardType;
  discountAmountCents: string;
  discountBps: string;
  freeQty: string;
  freeScope: FreeProductScope;
  freeProductId: string;
  isActive: boolean;
}

function OfferForm({ editing, onClose }: { editing: Offer | 'new'; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products-for-offers'],
    queryFn: async () => (await api.get('/admin/products')).data,
  });

  const [form, setForm] = useState<FormState>(() =>
    isEdit
      ? {
          name: editing.name,
          description: editing.description ?? '',
          productId: editing.product?.id ?? '',
          minQuantity: editing.minQuantity,
          rewardType: editing.rewardType,
          discountAmountCents: editing.discountAmountCents != null ? String(editing.discountAmountCents) : '',
          discountBps: editing.discountBps != null ? String(editing.discountBps) : '',
          freeQty: editing.freeQty != null ? String(editing.freeQty) : '1',
          freeScope: editing.freeScope ?? 'SAME',
          freeProductId: editing.freeProduct?.id ?? '',
          isActive: editing.isActive,
        }
      : {
          name: '',
          description: '',
          productId: '',
          minQuantity: 1,
          rewardType: 'FIXED_DISCOUNT',
          discountAmountCents: '',
          discountBps: '',
          freeQty: '1',
          freeScope: 'SAME',
          freeProductId: '',
          isActive: true,
        },
  );

  const save = useMutation({
    mutationFn: () => {
      const base = {
        name: form.name,
        description: form.description || undefined,
        productId: form.productId,
        minQuantity: form.minQuantity,
        rewardType: form.rewardType,
        isActive: form.isActive,
      };
      let reward: Record<string, unknown> = {};
      if (form.rewardType === 'FIXED_DISCOUNT') {
        reward = { discountAmountCents: Number(form.discountAmountCents) };
      } else if (form.rewardType === 'PERCENTAGE_DISCOUNT') {
        reward = { discountBps: Number(form.discountBps) };
      } else {
        reward = {
          freeQty: Number(form.freeQty),
          freeScope: form.freeScope,
          ...(form.freeScope === 'SPECIFIC' ? { freeProductId: form.freeProductId } : {}),
        };
      }
      const payload = { ...base, ...reward };
      return isEdit
        ? api.patch(`/admin/offers/${editing.id}`, payload)
        : api.post('/admin/offers', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Offer updated' : 'Offer created');
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      onClose();
    },
    onError: () => toast.error('Save failed (check the reward fields)'),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/admin/offers/${(editing as Offer).id}`),
    onSuccess: () => {
      toast.success('Offer deleted');
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      onClose();
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>{isEdit ? `Edit ${editing.name}` : 'New offer'}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>

        <Field label="Trigger product">
          <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v ?? '' })}>
            <SelectTrigger>
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {products?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Minimum quantity to trigger">
          <Input
            type="number"
            value={form.minQuantity}
            onChange={(e) => setForm({ ...form, minQuantity: Number(e.target.value) })}
          />
        </Field>

        <Field label="Reward type">
          <Select
            value={form.rewardType}
            onValueChange={(v) => setForm({ ...form, rewardType: (v as OfferRewardType) ?? 'FIXED_DISCOUNT' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FIXED_DISCOUNT">Fixed discount</SelectItem>
              <SelectItem value="PERCENTAGE_DISCOUNT">Percentage discount</SelectItem>
              <SelectItem value="FREE_PRODUCT">Free product</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {form.rewardType === 'FIXED_DISCOUNT' && (
          <Field label="Discount amount (cents)">
            <Input
              type="number"
              value={form.discountAmountCents}
              onChange={(e) => setForm({ ...form, discountAmountCents: e.target.value })}
            />
          </Field>
        )}

        {form.rewardType === 'PERCENTAGE_DISCOUNT' && (
          <Field label="Discount (basis points — 2000 = 20%)">
            <Input
              type="number"
              value={form.discountBps}
              onChange={(e) => setForm({ ...form, discountBps: e.target.value })}
            />
          </Field>
        )}

        {form.rewardType === 'FREE_PRODUCT' && (
          <>
            <Field label="Free quantity">
              <Input
                type="number"
                value={form.freeQty}
                onChange={(e) => setForm({ ...form, freeQty: e.target.value })}
              />
            </Field>
            <Field label="Free product scope">
              <Select
                value={form.freeScope}
                onValueChange={(v) => setForm({ ...form, freeScope: (v as FreeProductScope) ?? 'SAME' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAME">Same product</SelectItem>
                  <SelectItem value="SPECIFIC">A specific product</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {form.freeScope === 'SPECIFIC' && (
              <Field label="Free product">
                <Select
                  value={form.freeProductId}
                  onValueChange={(v) => setForm({ ...form, freeProductId: v ?? '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </>
        )}

        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={save.isPending || !form.name || !form.productId}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </Button>
          {isEdit && (
            <Button variant="destructive" disabled={del.isPending} onClick={() => del.mutate()}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
