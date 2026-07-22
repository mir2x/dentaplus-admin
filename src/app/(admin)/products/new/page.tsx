'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Category, Collection, ProductType } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
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

const CATALOG_VISIBILITY_OPTIONS = [
  { value: 'visible', label: 'Visible (catalog & search)' },
  { value: 'catalog', label: 'Catalog only' },
  { value: 'search', label: 'Search only' },
  { value: 'loyal_customer', label: 'Loyal customers only' },
  { value: 'hidden', label: 'Hidden' },
];

const TAX_STATUS_OPTIONS = [
  { value: 'taxable', label: 'Taxable' },
  { value: 'shipping', label: 'Shipping only' },
  { value: 'none', label: 'None' },
];

// Passed to <Select items> so the trigger shows the label immediately on
// first render, instead of the raw value until the popup has opened once
// (see InventoryStatusField for the full explanation).
function toSelectItems<T extends string>(options: { value: T; label: string }[]): Record<T, string> {
  return Object.fromEntries(options.map((o) => [o.value, o.label])) as Record<T, string>;
}
const TYPE_ITEMS = toSelectItems(TYPE_OPTIONS);
const CATALOG_VISIBILITY_ITEMS = toSelectItems(CATALOG_VISIBILITY_OPTIONS);
const TAX_STATUS_ITEMS = toSelectItems(TAX_STATUS_OPTIONS);

export default function NewProductPage() {
  const router = useRouter();

  // Core
  const [name, setName] = useState('');
  const [hasVariant, setHasVariant] = useState(false);
  const [sku, setSku] = useState('');
  const [gtin, setGtin] = useState('');
  const [type, setType] = useState<ProductType>('GENERAL');
  const [brand, setBrand] = useState('');

  // Pricing
  const [regularPrice, setRegularPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');

  // Descriptions
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');

  // Tax
  const [taxStatus, setTaxStatus] = useState('taxable');
  const [taxClass, setTaxClass] = useState('');

  // Visibility & flags
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [catalogVisibility, setCatalogVisibility] = useState('visible');
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [allowReviews, setAllowReviews] = useState(true);
  const [position, setPosition] = useState('');

  // Images
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/admin/categories')).data,
  });
  const { data: collections } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: async () => (await api.get('/admin/collections')).data,
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
        gtin: gtin || undefined,
        type,
        brand: brand || undefined,
        shortDescription: shortDesc || undefined,
        description: description || undefined,
        ...(hasVariant
          ? {}
          : {
              regularPrice: regularPrice ? parseFloat(regularPrice) : 0,
              salePrice: salePrice ? parseFloat(salePrice) : undefined,
            }),
        catalogVisibility,
        taxStatus,
        taxClass: taxClass || undefined,
        requiresPrescription,
        allowReviews,
        position: position ? parseInt(position, 10) : undefined,
        published,
        featured,
      });
      for (let i = 0; i < images.length; i++) {
        await api.post(`/admin/products/${data.id}/images`, { url: images[i], position: i });
      }
      if (categoryIds.length > 0) {
        await api.put(`/admin/products/${data.id}/categories`, { categoryIds });
      }
      if (collectionIds.length > 0) {
        await api.put(`/admin/products/${data.id}/collections`, { collectionIds });
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
        {/* ── Identity ── */}
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

        <Field label="GTIN / EAN / Barcode">
          <Input value={gtin} onChange={(e) => setGtin(e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Type">
            <Select items={TYPE_ITEMS} value={type} onValueChange={(v) => setType((v ?? 'GENERAL') as ProductType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Brand">
            <Input placeholder="e.g. Colgate" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </Field>
        </div>

        {/* ── Categories ── */}
        <div className="space-y-1.5">
          <Label>Categories</Label>
          {categories?.length ? (
            <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <CategoryRow
                    id={cat.id}
                    name={cat.name}
                    selected={categoryIds.includes(cat.id)}
                    onToggle={(id) =>
                      setCategoryIds((cur) =>
                        cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
                      )
                    }
                  />
                  {cat.children.map((child) => (
                    <CategoryRow
                      key={child.id}
                      id={child.id}
                      name={child.name}
                      selected={categoryIds.includes(child.id)}
                      indent
                      onToggle={(id) =>
                        setCategoryIds((cur) =>
                          cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
                        )
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No categories found.</p>
          )}
        </div>

        {/* ── Collections ── */}
        <div className="space-y-1.5">
          <Label>Collections</Label>
          {collections?.length ? (
            <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
              {collections.map((c) => (
                <CategoryRow
                  key={c.id}
                  id={c.id}
                  name={c.title}
                  selected={collectionIds.includes(c.id)}
                  onToggle={(id) =>
                    setCollectionIds((cur) =>
                      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No collections found.</p>
          )}
        </div>

        {/* ── Pricing ── */}
        {!hasVariant && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Regular price ($)">
              <Input type="number" step="0.01" value={regularPrice} onChange={(e) => setRegularPrice(e.target.value)} />
            </Field>
            <Field label="Sale price ($)">
              <Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </Field>
          </div>
        )}

        {/* ── Descriptions ── */}
        <Field label="Short description">
          <RichTextEditor value={shortDesc} onChange={setShortDesc} minHeight="6rem" />
        </Field>
        <Field label="Full description">
          <RichTextEditor value={description} onChange={setDescription} minHeight="10rem" />
        </Field>

        {/* ── Tax ── */}
        <div className="border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Tax</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Tax status">
              <Select items={TAX_STATUS_ITEMS} value={taxStatus} onValueChange={(v) => setTaxStatus(v ?? 'taxable')}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TAX_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tax class">
              <Input placeholder="e.g. standard" value={taxClass} onChange={(e) => setTaxClass(e.target.value)} />
            </Field>
          </div>
        </div>

        {/* ── Images ── */}
        <div className="border-t pt-4 space-y-2">
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

        {/* ── Visibility & flags ── */}
        <div className="border-t pt-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Visibility & flags</p>
          <div className="flex items-center justify-between">
            <Label>Published</Label>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Featured</Label>
            <Switch checked={featured} onCheckedChange={setFeatured} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Requires prescription</Label>
              <p className="text-xs text-muted-foreground">Customers must upload a script to purchase</p>
            </div>
            <Switch checked={requiresPrescription} onCheckedChange={setRequiresPrescription} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Allow reviews</Label>
            <Switch checked={allowReviews} onCheckedChange={setAllowReviews} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Catalog visibility">
              <Select
                items={CATALOG_VISIBILITY_ITEMS}
                value={catalogVisibility}
                onValueChange={(v) => setCatalogVisibility(v ?? 'visible')}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="min-w-72 p-2">
                  {CATALOG_VISIBILITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="py-2.5 my-0.5">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sort position">
              <Input type="number" min="0" step="1" placeholder="0" value={position} onChange={(e) => setPosition(e.target.value)} />
            </Field>
          </div>
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

function CategoryRow({
  id,
  name,
  selected,
  indent = false,
  onToggle,
}: {
  id: string;
  name: string;
  selected: boolean;
  indent?: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <label
      className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40 ${indent ? 'pl-7' : ''}`}
    >
      <input
        type="checkbox"
        className="accent-primary"
        checked={selected}
        onChange={() => onToggle(id)}
      />
      {name}
    </label>
  );
}
