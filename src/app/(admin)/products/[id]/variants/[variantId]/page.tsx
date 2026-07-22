'use client';

import { use, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { ProductVariantDetail } from '@/types/api';
import { formatCents, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { VariantEditSheet } from '@/components/products/variant-edit-sheet';
import { VariantOffersSection } from '@/components/products/variant-offers-section';
import { WholesaleRulesPanel } from '@/components/products/wholesale-rules-panel';
import { InventoryStatus, statusFromInventory } from '@/components/products/inventory-status-field';

const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  in_stock: 'In stock',
  out_of_stock: 'Out of stock',
  backorder: 'On backorder',
};

export default function VariantDetailPage({
  params,
}: {
  params: Promise<{ id: string; variantId: string }>;
}) {
  const { id: productId, variantId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: variants, isLoading } = useQuery<ProductVariantDetail[]>({
    queryKey: ['variants', productId],
    queryFn: async () => (await api.get(`/admin/products/${productId}/variants`)).data,
  });
  const v = variants?.find((x) => x.id === variantId);

  const del = useMutation({
    mutationFn: () => api.delete(`/admin/variants/${variantId}`),
    onSuccess: () => {
      toast.success('Variant deleted');
      queryClient.invalidateQueries({ queryKey: ['variants', productId] });
      router.push(`/products/${productId}`);
    },
    onError: () => toast.error('Delete failed'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }
  if (!v) return null;

  const title = v.name || v.options.map((o) => o.value).join(' / ') || v.sku || 'Variant';

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push(`/products/${productId}`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="size-3.5" /> Back to product
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">{title}</h2>
            {!v.isActive && <Badge variant="secondary">Inactive</Badge>}
            {v.quickbooksItemId ? (
              <Badge variant="outline">QuickBooks-synced</Badge>
            ) : (
              <Badge variant="secondary">Not synced</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">SKU {v.sku ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="outline" disabled={del.isPending} onClick={() => del.mutate()}>
            {del.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <section className="rounded-lg border p-4">
          <p className="text-sm font-medium mb-3">Details</p>
          <Row label="Name" value={v.name} />
          <Row label="SKU" value={v.sku} />
          <Row label="Regular" value={v.regularCents != null ? formatCents(v.regularCents) : null} />
          <Row label="Sale" value={v.saleCents != null ? formatCents(v.saleCents) : null} />
          <Row label="Stock status" value={INVENTORY_STATUS_LABELS[statusFromInventory(v.inventory)]} />
          {statusFromInventory(v.inventory) === 'in_stock' && (
            <Row label="Quantity" value={v.inventory?.quantity?.toString()} />
          )}
          <Row label="Active" value={v.isActive ? 'Yes' : 'No'} />
        </section>

        <section className="rounded-lg border p-4 space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Thumbnail</p>
            {v.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.thumbnailUrl} alt="" className="size-24 rounded border object-cover" />
            ) : (
              <span className="text-sm text-muted-foreground">No thumbnail</span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Attributes</p>
            {v.options.length ? (
              <div className="flex flex-wrap gap-1.5">
                {v.options.map((o) => (
                  <Badge key={o.attributeName} variant="secondary">
                    {o.attributeName}: {o.value}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">None</span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium mb-2">QuickBooks</p>
            <Row label="Item ID" value={v.quickbooksItemId} />
            <Row label="Synced" value={v.quickbooksSyncedAt ? formatDateTime(v.quickbooksSyncedAt) : 'Never'} />
          </div>
        </section>
      </div>

      <section className="rounded-lg border p-4">
        <p className="text-sm font-medium mb-3">Wholesale pricing</p>
        <WholesaleRulesPanel variantId={variantId} />
      </section>

      <VariantOffersSection variantId={variantId} variants={variants ?? []} />

      <VariantEditSheet
        productId={productId}
        editing={editing ? v : null}
        onClose={() => setEditing(false)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || '—'}</span>
    </div>
  );
}
