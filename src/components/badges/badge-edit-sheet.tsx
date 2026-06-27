'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ProductBadge, ProductBadgeKind } from '@/types/api';
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

const KIND_OPTIONS: { value: ProductBadgeKind; label: string }[] = [
  { value: 'BEST_SELLER', label: 'Best Seller' },
  { value: 'BULK_SALE', label: 'Bulk Sale' },
  { value: 'SAVE_MORE', label: 'Save More' },
  { value: 'EOF_SALE', label: 'EOF Sale' },
  { value: 'NEW', label: 'New' },
  { value: 'CLEARANCE', label: 'Clearance' },
  { value: 'CUSTOM', label: 'Custom' },
];

interface Props {
  editing: ProductBadge | 'new' | null;
  onClose: () => void;
}

export function BadgeEditSheet({ editing, onClose }: Props) {
  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {editing && (
          <BadgeForm
            key={editing === 'new' ? 'new' : editing.id}
            editing={editing}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function BadgeForm({ editing, onClose }: { editing: ProductBadge | 'new'; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';

  const [label, setLabel] = useState(isEdit ? editing.label : '');
  const [kind, setKind] = useState<ProductBadgeKind>(isEdit ? editing.kind : 'CUSTOM');
  const [color, setColor] = useState(isEdit ? (editing.color ?? '') : '');
  const [priority, setPriority] = useState(isEdit ? String(editing.priority) : '0');
  const [isActive, setIsActive] = useState(isEdit ? editing.isActive : true);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        label,
        kind,
        color: color || undefined,
        priority: Number(priority) || 0,
        isActive,
      };
      return isEdit
        ? api.patch(`/admin/badges/${editing.id}`, payload)
        : api.post('/admin/badges', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Badge updated' : 'Badge created');
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      onClose();
    },
    onError: () => toast.error('Save failed'),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/admin/badges/${(editing as ProductBadge).id}`),
    onSuccess: () => {
      toast.success('Badge deleted');
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      onClose();
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>{isEdit ? `Edit ${editing.label}` : 'New badge'}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Label</Label>
          <Input
            value={label}
            placeholder="e.g. Best Seller"
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Kind</Label>
          <Select value={kind} onValueChange={(v) => setKind((v ?? 'CUSTOM') as ProductBadgeKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                className="h-9 w-12 p-1"
                value={color || '#2563eb'}
                onChange={(e) => setColor(e.target.value)}
              />
              <Input
                value={color}
                placeholder="#2563eb"
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={save.isPending || !label}
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
