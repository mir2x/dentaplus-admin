'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Product, Brand, ProductType } from '@/types/api';
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
  return (
    <Sheet open={!!product} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {product && <ProductForm key={product.id} product={product} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function ProductForm({ product, onClose }: { product: Product; onClose: () => void }) {
  const queryClient = useQueryClient();
  // When synced from QuickBooks, the core fields are read-only (QBO owns them).
  const isQbo = !!product.quickbooksItemId;
  const currency = product.prices[0]?.currency ?? 'AUD';
  const regular = product.prices.find((p) => p.type === 'REGULAR');
  const sale = product.prices.find((p) => p.type === 'SALE');

  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku ?? '');
  const [type, setType] = useState<ProductType>(product.type);
  const [published, setPublished] = useState(product.published);
  const [featured, setFeatured] = useState(product.featured);
  const [shortDesc, setShortDesc] = useState(product.shortDescription ?? '');
  const [brandId, setBrandId] = useState(product.brand?.id ?? '');
  const [regularPrice, setRegularPrice] = useState(regular ? (regular.amountCents / 100).toFixed(2) : '');
  const [salePrice, setSalePrice] = useState(sale ? (sale.amountCents / 100).toFixed(2) : '');
  const [stock, setStock] = useState(product.inventory?.quantity?.toString() ?? '');

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: async () => (await api.get('/admin/brands')).data,
  });

  const save = useMutation({
    mutationFn: () => {
      // Storefront-only fields are always editable. QBO-owned fields are only
      // sent for non-QBO products so a sync never gets overwritten from here.
      const storefront = {
        type,
        published,
        featured,
        shortDescription: shortDesc || undefined,
        brandId: brandId || undefined,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
      };
      const core = isQbo
        ? {}
        : {
            name,
            sku: sku || undefined,
            regularPrice: regularPrice ? parseFloat(regularPrice) : undefined,
            stockQuantity: stock !== '' ? parseInt(stock, 10) : undefined,
          };
      return api.patch(`/admin/products/${product.id}`, { ...storefront, ...core });
    },
    onSuccess: () => {
      toast.success('Product saved');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: () => toast.error('Failed to save product'),
  });

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>Edit Product</SheetTitle>
        <div className="flex gap-2 mt-1 flex-wrap">
          {!product.published && <Badge variant="secondary" className="text-xs">Draft</Badge>}
          {isQbo && <Badge variant="outline" className="text-xs">QuickBooks-synced</Badge>}
          {product.categories.slice(0, 3).map(({ category }) => (
            <Badge key={category.id} variant="secondary" className="text-xs">
              {category.name}
            </Badge>
          ))}
        </div>
      </SheetHeader>

      <div className="space-y-4">
        {isQbo && (
          <p className="text-xs text-muted-foreground rounded-md bg-muted/50 p-2">
            Name, SKU, price and stock are managed in QuickBooks and synced here. Edit the
            storefront fields (type, brand, sale price, description, visibility) to complete this
            product.
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="p-name">Name</Label>
          <Input id="p-name" value={name} disabled={isQbo} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-sku">SKU</Label>
            <Input id="p-sku" value={sku} disabled={isQbo} onChange={(e) => setSku(e.target.value)} />
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
          <Textarea id="p-desc" rows={2} value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
        </div>

        <Separator />

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-regular">Regular ({currency})</Label>
            <Input
              id="p-regular"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={regularPrice}
              disabled={isQbo}
              onChange={(e) => setRegularPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-sale">Sale ({currency})</Label>
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
            <Label htmlFor="p-stock">Stock</Label>
            <Input
              id="p-stock"
              type="number"
              placeholder="—"
              value={stock}
              disabled={isQbo}
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

        <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </>
  );
}
