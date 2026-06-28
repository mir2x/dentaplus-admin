'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Brand, ProductType } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'GENERAL', label: 'General' },
  { value: 'MEDICINE', label: 'Medicine' },
  { value: 'PRESCRIPTION_ONLY', label: 'Prescription Only' },
  { value: 'EQUIPMENT', label: 'Equipment' },
];

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [hasVariant, setHasVariant] = useState(false);
  const [sku, setSku] = useState('');
  const [type, setType] = useState<ProductType>('GENERAL');
  const [brandId, setBrandId] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [regularPrice, setRegularPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: async () => (await api.get('/admin/brands')).data,
  });

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'products');
      const { data } = await api.post('/admin/upload', form);
      setImages((cur) => [...cur, data.url]);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/products', {
        name,
        hasVariant,
        sku: hasVariant ? undefined : sku || undefined,
        type,
        brandId: brandId || undefined,
        shortDescription: shortDesc || undefined,
        description: description || undefined,
        regularPrice: regularPrice ? parseFloat(regularPrice) : 0,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        published,
        featured,
      });
      // Attach any images uploaded on this form now that the product exists.
      for (let i = 0; i < images.length; i++) {
        await api.post(`/admin/products/${data.id}/images`, { url: images[i], position: i });
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success('Product created');
      router.push(`/products/${data.id}`);
    },
    onError: () => toast.error('Could not create product (SKU is required for a no-variant product)'),
  });

  const canSave = name.trim() && (hasVariant || sku.trim());

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <button
          onClick={() => router.push('/products')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="size-3.5" /> All products
        </button>
        <h2 className="text-xl font-semibold">New product</h2>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div className="flex items-center justify-between rounded-md bg-muted/40 p-3">
          <div>
            <p className="text-sm font-medium">Has variants</p>
            <p className="text-xs text-muted-foreground">
              {hasVariant
                ? 'SKUs + QuickBooks items live on each variant (add them after creating).'
                : 'This product is a single SKU and syncs to QuickBooks on save.'}
            </p>
          </div>
          <Switch checked={hasVariant} onCheckedChange={setHasVariant} />
        </div>

        {!hasVariant && (
          <Field label="SKU (required)">
            <Input value={sku} onChange={(e) => setSku(e.target.value)} />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={type} onValueChange={(v) => setType((v ?? 'GENERAL') as ProductType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Brand">
            <Select value={brandId} onValueChange={(v) => setBrandId(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="No brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">No brand</SelectItem>
                {brands?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {!hasVariant && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Regular price ($)">
              <Input type="number" step="0.01" value={regularPrice} onChange={(e) => setRegularPrice(e.target.value)} />
            </Field>
            <Field label="Sale price ($)">
              <Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </Field>
          </div>
        )}

        <Field label="Short description">
          <Textarea rows={2} value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
        </Field>
        <Field label="Full description">
          <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="space-y-2">
          <Label>Images</Label>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((url, i) => (
                <div key={url} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-20 rounded border object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((cur) => cur.filter((_, idx) => idx !== i))}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> {uploading ? 'Uploading…' : 'Upload image'}
          </Button>
          <p className="text-xs text-muted-foreground">Attached to the product after it&apos;s created.</p>
        </div>

        <div className="flex items-center justify-between">
          <Label>Published</Label>
          <Switch checked={published} onCheckedChange={setPublished} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Featured</Label>
          <Switch checked={featured} onCheckedChange={setFeatured} />
        </div>

        <Button disabled={!canSave || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? 'Creating…' : 'Create product'}
        </Button>
      </div>
    </div>
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
