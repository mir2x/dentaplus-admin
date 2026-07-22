'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { Banner, BannerType } from '@/types/api';
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

const TYPE_OPTIONS: { value: BannerType; label: string }[] = [
  { value: 'PRODUCT', label: 'Product' },
  { value: 'PAGE', label: 'Page' },
];

interface Props {
  editing: Banner | 'new' | null;
  onClose: () => void;
}

export function BannerEditSheet({ editing, onClose }: Props) {
  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {editing && (
          <BannerForm key={editing === 'new' ? 'new' : editing.id} editing={editing} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function BannerForm({ editing, onClose }: { editing: Banner | 'new'; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';
  const fileRef = useRef<HTMLInputElement>(null);

  const [label, setLabel] = useState(isEdit ? editing.label : '');
  const [type, setType] = useState<BannerType>(isEdit ? editing.type : 'PRODUCT');
  const [path, setPath] = useState(isEdit ? (editing.path ?? '') : '');
  const [imageUrl, setImageUrl] = useState(isEdit ? editing.imageUrl : '');
  const [priority, setPriority] = useState(isEdit ? String(editing.priority) : '0');
  const [isActive, setIsActive] = useState(isEdit ? editing.isActive : true);
  const [uploading, setUploading] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['banners'] });

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'banners');
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
        imageUrl,
        type,
        priority: Number(priority) || 0,
        isActive,
        ...(type === 'PAGE' ? { path } : {}),
      };
      return isEdit
        ? api.patch(`/admin/banners/${editing.id}`, payload)
        : api.post('/admin/banners', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Banner updated' : 'Banner created');
      refresh();
      onClose();
    },
    onError: () => toast.error('Save failed'),
  });

  const detach = useMutation({
    mutationFn: () => api.patch(`/admin/banners/${(editing as Banner).id}`, { productId: null }),
    onSuccess: () => {
      toast.success('Detached from product');
      refresh();
      onClose();
    },
    onError: () => toast.error('Failed to detach'),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/admin/banners/${(editing as Banner).id}`),
    onSuccess: () => {
      toast.success('Banner deleted');
      refresh();
      onClose();
    },
    onError: () => toast.error('Delete failed'),
  });

  const canSave = !!imageUrl && !!label && (type === 'PRODUCT' || !!path.trim());

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>{isEdit ? 'Edit banner' : 'New banner'}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        <div className="space-y-1.5">
          <Label>Label</Label>
          <Input
            value={label}
            placeholder="e.g. Winter sale hero"
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType((v ?? 'PRODUCT') as BannerType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Image</Label>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-28 w-full rounded border object-cover" />
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
            <Upload className="size-4" /> {uploading ? 'Uploading…' : imageUrl ? 'Replace image' : 'Upload image'}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Input
            type="number"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Higher priority banners show first.</p>
        </div>

        {type === 'PAGE' ? (
          <div className="space-y-1.5">
            <Label>Page path</Label>
            <Input
              value={path}
              placeholder="e.g. categories/test"
              onChange={(e) => setPath(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The storefront path this banner links to, without the domain (e.g. &quot;categories/test&quot;).
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Attached product</Label>
            {isEdit && editing.product ? (
              <div className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm">
                <span className="truncate font-medium">{editing.product.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={detach.isPending}
                  onClick={() => detach.mutate()}
                >
                  Detach
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Not attached. Attach it from the product&apos;s edit page.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={save.isPending || !canSave}
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
