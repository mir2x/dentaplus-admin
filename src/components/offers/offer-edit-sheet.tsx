'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Offer, OfferRewardType, FreeProductScope } from '@/types/api';
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
  minQuantity: number;
  rewardType: OfferRewardType;
  discountAmountCents: string;
  discountBps: string;
  freeQty: string;
  freeScope: FreeProductScope;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

function OfferForm({ editing, onClose }: { editing: Offer | 'new'; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';

  const [form, setForm] = useState<FormState>(() =>
    isEdit
      ? {
          name: editing.name,
          description: editing.description ?? '',
          minQuantity: editing.minQuantity,
          rewardType: editing.rewardType,
          discountAmountCents: editing.discountAmountCents != null ? String(editing.discountAmountCents) : '',
          discountBps: editing.discountBps != null ? String(editing.discountBps) : '',
          freeQty: editing.freeQty != null ? String(editing.freeQty) : '1',
          freeScope: editing.freeScope ?? 'SAME',
          isActive: editing.isActive,
          startsAt: editing.startsAt ? editing.startsAt.slice(0, 10) : '',
          endsAt: editing.endsAt ? editing.endsAt.slice(0, 10) : '',
        }
      : {
          name: '',
          description: '',
          minQuantity: 1,
          rewardType: 'FIXED_DISCOUNT',
          discountAmountCents: '',
          discountBps: '',
          freeQty: '1',
          freeScope: 'SAME',
          isActive: true,
          startsAt: '',
          endsAt: '',
        },
  );

  const save = useMutation({
    mutationFn: () => {
      const base = {
        name: form.name,
        description: form.description || undefined,
        minQuantity: form.minQuantity,
        rewardType: form.rewardType,
        isActive: form.isActive,
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
      };
      let reward: Record<string, unknown> = {};
      if (form.rewardType === 'FIXED_DISCOUNT') {
        reward = { discountAmountCents: Number(form.discountAmountCents) };
      } else if (form.rewardType === 'PERCENTAGE_DISCOUNT') {
        reward = { discountBps: Number(form.discountBps) };
      } else {
        // freeVariants (SPECIFIC) is curated separately, on the product/variant
        // detail page, once a trigger with variants is attached.
        reward = {
          freeQty: Number(form.freeQty),
          freeScope: form.freeScope,
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

      <div className="space-y-4 px-4 pb-6">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>

        <p className="text-xs text-muted-foreground rounded-md bg-muted/40 p-2">
          Define the offer here, then attach it to products or specific variants from a
          product&apos;s detail page.
        </p>

        <Field label="Minimum quantity to trigger">
          <Input
            type="number"
            value={form.minQuantity}
            onChange={(e) => setForm({ ...form, minQuantity: Number(e.target.value) })}
          />
        </Field>

        {form.rewardType !== 'FREE_PRODUCT' && (
          <RewardTypeField form={form} setForm={setForm} />
        )}

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
            <div className="grid grid-cols-2 gap-3">
              <RewardTypeField form={form} setForm={setForm} />
              <Field label="Free quantity">
                <Input
                  type="number"
                  value={form.freeQty}
                  onChange={(e) => setForm({ ...form, freeQty: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Free product scope">
              <Select
                value={form.freeScope}
                onValueChange={(v) => setForm({ ...form, freeScope: (v as FreeProductScope) ?? 'SAME' })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAME">Same product/variant purchased</SelectItem>
                  <SelectItem value="ANY_VARIANT">Customer&apos;s choice (any variant of the trigger product)</SelectItem>
                  <SelectItem value="SPECIFIC">Admin choice (one or more variants of the trigger product)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {(form.freeScope === 'ANY_VARIANT' || form.freeScope === 'SPECIFIC') && (
              <p className="text-xs text-muted-foreground rounded-md bg-muted/40 p-2">
                {form.freeScope === 'SPECIFIC'
                  ? 'Attach a trigger product with variants, then choose which of its variants are free from that product’s detail page.'
                  : 'Requires a trigger product that has variants — attach one from that product’s detail page.'}
              </p>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts (optional)">
            <Input
              type="date"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
          </Field>
          <Field label="Ends (optional)">
            <Input
              type="date"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            />
          </Field>
        </div>

        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={save.isPending || !form.name}
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

function RewardTypeField({
  form,
  setForm,
}: {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
}) {
  return (
    <Field label="Reward type">
      <Select
        value={form.rewardType}
        onValueChange={(v) =>
          setForm({ ...form, rewardType: (v as OfferRewardType) ?? 'FIXED_DISCOUNT' })
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="FIXED_DISCOUNT">Fixed discount</SelectItem>
          <SelectItem value="PERCENTAGE_DISCOUNT">Percentage discount</SelectItem>
          <SelectItem value="FREE_PRODUCT">Free product</SelectItem>
        </SelectContent>
      </Select>
    </Field>
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
