'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { ProductImage } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
    <div className="space-y-4">
      {images?.length ? (
        <div className="flex flex-wrap gap-4">
          {images.map((img) => (
            <div key={img.id} className="group relative">
              <Dialog>
                <DialogTrigger
                  render={
                    <button type="button" className="block overflow-hidden rounded border cursor-zoom-in bg-white dark:bg-zinc-950" />
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.altText ?? ''}
                    className="size-32 object-contain transition-transform group-hover:scale-105"
                  />
                </DialogTrigger>
                <DialogContent className="max-w-[90vw] sm:max-w-[90vw] h-[90vh] p-0 overflow-hidden bg-transparent border-0 shadow-none ring-0">
                  <DialogTitle className="sr-only">Image View</DialogTitle>
                  <div className="flex items-center justify-center w-full h-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.altText ?? ''}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <button
                type="button"
                disabled={del.isPending}
                onClick={() => del.mutate(img.id)}
                className="absolute -right-2 -top-2 rounded-full bg-destructive p-1.5 text-white opacity-0 shadow-md transition group-hover:opacity-100 hover:bg-destructive/90"
              >
                <Trash2 className="size-4" />
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
