'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { ProductImage } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function ProductImagesPanel({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: images } = useQuery<ProductImage[]>({
    queryKey: ['product-images', productId],
    queryFn: async () => (await api.get(`/admin/products/${productId}/images`)).data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'products');
      const { data: uploaded } = await api.post('/admin/upload', form);
      await api.post(`/admin/products/${productId}/images`, {
        url: uploaded.url,
        position: images?.length ?? 0,
      });
      toast.success('Image added');
      invalidate();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const del = useMutation({
    mutationFn: (imageId: string) => api.delete(`/admin/product-images/${imageId}`),
    onSuccess: () => {
      toast.success('Image removed');
      invalidate();
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <div className="space-y-2">
      <Label>Images</Label>

      {images?.length ? (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.altText ?? ''}
                className="size-20 rounded border object-cover"
              />
              <button
                type="button"
                disabled={del.isPending}
                onClick={() => del.mutate(img.id)}
                className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No images yet.</p>
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
        <Upload className="size-4" /> {uploading ? 'Uploading…' : 'Upload image'}
      </Button>
    </div>
  );
}
