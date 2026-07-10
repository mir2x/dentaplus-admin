'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface StaticBanner {
  quantity: number;
  images: string[];
}

export function StaticBannerView() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Edits overlay the fetched values, so we never copy server state into an effect.
  const [quantity, setQuantity] = useState<number | null>(null);
  const [images, setImages] = useState<string[] | null>(null);

  const { data, isLoading } = useQuery<StaticBanner>({
    queryKey: ['static-banner'],
    queryFn: async () => (await api.get('/admin/static-banner')).data,
  });

  const save = useMutation({
    mutationFn: (body: StaticBanner) => api.patch('/admin/static-banner', body),
    onSuccess: () => {
      toast.success('Static banner saved');
      setQuantity(null);
      setImages(null);
      queryClient.invalidateQueries({ queryKey: ['static-banner'] });
    },
    onError: () => toast.error('Failed to save static banner'),
  });

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'static-banner');
      const { data: uploaded } = await api.post('/admin/upload', form);
      setImages([...currentImages, uploaded.url]);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (isLoading || !data) return <Skeleton className="h-72 w-full max-w-xl" />;

  const currentQuantity = quantity ?? data.quantity;
  const currentImages = images ?? data.images;
  const mismatch = currentImages.length !== currentQuantity;

  function removeImage(index: number) {
    setImages(currentImages.filter((_, i) => i !== index));
  }

  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Static Banner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min={0}
              value={currentQuantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Number of images this banner should display</p>
          </div>

          <div className="space-y-1.5 pt-2 border-t">
            <Label>Images ({currentImages.length})</Label>
            <div className="grid grid-cols-3 gap-3">
              {currentImages.map((url, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-20 w-full rounded border object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-0.5"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-20 w-full items-center justify-center rounded border border-dashed text-muted-foreground hover:bg-muted"
              >
                {uploading ? 'Uploading…' : <Plus className="size-5" />}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleUpload(e.target.files[0]);
              }}
            />
          </div>

          {mismatch && (
            <p className="text-xs text-destructive">
              Image count ({currentImages.length}) must match quantity ({currentQuantity}) before saving.
            </p>
          )}

          <Button
            disabled={save.isPending || mismatch}
            onClick={() => save.mutate({ quantity: currentQuantity, images: currentImages })}
          >
            <Upload className="size-4" />
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
