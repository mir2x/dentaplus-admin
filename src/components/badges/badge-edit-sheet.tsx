'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, X } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
  const [imageUrl, setImageUrl] = useState(isEdit ? (editing.imageUrl ?? '') : '');
  const [priority, setPriority] = useState(isEdit ? String(editing.priority) : '0');
  const [isActive, setIsActive] = useState(isEdit ? editing.isActive : true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'badges');
      const { data: uploaded } = await api.post('/admin/upload', form);
      setImageUrl(uploaded.url);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        label,
        kind,
        color: color || undefined,
        imageUrl: imageUrl || undefined,
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

      <div className="space-y-4 px-4 pb-6">
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        <div className="space-y-1.5">
          <Label>Image</Label>
          <div className="flex items-center gap-3">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={label} className="size-12 rounded border object-cover" />
            ) : (
              <div className="flex size-12 items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
                None
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" /> {uploading ? 'Uploading…' : imageUrl ? 'Replace' : 'Upload'}
            </Button>
            {imageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => setImageUrl('')}
              >
                <X className="size-4" />
              </Button>
            )}
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

        {isEdit && <BadgeProducts badgeId={(editing as ProductBadge).id} />}
      </div>
    </>
  );
}

function BadgeProducts({ badgeId }: { badgeId: string }) {
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery<
    { id: string; name: string; sku: string | null; slug: string }[]
  >({
    queryKey: ['badge-products', badgeId],
    queryFn: () => api.get(`/admin/badges/${badgeId}/products`).then((r) => r.data),
  });

  const detach = useMutation({
    mutationFn: (productId: string) =>
      api.delete(`/admin/products/${productId}/badges/${badgeId}`),
    onSuccess: () => {
      toast.success('Removed from product');
      void queryClient.invalidateQueries({ queryKey: ['badge-products', badgeId] });
      void queryClient.invalidateQueries({ queryKey: ['badges'] });
    },
    onError: () => toast.error('Failed to remove'),
  });

  return (
    <>
      <Separator className="my-4" />
      <div className="space-y-2">
        <p className="text-sm font-medium">
          Attached products {products ? `(${products.length})` : ''}
        </p>
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        )}
        {products?.length === 0 && (
          <p className="text-sm text-muted-foreground">No products attached.</p>
        )}
        {products?.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm">
            <span className="truncate font-medium">{p.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
              disabled={detach.isPending}
              onClick={() => detach.mutate(p.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
