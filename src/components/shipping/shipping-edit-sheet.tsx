'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ShippingMethod } from '@/types/api';
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

interface Props {
  editing: ShippingMethod | 'new' | null;
  onClose: () => void;
}

export function ShippingEditSheet({ editing, onClose }: Props) {
  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {editing && (
          <ShippingForm
            key={editing === 'new' ? 'new' : editing.id}
            editing={editing}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function dollars(cents: number | null | undefined): string {
  return cents != null ? (cents / 100).toFixed(2) : '';
}

function ShippingForm({ editing, onClose }: { editing: ShippingMethod | 'new'; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';

  const [name, setName] = useState(isEdit ? editing.name : '');
  const [description, setDescription] = useState(isEdit ? (editing.description ?? '') : '');
  const [state, setState] = useState(isEdit ? (editing.state ?? '') : '');
  const [postcodes, setPostcodes] = useState(isEdit ? (editing.postcodes ?? '') : '');
  const [priority, setPriority] = useState(isEdit ? String(editing.priority) : '0');
  const [rate, setRate] = useState(isEdit ? dollars(editing.rateCents) : '');
  const [freeOver, setFreeOver] = useState(isEdit ? dollars(editing.freeThresholdCents) : '');
  const [sortOrder, setSortOrder] = useState(isEdit ? String(editing.sortOrder) : '0');
  const [isActive, setIsActive] = useState(isEdit ? editing.isActive : true);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || undefined,
        country: 'AU',
        state: state.trim() || undefined,
        postcodes: postcodes.trim() || undefined,
        priority: Number(priority) || 0,
        rateCents: Math.round(parseFloat(rate || '0') * 100),
        freeThresholdCents: freeOver ? Math.round(parseFloat(freeOver) * 100) : undefined,
        sortOrder: Number(sortOrder) || 0,
        isActive,
      };
      return isEdit
        ? api.patch(`/admin/shipping-methods/${editing.id}`, payload)
        : api.post('/admin/shipping-methods', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Method updated' : 'Method created');
      queryClient.invalidateQueries({ queryKey: ['shipping-methods'] });
      onClose();
    },
    onError: () => toast.error('Save failed'),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/admin/shipping-methods/${(editing as ShippingMethod).id}`),
    onSuccess: () => {
      toast.success('Method deleted');
      queryClient.invalidateQueries({ queryKey: ['shipping-methods'] });
      onClose();
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>{isEdit ? `Edit ${editing.name}` : 'New shipping method'}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        <Field label="Name">
          <Input value={name} placeholder="e.g. Standard" onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Description (optional)">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="rounded-md bg-muted/40 p-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Match the delivery address. Leave both blank for a whole-Australia zone. The most
            specific matching zone (highest priority) wins.
          </p>
          <Field label="State (optional, e.g. NSW)">
            <Input value={state} placeholder="Leave blank for any state" onChange={(e) => setState(e.target.value)} />
          </Field>
          <Field label="Postcodes (optional)">
            <Input
              value={postcodes}
              placeholder="e.g. 2000-2234, 2555-2574"
              onChange={(e) => setPostcodes(e.target.value)}
            />
          </Field>
          <Field label="Priority (higher wins)">
            <Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Rate ($)">
            <Input
              type="number"
              step="0.01"
              placeholder="15.00"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </Field>
          <Field label="Free over ($, optional)">
            <Input
              type="number"
              step="0.01"
              placeholder="200.00"
              value={freeOver}
              onChange={(e) => setFreeOver(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Sort order">
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </Field>

        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={save.isPending || !name}
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
