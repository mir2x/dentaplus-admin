'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Product, ProductType } from '@/types/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatCents } from '@/lib/format';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'GENERAL', label: 'General' },
  { value: 'MEDICINE', label: 'Medicine' },
  { value: 'PRESCRIPTION_ONLY', label: 'Prescription Only' },
  { value: 'EQUIPMENT', label: 'Equipment' },
];

const TYPE_LABELS: Record<ProductType, string> = {
  GENERAL: 'General',
  MEDICINE: 'Medicine',
  PRESCRIPTION_ONLY: 'Rx Only',
  EQUIPMENT: 'Equipment',
};

function getRegularPrice(product: Product): number | null {
  return product.prices.find((p) => p.type === 'REGULAR')?.amountCents ?? null;
}

function getSalePrice(product: Product): number | null {
  return product.prices.find((p) => p.type === 'SALE')?.amountCents ?? null;
}

function getCurrency(product: Product): string {
  return product.prices[0]?.currency ?? 'AUD';
}

export function ProductsView() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [sku, setSku] = useState('');
  const [skuLoading, setSkuLoading] = useState(false);

  async function findBySku() {
    const value = sku.trim();
    if (!value) return;
    setSkuLoading(true);
    try {
      const { data } = await api.get(`/admin/products/by-sku/${encodeURIComponent(value)}`);
      router.push(`/products/${data.id}`);
      setSku('');
    } catch {
      toast.error(`No product found for SKU "${value}"`);
    } finally {
      setSkuLoading(false);
    }
  }

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products', type],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (type !== 'all') params.type = type;
      const { data } = await api.get('/admin/products', { params });
      return data;
    },
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      api.patch(`/admin/products/${id}`, { published }),
    onSuccess: (_, { published }) => {
      toast.success(published ? 'Product published' : 'Product unpublished');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Failed to update product'),
  });

  const filtered = products?.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku?.toLowerCase().includes(q) ?? false) ||
      (p.brand?.name.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search name, SKU or brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={type} onValueChange={(v) => setType(v ?? 'all')}>
          <SelectTrigger className="w-52">
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

        <div className="ml-auto flex items-center gap-2">
          <Input
            placeholder="Open by exact SKU…"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && findBySku()}
            className="w-44"
          />
          <Button variant="outline" disabled={skuLoading || !sku.trim()} onClick={findBySku}>
            {skuLoading ? 'Finding…' : 'Find'}
          </Button>
          <Button onClick={() => router.push('/products/new')}>
            <Plus className="size-4" /> New product
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-center">Published</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : filtered?.map((product) => {
                  const regular = getRegularPrice(product);
                  const sale = getSalePrice(product);
                  const currency = getCurrency(product);
                  const firstCategory = product.categories[0]?.category;

                  return (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/products/${product.id}`)}
                    >
                      <TableCell className="font-medium max-w-56">
                        <div className="flex items-center gap-2">
                          {product.images?.[0]?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.images[0].url}
                              alt=""
                              className="size-8 shrink-0 rounded border object-cover"
                            />
                          ) : (
                            <div className="size-8 shrink-0 rounded border bg-muted" />
                          )}
                          <div className="truncate">{product.name}</div>
                        </div>
                        <div className="flex gap-1 mt-0.5">
                          {!product.published && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              Draft
                            </Badge>
                          )}
                          {product.quickbooksItemId && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              QBO
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {product.sku ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.brand?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {firstCategory?.name ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABELS[product.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {product.inventory ? (
                          product.inventory.inStock ? (
                            <span className="text-sm text-green-600">
                              {product.inventory.quantity != null
                                ? product.inventory.quantity
                                : 'In stock'}
                            </span>
                          ) : (
                            <span className="text-sm text-destructive">Out</span>
                          )
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {sale != null ? (
                          <span className="space-x-1">
                            <span className="font-medium text-primary">
                              {formatCents(sale, currency)}
                            </span>
                            <span className="text-muted-foreground line-through text-xs">
                              {formatCents(regular ?? 0, currency)}
                            </span>
                          </span>
                        ) : regular != null ? (
                          <span className="font-medium">
                            {formatCents(regular, currency)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell
                        className="text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Switch
                          checked={product.published}
                          onCheckedChange={(checked) =>
                            togglePublish.mutate({ id: product.id, published: checked })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
