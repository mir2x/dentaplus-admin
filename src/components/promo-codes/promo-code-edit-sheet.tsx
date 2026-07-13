'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { DiscountType, PromoCode } from '@/types/api';
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
  editing: PromoCode | 'new' | null;
  onClose: () => void;
}

export function PromoCodeEditSheet({ editing, onClose }: Props) {
  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {editing && (
          // key forces a fresh form (and state) per selection
          <PromoForm
            key={editing === 'new' ? 'new' : editing.id}
            editing={editing}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface FormState {
  code: string;
  type: DiscountType;
  value: number;
  minOrderCents: string;
  maxUses: string;
  expiresAt: string;
  isActive: boolean;
}

function PromoForm({ editing, onClose }: { editing: PromoCode | 'new'; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';

  const [form, setForm] = useState<FormState>(() =>
    isEdit
      ? {
          code: editing.code,
          type: editing.type,
          value: editing.value,
          minOrderCents: editing.minOrder != null ? String(Math.round(editing.minOrder * 100)) : '',
          maxUses: editing.maxUses != null ? String(editing.maxUses) : '',
          expiresAt: editing.expiresAt ? editing.expiresAt.slice(0, 10) : '',
          isActive: editing.isActive,
        }
      : { code: '', type: 'FIXED', value: 0, minOrderCents: '', maxUses: '', expiresAt: '', isActive: true },
  );

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        type: form.type,
        value: form.value,
        minOrderCents: form.minOrderCents ? Number(form.minOrderCents) : undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        isActive: form.isActive,
      };
      return isEdit
        ? api.patch(`/admin/promo-codes/${editing.id}`, payload)
        : api.post('/admin/promo-codes', { ...payload, code: form.code });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Promo code updated' : 'Promo code created');
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      onClose();
    },
    onError: () => toast.error('Save failed (check code is unique)'),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/admin/promo-codes/${(editing as PromoCode).id}`),
    onSuccess: () => {
      toast.success('Promo code deleted');
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      onClose();
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>{isEdit ? `Edit ${editing.code}` : 'New promo code'}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        {!isEdit && (
          <Field label="Code">
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="WELCOME10"
            />
          </Field>
        )}

        <Field label="Type">
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: (v as DiscountType) ?? 'FIXED' })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FIXED">Fixed (cents off)</SelectItem>
              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label={form.type === 'FIXED' ? 'Amount (cents)' : 'Percent (%)'}>
          <Input
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
          />
        </Field>

        <Field label="Minimum order (cents, optional)">
          <Input
            type="number"
            value={form.minOrderCents}
            onChange={(e) => setForm({ ...form, minOrderCents: e.target.value })}
          />
        </Field>

        <Field label="Max uses (optional)">
          <Input
            type="number"
            value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
          />
        </Field>

        <Field label="Expires (optional)">
          <Input
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
        </Field>

        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button className="flex-1" disabled={save.isPending} onClick={() => save.mutate()}>
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
