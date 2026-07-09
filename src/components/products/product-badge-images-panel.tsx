'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { ProductBadgeAssignment } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

/**
 * Manages per-product images for already-assigned badges. Assignment
 * membership itself is toggled elsewhere (Badges / Stickers panel) and must
 * be saved before an image can be uploaded for a newly-added badge.
 */
export function ProductBadgeImagesPanel({ productId }: { productId: string }) {
  const queryClient = useQueryClient();

  const { data: assignments } = useQuery<ProductBadgeAssignment[]>({
    queryKey: ['product-badges', productId],
    queryFn: async () => (await api.get(`/admin/products/${productId}/badges`)).data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['product-badges', productId] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['product', productId] });
  };

  const setImage = useMutation({
    mutationFn: ({ badgeId, imageUrl }: { badgeId: string; imageUrl: string | null }) =>
      api.put(`/admin/products/${productId}/badges/${badgeId}/image`, { imageUrl }),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to update badge image'),
  });

  if (!assignments?.length) {
    return (
      <p className="text-xs text-muted-foreground">
        No badges assigned yet — assign badges above and save first.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Badge images</Label>
      <div className="flex flex-wrap gap-3">
        {assignments.map((a) => (
          <BadgeImageSlot
            key={a.id}
            badge={a}
            uploading={setImage.isPending && setImage.variables?.badgeId === a.id}
            onUpload={(url) => setImage.mutate({ badgeId: a.id, imageUrl: url })}
            onClear={() => setImage.mutate({ badgeId: a.id, imageUrl: null })}
          />
        ))}
      </div>
    </div>
  );
}

function BadgeImageSlot({
  badge,
  uploading,
  onUpload,
  onClear,
}: {
  badge: ProductBadgeAssignment;
  uploading: boolean;
  onUpload: (url: string) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [localUploading, setLocalUploading] = useState(false);

  async function handleFile(file: File) {
    setLocalUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'badges');
      const { data: uploaded } = await api.post('/admin/upload', form);
      onUpload(uploaded.url);
    } catch {
      toast.error('Upload failed');
    } finally {
      setLocalUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const busy = uploading || localUploading;

  return (
    <div className="flex flex-col items-center gap-1.5 rounded-md border p-2 text-center">
      <span
        className="rounded-full px-2 py-0.5 text-xs text-white"
        style={{ backgroundColor: badge.color ?? '#2563eb' }}
      >
        {badge.label}
      </span>

      {badge.imageUrl ? (
        <div className="group relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={badge.imageUrl} alt={badge.label} className="size-16 rounded border object-cover" />
          <button
            type="button"
            disabled={busy}
            onClick={onClear}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white opacity-0 transition group-hover:opacity-100"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <div className="flex size-16 items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
          No image
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
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="size-3" /> {busy ? 'Uploading…' : badge.imageUrl ? 'Replace' : 'Upload'}
      </Button>
    </div>
  );
}
