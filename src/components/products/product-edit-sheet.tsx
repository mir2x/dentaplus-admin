'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Product, Brand, ProductType } from '@/types/api';
import { formatCents } from '@/lib/format';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'GENERAL', label: 'General' },
  { value: 'MEDICINE', label: 'Medicine' },
  { value: 'PRESCRIPTION_ONLY', label: 'Prescription Only' },
  { value: 'EQUIPMENT', label: 'Equipment' },
];

interface Props {
  product: Product | null;
  onClose: () => void;
}

export function ProductEditSheet({ product, onClose }: Props) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [type, setType] = useState<ProductType>('GENERAL');
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [shortDesc, setShortDesc] = useState('');
  const [brandId, setBrandId] = useState('');
  const [regularPrice, setRegularPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stock, setStock] = useState('');

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data } = await api.get('/admin/brands');
      return data;
    },
  });

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setSku(product.sku ?? '');
    setType(product.type);
    setPublished(product.published);
    setFeatured(product.featured);
    setShortDesc(product.shortDescription ?? '');
    setBrandId(product.brand?.id ?? '');
    const regular = product.prices.find((p) => p.type === 'REGULAR');
    const sale = product.prices.find((p) => p.type === 'SALE');
    setRegularPrice(regular ? (regular.amountCents / 100).toFixed(2) : '');
    setSalePrice(sale ? (sale.amountCents / 100).toFixed(2) : '');
    setStock(product.inventory?.quantity?.toString() ?? '');
  }, [product]);

  async function handleSave() {
    if (!product) return;
    setSaving(true);
    try {
      await api.patch(`/admin/products/${product.id}`, {
        name,
        sku: sku || undefined,
        type,
        published,
        featured,
        shortDescription: shortDesc || undefined,
        brandId: brandId || undefined,
        regularPrice: regularPrice ? parseFloat(regularPrice) : undefined,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        stockQuantity: stock !== '' ? parseInt(stock, 10) : undefined,
      });
      toast.success('Product saved');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    } catch {
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  const currency = product?.prices[0]?.currency ?? 'AUD';

  return (
    <Sheet open={!!product} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {product && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle>Edit Product</SheetTitle>
              <div className="flex gap-2 mt-1 flex-wrap">
                {product.categories.slice(0, 3).map(({ category }) => (
                  <Badge key={category.id} variant="secondary" className="text-xs">
                    {category.name}
                  </Badge>
                ))}
              </div>
            </SheetHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">Name</Label>
                <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-sku">SKU</Label>
                  <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType((v ?? 'GENERAL') as ProductType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Select value={brandId} onValueChange={(v) => setBrandId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="No brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No brand</SelectItem>
                    {brands?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-desc">Short Description</Label>
                <Textarea
                  id="p-desc"
                  rows={2}
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-regular">Regular Price ({currency})</Label>
                  <Input
                    id="p-regular"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={regularPrice}
                    onChange={(e) => setRegularPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-sale">Sale Price ({currency})</Label>
                  <Input
                    id="p-sale"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-stock">Stock Qty</Label>
                  <Input
                    id="p-stock"
                    type="number"
                    placeholder="—"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Published</p>
                  <p className="text-xs text-muted-foreground">Visible in store</p>
                </div>
                <Switch checked={published} onCheckedChange={setPublished} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Featured</p>
                  <p className="text-xs text-muted-foreground">Show in featured section</p>
                </div>
                <Switch checked={featured} onCheckedChange={setFeatured} />
              </div>

              <Button className="w-full" disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
