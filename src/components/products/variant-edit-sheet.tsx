'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Attribute, ProductVariantDetail } from '@/types/api';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  InventoryStatus,
  InventoryStatusField,
  resolveInventoryPayload,
  statusFromInventory,
} from '@/components/products/inventory-status-field';

interface Props {
  productId: string;
  editing: ProductVariantDetail | 'new' | null;
  onClose: () => void;
}

export function VariantEditSheet({ productId, editing, onClose }: Props) {
  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {editing && (
          <VariantForm
            key={editing === 'new' ? 'new' : editing.id}
            productId={productId}
            editing={editing}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

type Option = { attributeName: string; value: string };

function VariantForm({
  productId,
  editing,
  onClose,
}: {
  productId: string;
  editing: ProductVariantDetail | 'new';
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [sku, setSku] = useState(isEdit ? (editing.sku ?? '') : '');
  const [name, setName] = useState(isEdit ? (editing.name ?? '') : '');
  const [regularPrice, setRegularPrice] = useState(
    isEdit && editing.regularCents != null ? (editing.regularCents / 100).toFixed(2) : '',
  );
  const [salePrice, setSalePrice] = useState(
    isEdit && editing.saleCents != null ? (editing.saleCents / 100).toFixed(2) : '',
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(isEdit ? (editing.thumbnailUrl ?? '') : '');
  const [isActive, setIsActive] = useState(isEdit ? editing.isActive : true);
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus>(
    statusFromInventory(isEdit ? editing.inventory : null),
  );
  const [quantity, setQuantity] = useState(
    isEdit && editing.inventory?.quantity != null ? editing.inventory.quantity.toString() : '',
  );
  const [lowStockAmount, setLowStockAmount] = useState(
    isEdit && editing.inventory?.lowStockAmount != null
      ? editing.inventory.lowStockAmount.toString()
      : '',
  );
  const [soldIndividually, setSoldIndividually] = useState(
    isEdit ? (editing.inventory?.soldIndividually ?? false) : false,
  );
  const [options, setOptions] = useState<Option[]>(
    isEdit ? editing.options.map((o) => ({ attributeName: o.attributeName, value: o.value })) : [],
  );
  const [supplier, setSupplier] = useState(isEdit ? (editing.supplier ?? '') : '');
  const [cost, setCost] = useState(
    isEdit && editing.costCents != null ? (editing.costCents / 100).toFixed(2) : '',
  );
  const { data: attributes } = useQuery<Attribute[]>({
    queryKey: ['attributes'],
    queryFn: async () => (await api.get('/admin/attributes')).data,
  });

  const [newAttrOpen, setNewAttrOpen] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrValues, setNewAttrValues] = useState('');
  const [newValueDraft, setNewValueDraft] = useState<Record<number, string>>({});

  const createAttr = useMutation({
    mutationFn: () =>
      api.post('/admin/attributes', { name: newAttrName, values: newAttrValues }),
    onSuccess: () => {
      toast.success('Attribute created');
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      setNewAttrOpen(false);
      setNewAttrName('');
      setNewAttrValues('');
    },
    onError: () => toast.error('Could not create attribute (name may already exist)'),
  });

  // Adds/removes a value on an *existing* attribute (e.g. adding "2 LTR" to
  // "Size" once "0.7 LTR" already exists) — previously the only way to touch
  // an attribute's value list was to create a brand-new attribute, which
  // failed outright once the name (e.g. "Size") already existed.
  const editAttrValues = useMutation({
    mutationFn: ({ attrId, values }: { attrId: string; values: string[] }) =>
      api.patch(`/admin/attributes/${attrId}`, { values }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attributes'] }),
    onError: () => toast.error('Could not update attribute values'),
  });

  function addValue(i: number, attrName: string) {
    const attr = attributes?.find((a) => a.name === attrName);
    const value = (newValueDraft[i] ?? '').trim();
    if (!attr || !value || attr.values.includes(value)) return;
    editAttrValues.mutate(
      { attrId: attr.id, values: [...attr.values, value] },
      { onSuccess: () => setOption(i, { value }) },
    );
    setNewValueDraft((cur) => ({ ...cur, [i]: '' }));
  }

  function removeValue(attrName: string, value: string) {
    const attr = attributes?.find((a) => a.name === attrName);
    if (!attr) return;
    editAttrValues.mutate({ attrId: attr.id, values: attr.values.filter((v) => v !== value) });
  }

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'variants');
      const { data } = await api.post('/admin/upload', form);
      setThumbnailUrl(data.url);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        sku: sku || undefined,
        name: name || undefined,
        regularPrice: regularPrice ? parseFloat(regularPrice) : undefined,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        isActive,
        // Always sent (never `|| undefined`) so clearing a field back to
        // "use default" reaches the backend as '' -> null, not "untouched".
        supplier,
        cost: cost ? parseFloat(cost) : undefined,
        options: options.filter((o) => o.attributeName && o.value),
        inventory: {
          ...resolveInventoryPayload(inventoryStatus, quantity),
          lowStockAmount: lowStockAmount !== '' ? parseInt(lowStockAmount, 10) : undefined,
          soldIndividually,
        },
      };
      return isEdit
        ? api.patch(`/admin/variants/${editing.id}`, payload)
        : api.post(`/admin/products/${productId}/variants`, payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Variant saved' : 'Variant created');
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['variants', productId] });
      onClose();
    },
    onError: () => toast.error('Save failed'),
  });

  const setOption = (i: number, patch: Partial<Option>) =>
    setOptions((cur) => cur.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const valuesFor = (attrName: string) =>
    attributes?.find((a) => a.name === attrName)?.values ?? [];

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>{isEdit ? 'Edit variant' : 'New variant'}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        <Field label="SKU">
          <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. 9514270/DD" />
        </Field>
        <Field label="Variant name (optional)">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 15 White" />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Regular ($)">
            <Input type="number" step="0.01" value={regularPrice} onChange={(e) => setRegularPrice(e.target.value)} />
          </Field>
          <Field label="Sale ($)">
            <Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          </Field>
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <Label>Stock</Label>
          <InventoryStatusField
            status={inventoryStatus}
            onStatusChange={setInventoryStatus}
            quantity={quantity}
            onQuantityChange={setQuantity}
          />
          {inventoryStatus === 'in_stock' && (
            <Field label="Low-stock threshold">
              <Input type="number" value={lowStockAmount} onChange={(e) => setLowStockAmount(e.target.value)} />
            </Field>
          )}
          <div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Sold individually</Label>
              <Switch checked={soldIndividually} onCheckedChange={setSoldIndividually} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Limits a customer to one of this variant per order — for one-off or restricted-quantity
              items (e.g. controlled items).
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <Label>Purchasing</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Cost ($)">
              <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </Field>
            <Field label="Preferred supplier">
              <Input
                placeholder="e.g. Henry Schein"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <Field label="Thumbnail">
          <div className="flex items-center gap-3">
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrl} alt="" className="size-14 rounded border object-cover" />
            ) : (
              <div className="size-14 rounded border bg-muted" />
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
              <Upload className="size-4" /> {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </Field>

        {/* Attributes */}
        <div className="space-y-2">
          <Label>Attributes</Label>
          {options.map((o, i) => (
            <div key={i} className="space-y-1.5 rounded-md border p-2">
              <div className="flex items-center gap-2">
                <Select value={o.attributeName} onValueChange={(v) => setOption(i, { attributeName: v ?? '', value: '' })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Attribute" /></SelectTrigger>
                  <SelectContent>
                    {attributes
                      ?.filter(
                        (a) =>
                          a.name === o.attributeName ||
                          !options.some((opt, idx) => idx !== i && opt.attributeName === a.name),
                      )
                      .map((a) => (
                        <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={o.value} onValueChange={(v) => setOption(i, { value: v ?? '' })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Value" /></SelectTrigger>
                  <SelectContent>
                    {valuesFor(o.attributeName).map((val) => (
                      <SelectItem key={val} value={val}>{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button type="button" onClick={() => setOptions((cur) => cur.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive" aria-label="Remove this attribute from the variant">
                  <Trash2 className="size-4" />
                </button>
              </div>

              {o.attributeName && (
                <div className="space-y-1.5 pl-0.5">
                  {valuesFor(o.attributeName).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {valuesFor(o.attributeName).map((val) => (
                        <span
                          key={val}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                        >
                          {val}
                          <button
                            type="button"
                            onClick={() => removeValue(o.attributeName, val)}
                            aria-label={`Delete value "${val}" from ${o.attributeName}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={`New ${o.attributeName} value, e.g. 2 LTR`}
                      value={newValueDraft[i] ?? ''}
                      onChange={(e) => setNewValueDraft((cur) => ({ ...cur, [i]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addValue(i, o.attributeName);
                        }
                      }}
                      className="h-8 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!newValueDraft[i]?.trim() || editAttrValues.isPending}
                      onClick={() => addValue(i, o.attributeName)}
                    >
                      <Plus className="size-3.5" /> Add value
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!!attributes && options.length >= attributes.length}
              onClick={() => setOptions((cur) => [...cur, { attributeName: '', value: '' }])}
            >
              <Plus className="size-4" /> Add attribute
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setNewAttrOpen((v) => !v)}>
              {newAttrOpen ? <X className="size-4" /> : <Plus className="size-4" />} New attribute
            </Button>
          </div>

          {newAttrOpen && (
            <div className="space-y-2 rounded-md border p-2">
              <Input placeholder="Attribute name (e.g. Size)" value={newAttrName} onChange={(e) => setNewAttrName(e.target.value)} />
              <Input placeholder="Values, pipe-separated (e.g. 7 | 8 | 9)" value={newAttrValues} onChange={(e) => setNewAttrValues(e.target.value)} />
              <Button type="button" size="sm" disabled={createAttr.isPending || !newAttrName} onClick={() => createAttr.mutate()}>
                {createAttr.isPending ? 'Saving…' : 'Create attribute'}
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <Button className="w-full" disabled={save.isPending || !sku} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : isEdit ? 'Save variant' : 'Create variant'}
        </Button>
      </div>
    </>
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
