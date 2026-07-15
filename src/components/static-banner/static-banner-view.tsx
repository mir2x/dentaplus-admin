'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GripVertical, Plus, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

interface StaticBannerSlide {
  imageUrl: string;
  alt: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

interface StaticBanner {
  slides: StaticBannerSlide[];
}

const EMPTY_SLIDE: StaticBannerSlide = {
  imageUrl: '',
  alt: '',
  title: '',
  description: '',
  ctaLabel: '',
  ctaHref: '',
};

export function StaticBannerView() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Edits overlay the fetched values, so we never copy server state into an effect.
  const [slides, setSlides] = useState<StaticBannerSlide[] | null>(null);

  const { data, isLoading } = useQuery<StaticBanner>({
    queryKey: ['static-banner'],
    queryFn: async () => (await api.get('/admin/static-banner')).data,
  });

  const save = useMutation({
    mutationFn: (body: StaticBanner) => api.patch('/admin/static-banner', body),
    onSuccess: () => {
      toast.success('Static banner saved');
      setSlides(null);
      queryClient.invalidateQueries({ queryKey: ['static-banner'] });
    },
    onError: () => toast.error('Failed to save static banner'),
  });

  if (isLoading || !data) return <Skeleton className="h-72 w-full max-w-2xl" />;

  const currentSlides = (slides ?? data.slides).map((s) => ({ ...s, description: s.description ?? '' }));
  const incomplete = currentSlides.some((s) => !s.imageUrl);

  function updateSlide(index: number, patch: Partial<StaticBannerSlide>) {
    setSlides(currentSlides.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeSlide(index: number) {
    setSlides(currentSlides.filter((_, i) => i !== index));
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      // Reuses the "banners" S3 prefix — that's the one already public-readable
      // in the bucket policy; "static-banner" isn't allowlisted there.
      form.append('folder', 'banners');
      const { data: uploaded } = await api.post('/admin/upload', form);
      setSlides([...currentSlides, { ...EMPTY_SLIDE, imageUrl: uploaded.url }]);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Static Banner (Hero Carousel)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {currentSlides.map((slide, i) => (
              <div key={i} className="flex gap-3 rounded border p-3">
                <div className="flex flex-col items-center gap-2 pt-1 text-muted-foreground">
                  <GripVertical className="size-4" />
                  <span className="text-xs">{i + 1}</span>
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.imageUrl}
                  alt=""
                  className="h-24 w-32 shrink-0 rounded border object-cover"
                />

                <div className="grid flex-1 grid-cols-2 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label>Title</Label>
                    <Input
                      value={slide.title}
                      onChange={(e) => updateSlide(i, { title: e.target.value })}
                      placeholder="Professional Dental Supplies for Modern Practices"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Description</Label>
                    <Textarea
                      rows={2}
                      value={slide.description}
                      onChange={(e) => updateSlide(i, { description: e.target.value })}
                      placeholder="Short supporting text shown under the title"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>CTA label</Label>
                    <Input
                      value={slide.ctaLabel}
                      onChange={(e) => updateSlide(i, { ctaLabel: e.target.value })}
                      placeholder="Shop Now"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>CTA link</Label>
                    <Input
                      value={slide.ctaHref}
                      onChange={(e) => updateSlide(i, { ctaHref: e.target.value })}
                      placeholder="/shop"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Image alt text</Label>
                    <Input
                      value={slide.alt}
                      onChange={(e) => updateSlide(i, { alt: e.target.value })}
                      placeholder="Dental instruments held by a gloved hand"
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => removeSlide(i)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-16 w-full items-center justify-center gap-2 rounded border border-dashed text-muted-foreground hover:bg-muted"
            >
              {uploading ? 'Uploading…' : (
                <>
                  <Plus className="size-4" /> Add slide
                </>
              )}
            </button>
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

          {incomplete && (
            <p className="text-xs text-destructive">Every slide needs an image before saving.</p>
          )}

          <Button
            disabled={save.isPending || incomplete}
            onClick={() => save.mutate({ slides: currentSlides })}
          >
            <Upload className="size-4" />
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
