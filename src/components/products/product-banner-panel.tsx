'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Banner } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Banners are created standalone on the Banners page, then attached here to
 * a single product. A product can also get one uploaded directly.
 */
export function ProductBannerPanel({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickedBannerId, setPickedBannerId] = useState('');

  const { data: banners } = useQuery<Banner[]>({
    queryKey: ['banners'],
    queryFn: async () => (await api.get('/admin/banners')).data,
  });

  const attached = banners?.filter((b) => b.productId === productId) ?? [];
  const unattached = banners?.filter((b) => b.type === 'PRODUCT' && b.productId === null) ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['banners'] });

  const attach = useMutation({
    mutationFn: (bannerId: string) => api.patch(`/admin/banners/${bannerId}`, { productId }),
    onSuccess: () => {
      toast.success('Banner attached');
      setPickedBannerId('');
      refresh();
    },
    onError: () => toast.error('Failed to attach banner'),
  });

  const detach = useMutation({
    mutationFn: (bannerId: string) => api.patch(`/admin/banners/${bannerId}`, { productId: null }),
    onSuccess: () => {
      toast.success('Banner detached');
      refresh();
    },
    onError: () => toast.error('Failed to detach banner'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ bannerId, isActive }: { bannerId: string; isActive: boolean }) =>
      api.patch(`/admin/banners/${bannerId}`, { isActive }),
    onSuccess: refresh,
    onError: () => toast.error('Failed to update banner'),
  });

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'banners');
      const { data: uploaded } = await api.post('/admin/upload', form);
      const label = file.name.replace(/\.[^./]+$/, '');
      await api.post('/admin/banners', {
        imageUrl: uploaded.url,
        productId,
        type: 'PRODUCT',
        label,
      });
      toast.success('Banner added');
      refresh();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-3">
      {attached.length ? (
        <div className="space-y-2">
          {attached.map((b) => (
            <div key={b.id} className="flex items-center gap-2 rounded border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt="" className="h-12 w-24 rounded object-cover" />
              <div className="flex flex-1 items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{b.label || 'Untitled'}</span>
                  <Switch
                    checked={b.isActive}
                    onCheckedChange={(v) => toggleActive.mutate({ bannerId: b.id, isActive: v })}
                  />
                  {b.isActive ? 'Active' : 'Inactive'}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={detach.isPending}
                  onClick={() => detach.mutate(b.id)}
                >
                  <X className="size-3.5" /> Detach
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No banners attached.</p>
      )}

      <div className="space-y-2 rounded-md bg-muted/30 p-3">
        <p className="text-xs font-medium">Attach an existing banner</p>
        <div className="flex gap-2">
          <Select value={pickedBannerId} onValueChange={(v) => setPickedBannerId(v ?? '')}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Choose an unattached banner…" /></SelectTrigger>
            <SelectContent>
              {unattached.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.label || b.imageUrl.split('/').pop()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!pickedBannerId || attach.isPending}
            onClick={() => attach.mutate(pickedBannerId)}
          >
            Attach
          </Button>
        </div>

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
          <Upload className="size-3.5" /> {uploading ? 'Uploading…' : 'Upload new banner'}
        </Button>
      </div>
    </div>
  );
}
