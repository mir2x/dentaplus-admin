'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { BackOrder, BackOrderStatus } from '@/types/api';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  backOrderId: string;
}

const STATUS_CONFIG: Record<BackOrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DRAFT:                { label: 'Draft — needs review', variant: 'outline' },
  PROCESSING:           { label: 'Processing',           variant: 'default' },
  PARTIALLY_FULFILLED:  { label: 'Partially Fulfilled',  variant: 'secondary' },
  FULFILLED:            { label: 'Fulfilled',            variant: 'default' },
  CANCELLED:            { label: 'Cancelled',            variant: 'destructive' },
};

interface EditableItem {
  id?: string;
  sku: string;
  name: string;
  quantity: number;
}

export function BackOrderDetailView({ backOrderId }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: bo, isLoading } = useQuery<BackOrder>({
    queryKey: ['back-order', backOrderId],
    queryFn: async () => (await api.get(`/admin/backorders/${backOrderId}`)).data,
    enabled: !!backOrderId,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['back-orders'] });
    queryClient.invalidateQueries({ queryKey: ['back-order', backOrderId] });
  }

  const finalize = useMutation({
    mutationFn: () => api.post(`/admin/backorders/${backOrderId}/finalize`),
    onSuccess: () => {
      toast.success('Finalized — customer can now see this back order');
      invalidate();
    },
    onError: () => toast.error('Failed to finalize — add at least one item first'),
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/admin/backorders/${backOrderId}/cancel`),
    onSuccess: () => {
      toast.success('Back order cancelled');
      invalidate();
    },
    onError: () => toast.error('Failed to cancel'),
  });

  // ── PROCESSING / PARTIALLY_FULFILLED: record shipped quantities ────────────
  const [fulfilled, setFulfilled] = useState<Record<string, number>>({});

  const saveFulfillment = useMutation({
    mutationFn: () =>
      api.patch(`/admin/backorders/${backOrderId}/fulfillment`, {
        items: Object.entries(fulfilled).map(([itemId, fulfilledQty]) => ({ itemId, fulfilledQty })),
      }),
    onSuccess: () => {
      toast.success('Fulfillment recorded');
      invalidate();
      setFulfilled({});
    },
    onError: () => toast.error('Failed to record fulfillment'),
  });

  if (isLoading || !bo) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isDraft = bo.status === 'DRAFT';
  const canRecordFulfillment = bo.status === 'PROCESSING' || bo.status === 'PARTIALLY_FULFILLED';
  const isTerminal = bo.status === 'FULFILLED' || bo.status === 'CANCELLED';

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/back-orders')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{bo.backOrderNo}</h1>
        <Badge className="ml-auto" variant={STATUS_CONFIG[bo.status].variant}>
          {STATUS_CONFIG[bo.status].label}
        </Badge>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="space-y-6 p-6">
          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Order
            </p>
            <div className="space-y-3 text-sm">
              <Row label="Order" value={`#${bo.orderNo}`} />
              <Row
                label="Customer"
                value={bo.customer?.displayName ?? bo.customer?.email ?? null}
              />
              <Row label="Created" value={formatDate(bo.createdAt)} />
            </div>
          </section>

          <Separator />

          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Items
            </p>

            {isDraft ? (
              <DraftItemsEditor
                key={bo.id}
                backOrderId={backOrderId}
                initialItems={bo.items.map((i) => ({
                  id: i.id,
                  sku: i.sku ?? '',
                  name: i.name,
                  quantity: i.quantity,
                }))}
                onSaved={invalidate}
              />
            ) : (
              <div className="space-y-3">
                {bo.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {item.quantity}× {item.name}
                      </p>
                      {item.sku && <p className="text-muted-foreground text-xs">SKU: {item.sku}</p>}
                      <p className="text-muted-foreground text-xs">
                        Shipped: {item.fulfilledQty}/{item.quantity}
                      </p>
                    </div>
                    {canRecordFulfillment && (
                      <Input
                        type="number"
                        min={0}
                        max={item.quantity}
                        className="w-24"
                        defaultValue={item.fulfilledQty}
                        onChange={(e) =>
                          setFulfilled((prev) => ({
                            ...prev,
                            [item.id]: Math.max(0, Math.min(item.quantity, Number(e.target.value) || 0)),
                          }))
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {isDraft && (
          <div className="border-t bg-muted/50 p-6 rounded-b-lg space-y-3">
            <p className="text-sm text-muted-foreground">
              Add/remove items freehand, save, then finalize once this matches what staff and the
              customer settled on — finalizing freezes it and makes it visible to the customer.
            </p>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={bo.items.length === 0 || finalize.isPending}
                onClick={() => finalize.mutate()}
              >
                {finalize.isPending ? 'Finalizing…' : 'Finalize'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                Cancel Back Order
              </Button>
            </div>
          </div>
        )}

        {canRecordFulfillment && (
          <div className="border-t bg-muted/50 p-6 rounded-b-lg space-y-3">
            <Button
              className="w-full"
              disabled={Object.keys(fulfilled).length === 0 || saveFulfillment.isPending}
              onClick={() => saveFulfillment.mutate()}
            >
              {saveFulfillment.isPending ? 'Saving…' : 'Record Fulfillment'}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              Cancel Back Order
            </Button>
          </div>
        )}

        {isTerminal && (
          <div className="border-t bg-muted/50 p-6 rounded-b-lg">
            <p className="text-sm text-muted-foreground">
              This back order is {bo.status === 'FULFILLED' ? 'fully fulfilled' : 'cancelled'} — nothing
              further to do.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Owns its own item-list state, seeded once from `initialItems` via lazy
 * useState init (no effect) — mounted with `key={bo.id}` by the parent so a
 * fresh backorder always gets fresh local state instead of stale edits.
 */
function DraftItemsEditor({
  backOrderId,
  initialItems,
  onSaved,
}: {
  backOrderId: string;
  initialItems: EditableItem[];
  onSaved: () => void;
}) {
  const [items, setItemsState] = useState<EditableItem[]>(initialItems);
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('1');

  const saveItems = useMutation({
    mutationFn: () =>
      api.patch(`/admin/backorders/${backOrderId}/items`, {
        items: items.map((i) => ({ id: i.id, sku: i.sku || undefined, name: i.name, quantity: i.quantity })),
      }),
    onSuccess: () => {
      toast.success('Items saved');
      onSaved();
    },
    onError: () => toast.error('Failed to save items'),
  });

  function addNewItem() {
    const qty = Math.max(1, Number(newQty) || 1);
    if (!newName.trim()) return;
    setItemsState((prev) => [...prev, { sku: newSku.trim(), name: newName.trim(), quantity: qty }]);
    setNewSku('');
    setNewName('');
    setNewQty('1');
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={item.id ?? `new-${idx}`} className="flex items-center gap-2 rounded-md border p-3">
          <div className="flex-1 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_80px]">
            <Input
              value={item.name}
              onChange={(e) =>
                setItemsState((prev) => prev.map((it, i) => (i === idx ? { ...it, name: e.target.value } : it)))
              }
              placeholder="Item name"
            />
            <Input
              value={item.sku}
              onChange={(e) =>
                setItemsState((prev) => prev.map((it, i) => (i === idx ? { ...it, sku: e.target.value } : it)))
              }
              placeholder="SKU"
            />
            <Input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) =>
                setItemsState((prev) =>
                  prev.map((it, i) =>
                    i === idx ? { ...it, quantity: Math.max(1, Number(e.target.value) || 1) } : it,
                  ),
                )
              }
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setItemsState((prev) => prev.filter((_, i) => i !== idx))}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}

      <div className="flex items-center gap-2 rounded-md border border-dashed p-3">
        <div className="flex-1 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_80px]">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New item name" />
          <Input value={newSku} onChange={(e) => setNewSku(e.target.value)} placeholder="SKU" />
          <Input type="number" min={1} value={newQty} onChange={(e) => setNewQty(e.target.value)} />
        </div>
        <Button variant="outline" size="icon" onClick={addNewItem}>
          <Plus className="size-4" />
        </Button>
      </div>

      <Button variant="outline" className="w-full" disabled={saveItems.isPending} onClick={() => saveItems.mutate()}>
        {saveItems.isPending ? 'Saving…' : 'Save Items'}
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 font-medium [overflow-wrap:anywhere]">{value || '—'}</span>
    </div>
  );
}
